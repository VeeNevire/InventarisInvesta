<?php

namespace App\Services;

use App\Enums\CategoryType;
use App\Enums\StockTransactionType;
use App\Http\Requests\SaveItemRequest;
use App\Models\Category;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use App\Support\ItemCodeGenerator;
use App\Support\Spreadsheet\Sheet;
use App\Support\Spreadsheet\XlsxReader;
use App\Support\Spreadsheet\XlsxWriter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Builds the Excel import template for consumable items, reads a filled-in
 * template into checked rows, and saves the valid rows (plus one incoming
 * transaction for any opening stock).
 *
 * @phpstan-type ImportValues array{name: string|null, variant: string|null, category: string|null, unit: string|null, location: string|null, minimum_stock: string|null, notify_low_stock: string|null, description: string|null, opening_stock: string|null, unit_price: string|null}
 * @phpstan-type ImportAttributes array{category_id: int, name: string, variant: string|null, unit: string, location: string|null, minimum_stock: int, notify_low_stock: bool, description: string|null, opening_stock: int, unit_price: float|null}
 * @phpstan-type ImportRow array{row: int, status: 'valid'|'duplicate'|'error', messages: list<string>, values: ImportValues, attributes: ImportAttributes|null}
 */
class ItemImporter
{
    public const MAX_ROWS = 1000;

    /**
     * Template columns: key => [header label, width, cell type].
     *
     * @var array<string, array{0: string, 1: int, 2: string}>
     */
    public const COLUMNS = [
        'name' => ['Nama Barang*', 30, 'text'],
        'variant' => ['Varian', 18, 'text'],
        'category' => ['Jenis Barang*', 16, 'text'],
        'unit' => ['Satuan*', 10, 'text'],
        'location' => ['Lokasi Rak', 14, 'text'],
        'minimum_stock' => ['Stok Minimum', 13, 'int'],
        'notify_low_stock' => ['Notifikasi Stok Rendah', 14, 'text'],
        'description' => ['Keterangan', 30, 'text'],
        'opening_stock' => ['Stok Awal', 11, 'int'],
        'unit_price' => ['Harga Satuan', 15, 'rupiah'],
    ];

    private const REQUIRED_COLUMNS = ['name', 'category', 'unit'];

    public function __construct(
        private readonly XlsxReader $reader,
        private readonly StockLedger $ledger,
        private readonly ItemCodeGenerator $codes,
    ) {}

    /**
     * Write the template workbook to a temporary file and return its path.
     */
    public function template(): string
    {
        $items = (new Sheet('Barang', 'Template Import Perlengkapan Kantor'))
            ->subtitle('Isi mulai baris di bawah judul kolom. Kolom bertanda * wajib diisi. Petunjuk lengkap ada di sheet "Petunjuk".')
            ->columns(array_values(self::COLUMNS))
            ->emptyMessage(null)
            ->landscape();

        $guide = (new Sheet('Petunjuk', 'Petunjuk Pengisian'))
            ->subtitle('Satu baris = satu jenis perlengkapan. Baris kosong dilewati. Maksimal '.self::MAX_ROWS.' baris per file.')
            ->columns([['Kolom', 22], ['Wajib', 9], ['Cara mengisi', 62], ['Contoh', 18]])
            ->emptyMessage(null);

        foreach ($this->columnGuide() as $row) {
            $guide->row($row);
        }

        $guide->note('Barang yang nama dan variannya sudah ada di sistem akan dilewati, tidak ditimpa.')
            ->note('Kode dibuat otomatis, mis. INVESTA-PLK-'.now()->year.'-ATK-HVS-001.')
            ->note('Sebelum disimpan, sistem menampilkan pratinjau supaya Anda bisa memeriksa baris yang bermasalah.');

        $categories = (new Sheet('Daftar Kategori', 'Daftar Jenis Perlengkapan Kantor'))
            ->subtitle('Tulis kode jenis (kolom pertama) di kolom Jenis Barang pada sheet "Barang".')
            ->columns([['Kode Jenis', 12], ['Jenis Barang', 32], ['Kode Kategori', 14], ['Kategori', 32]])
            ->emptyMessage('Belum ada jenis perlengkapan. Tambahkan dulu di Master Data → Kategori.');

        foreach ($this->categories() as $category) {
            $categories->row([$category->code, $category->name, $category->parent?->code, $category->parent?->name]);
        }

        return (new XlsxWriter(config('app.name')))
            ->add($items)
            ->add($guide)
            ->add($categories)
            ->save();
    }

    /**
     * Read a filled-in template and check every row.
     *
     * @return list<ImportRow>
     *
     * @throws RuntimeException When the file cannot be read or does not follow the template.
     */
    public function parse(string $path): array
    {
        $sheetRows = $this->reader->firstSheet($path);
        [$headerIndex, $columnMap] = $this->locateHeader($sheetRows);

        $categories = $this->categories();
        $categoriesByCode = $categories->keyBy(fn (Category $category): string => Str::upper($category->code));
        $categoriesByName = $categories->keyBy(fn (Category $category): string => Str::lower($category->name));

        $existingItems = Item::query()->get(['code', 'name', 'variant']);
        $existingByKey = $existingItems->keyBy(fn (Item $item): string => $this->duplicateKey($item->name, $item->variant));

        /** @var array<string, int> $seenKeys */
        $seenKeys = [];
        $rows = [];

        foreach (array_slice($sheetRows, $headerIndex + 1, preserve_keys: true) as $index => $cells) {
            $values = $this->rowValues($cells, $columnMap);

            if (array_filter($values, fn (?string $value): bool => $value !== null) === []) {
                continue;
            }

            if (count($rows) >= self::MAX_ROWS) {
                throw new RuntimeException('File berisi lebih dari '.self::MAX_ROWS.' barang. Bagi menjadi beberapa file.');
            }

            $rowNumber = $index + 1;
            [$attributes, $messages] = $this->check($values, $categoriesByCode, $categoriesByName);
            $status = $messages === [] ? 'valid' : 'error';

            if ($attributes !== null) {
                $key = $this->duplicateKey($attributes['name'], $attributes['variant']);

                if ($existing = $existingByKey->get($key)) {
                    $status = 'duplicate';
                    $messages[] = "Sudah ada di sistem ({$existing->code}).";
                } elseif (isset($seenKeys[$key])) {
                    $status = 'duplicate';
                    $messages[] = "Sama dengan baris {$seenKeys[$key]} di file ini.";
                } else {
                    $seenKeys[$key] = $rowNumber;
                }
            }

            $rows[] = [
                'row' => $rowNumber,
                'status' => $status,
                'messages' => $messages,
                'values' => $values,
                'attributes' => $status === 'valid' ? $attributes : null,
            ];
        }

        return $rows;
    }

    /**
     * Save the valid rows. Opening stock is recorded as one incoming
     * transaction so every item's stock card starts from a real entry.
     *
     * @param  list<ImportRow>  $rows
     * @return array{items: int, transaction: StockTransaction|null}
     */
    public function import(array $rows, CarbonImmutable $openingDate, ?User $recorder): array
    {
        $validRows = array_values(array_filter(
            array_map(fn (array $row): ?array => $row['status'] === 'valid' ? $row['attributes'] : null, $rows),
        ));

        if ($validRows === []) {
            return ['items' => 0, 'transaction' => null];
        }

        return DB::transaction(function () use ($validRows, $openingDate, $recorder): array {
            $categories = Category::query()->with('parent')->whereIn('id', array_column($validRows, 'category_id'))->get()->keyBy('id');

            $itemIds = [];

            foreach ($validRows as $position => $attributes) {
                $itemIds[$position] = Item::query()->create([
                    'category_id' => $attributes['category_id'],
                    'code' => $this->codes->next($categories[$attributes['category_id']]),
                    'name' => $attributes['name'],
                    'variant' => $attributes['variant'],
                    'unit' => $attributes['unit'],
                    'location' => $attributes['location'],
                    'minimum_stock' => $attributes['minimum_stock'],
                    'notify_low_stock' => $attributes['notify_low_stock'],
                    'description' => $attributes['description'],
                ])->id;
            }

            $lines = [];

            foreach ($validRows as $position => $attributes) {
                if ($attributes['opening_stock'] > 0) {
                    $lines[] = [
                        'item_id' => $itemIds[$position],
                        'quantity' => $attributes['opening_stock'],
                        'unit_price' => $attributes['unit_price'] ?? 0,
                    ];
                }
            }

            $transaction = $lines === [] ? null : $this->ledger->record(
                StockTransactionType::Masuk,
                [
                    'transacted_on' => $openingDate->toDateString(),
                    'notes' => 'Stok awal dari import Excel',
                ],
                $lines,
                $recorder,
            );

            return ['items' => count($validRows), 'transaction' => $transaction];
        });
    }

    /**
     * Find the header row and map each template column to its sheet column.
     *
     * @param  list<list<string|null>>  $sheetRows
     * @return array{0: int, 1: array<string, int|null>}
     */
    private function locateHeader(array $sheetRows): array
    {
        $wanted = array_map(fn (array $column): string => $this->normalizeLabel($column[0]), self::COLUMNS);

        foreach (array_slice($sheetRows, 0, 20, true) as $index => $cells) {
            $labels = array_map(fn (?string $cell): string => $this->normalizeLabel((string) $cell), $cells);

            if (! in_array($wanted['name'], $labels, true)) {
                continue;
            }

            $columnMap = array_map(function (string $label) use ($labels): ?int {
                $position = array_search($label, $labels, true);

                return $position === false ? null : $position;
            }, $wanted);

            $missing = array_filter(self::REQUIRED_COLUMNS, fn (string $key): bool => $columnMap[$key] === null);

            if ($missing !== []) {
                $names = implode(', ', array_map(fn (string $key): string => rtrim(self::COLUMNS[$key][0], '*'), $missing));

                throw new RuntimeException("Kolom {$names} tidak ditemukan. Gunakan template dari halaman ini.");
            }

            return [$index, $columnMap];
        }

        throw new RuntimeException('Judul kolom "Nama Barang" tidak ditemukan. Gunakan template dari halaman ini tanpa mengubah judul kolomnya.');
    }

    /**
     * Pick the template columns out of one sheet row.
     *
     * @param  list<string|null>  $cells
     * @param  array<string, int|null>  $columnMap
     * @return ImportValues
     */
    private function rowValues(array $cells, array $columnMap): array
    {
        $value = fn (string $key): ?string => $columnMap[$key] === null ? null : ($cells[$columnMap[$key]] ?? null);

        return [
            'name' => $value('name'),
            'variant' => $value('variant'),
            'category' => $value('category'),
            'unit' => $value('unit'),
            'location' => $value('location'),
            'minimum_stock' => $value('minimum_stock'),
            'notify_low_stock' => $value('notify_low_stock'),
            'description' => $value('description'),
            'opening_stock' => $value('opening_stock'),
            'unit_price' => $value('unit_price'),
        ];
    }

    /**
     * Normalize and validate one row.
     *
     * @param  ImportValues  $values
     * @param  Collection<string, Category>  $categoriesByCode
     * @param  Collection<string, Category>  $categoriesByName
     * @return array{0: ImportAttributes|null, 1: list<string>}
     */
    private function check(array $values, Collection $categoriesByCode, Collection $categoriesByName): array
    {
        $messages = [];
        $categoryText = $values['category'];
        $category = $categoryText === null ? null
            : ($categoriesByCode->get(Str::upper($categoryText)) ?? $categoriesByName->get(Str::lower($categoryText)));

        if ($categoryText === null) {
            $messages[] = 'Jenis barang wajib diisi.';
        } elseif ($category === null) {
            $messages[] = "Jenis barang \"{$categoryText}\" tidak ditemukan. Lihat sheet \"Daftar Kategori\".";
        }

        $notify = $this->yesNo($values['notify_low_stock']);

        if ($notify === null) {
            $messages[] = 'Notifikasi Stok Rendah diisi "Ya" atau "Tidak".';
        }

        $data = [
            'name' => $values['name'] === null ? null : Str::squish($values['name']),
            'variant' => $values['variant'] === null ? null : Str::squish($values['variant']),
            'unit' => $values['unit'] === null ? null : Str::squish($values['unit']),
            'location' => $values['location'],
            'minimum_stock' => $this->wholeNumber($values['minimum_stock']) ?? 0,
            'notify_low_stock' => $notify ?? true,
            'description' => $values['description'],
            'opening_stock' => $this->wholeNumber($values['opening_stock']) ?? 0,
            'unit_price' => $this->price($values['unit_price']),
        ];

        $validator = Validator::make($data, [
            ...SaveItemRequest::attributeRules(),
            'opening_stock' => ['integer', 'min:0', 'max:1000000'],
            'unit_price' => ['nullable', 'required_unless:opening_stock,0', 'numeric', 'min:0', 'max:999999999999'],
        ], [
            ...SaveItemRequest::attributeMessages(),
            'minimum_stock.integer' => 'Stok minimum harus bilangan bulat.',
            'minimum_stock.min' => 'Stok minimum tidak boleh negatif.',
            'opening_stock.integer' => 'Stok awal harus bilangan bulat.',
            'opening_stock.min' => 'Stok awal tidak boleh negatif.',
            'unit_price.required_unless' => 'Harga satuan wajib diisi bila stok awal diisi (boleh 0).',
            'unit_price.numeric' => 'Harga satuan harus berupa angka.',
            'unit_price.min' => 'Harga satuan tidak boleh negatif.',
        ], [
            'name' => 'nama barang',
            'variant' => 'varian',
            'unit' => 'satuan',
            'location' => 'lokasi rak',
            'minimum_stock' => 'stok minimum',
            'description' => 'keterangan',
            'opening_stock' => 'stok awal',
            'unit_price' => 'harga satuan',
        ]);

        $messages = [...$messages, ...$validator->errors()->all()];

        if ($messages !== [] || $category === null) {
            return [null, array_values(array_unique($messages))];
        }

        return [[
            'category_id' => $category->id,
            'name' => (string) $data['name'],
            'variant' => $data['variant'],
            'unit' => (string) $data['unit'],
            'location' => $data['location'],
            'minimum_stock' => (int) $data['minimum_stock'],
            'notify_low_stock' => $data['notify_low_stock'],
            'description' => $data['description'],
            'opening_stock' => (int) $data['opening_stock'],
            'unit_price' => $data['unit_price'] === null ? null : (float) $data['unit_price'],
        ], []];
    }

    /**
     * @return Collection<int, Category>
     */
    private function categories(): Collection
    {
        return Category::query()
            ->where('type', CategoryType::Persediaan)
            ->whereNotNull('parent_id')
            ->with('parent:id,code,name')
            ->orderBy('code')
            ->get();
    }

    /**
     * @return list<list<string>>
     */
    private function columnGuide(): array
    {
        return [
            ['Nama Barang', 'Ya', 'Nama barang.', 'Kertas HVS'],
            ['Varian', 'Tidak', 'Ukuran, warna, atau tipe. Nama + varian yang sama dianggap barang yang sama.', 'A4 80 gram'],
            ['Jenis Barang', 'Ya', 'Kode jenis dari sheet "Daftar Kategori" (nama jenis juga diterima). Kode barang dibuat otomatis dari kategori dan jenis ini.', 'HVS'],
            ['Satuan', 'Ya', 'Satuan hitung, maksimal 20 huruf.', 'rim'],
            ['Lokasi Rak', 'Tidak', 'Tempat penyimpanan di gudang.', 'Rak A-2'],
            ['Stok Minimum', 'Tidak', 'Batas stok rendah. Kosong = 0.', '5'],
            ['Notifikasi Stok Rendah', 'Tidak', 'Ya atau Tidak. Kosong = Ya.', 'Ya'],
            ['Keterangan', 'Tidak', 'Catatan tambahan.', ''],
            ['Stok Awal', 'Tidak', 'Jumlah stok yang sudah ada sekarang. Akan dicatat sebagai satu transaksi Barang Masuk "Stok awal". Kosong = 0.', '20'],
            ['Harga Satuan', 'Bila ada stok awal', 'Harga per satuan dalam rupiah, tanpa titik/Rp (boleh 0). Dipakai untuk nilai perlengkapan.', '45000'],
        ];
    }

    private function normalizeLabel(string $label): string
    {
        return (string) preg_replace('/[^a-z0-9]/', '', Str::lower($label));
    }

    private function duplicateKey(?string $name, ?string $variant): string
    {
        return Str::lower(trim((string) $name)).'|'.Str::lower(trim((string) $variant));
    }

    private function yesNo(?string $value): ?bool
    {
        return match (Str::lower((string) $value)) {
            '', 'ya', 'y', 'yes', '1', 'true', 'aktif' => true,
            'tidak', 't', 'no', 'n', '0', 'false', 'nonaktif' => false,
            default => null,
        };
    }

    /**
     * Turn "12" or "12.0" into 12; anything else is passed on for the validator to reject.
     */
    private function wholeNumber(?string $value): int|string|null
    {
        if ($value === null) {
            return null;
        }

        return is_numeric($value) && (float) $value === floor((float) $value) ? (int) $value : $value;
    }

    /**
     * Accept 45000, "45000.5", "Rp 45.000" and "45.000,50".
     */
    private function price(?string $value): float|string|null
    {
        if ($value === null) {
            return null;
        }

        $clean = (string) preg_replace('/^rp\.?\s*/i', '', str_replace(' ', '', $value));

        if (preg_match('/^\d{1,3}(\.\d{3})+(,\d+)?$/', $clean) === 1) {
            $clean = str_replace(['.', ','], ['', '.'], $clean);
        } elseif (preg_match('/^\d+,\d+$/', $clean) === 1) {
            $clean = str_replace(',', '.', $clean);
        }

        return is_numeric($clean) ? (float) $clean : $value;
    }
}
