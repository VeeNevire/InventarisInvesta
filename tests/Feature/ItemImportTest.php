<?php

use App\Enums\StockTransactionType;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use App\Services\ItemImporter;
use App\Support\Spreadsheet\Sheet;
use App\Support\Spreadsheet\XlsxReader;
use App\Support\Spreadsheet\XlsxWriter;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    $this->seed(DatabaseSeeder::class);
    $this->admin = User::query()->where('email', 'admin@inventarisinvesta.test')->firstOrFail();
    $this->secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail();
});

/**
 * Build an import file the way a user would: the template's columns with filled-in rows.
 *
 * @param  list<array<string, string|int|float|null>>  $rows
 */
function importFile(array $rows): UploadedFile
{
    $sheet = (new Sheet('Barang', 'Template Import Barang'))
        ->subtitle('Petunjuk')
        ->columns(array_values(ItemImporter::COLUMNS));

    foreach ($rows as $row) {
        $sheet->row(array_map(fn (string $key) => $row[$key] ?? null, array_keys(ItemImporter::COLUMNS)));
    }

    $path = (new XlsxWriter)->add($sheet)->save();

    return new UploadedFile($path, 'barang.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
}

function uploadToken($response): string
{
    $location = $response->headers->get('Location');

    return basename((string) parse_url((string) $location, PHP_URL_PATH));
}

test('secretaries without the add items permission cannot import', function () {
    $this->actingAs($this->secretary)->get(route('items.import.create'))->assertForbidden();
    $this->actingAs($this->secretary)->get(route('items.import.template'))->assertForbidden();
});

test('the template lists the columns and the consumable categories', function () {
    $response = $this->actingAs($this->admin)->get(route('items.import.template'))->assertOk();

    $sheetRows = app(XlsxReader::class)->firstSheet($response->getFile()->getPathname());
    $labels = array_merge(...$sheetRows);

    expect($labels)->toContain('Nama Barang*', 'Kategori*', 'Stok Awal', 'Harga Satuan');

    $zip = new ZipArchive;
    $zip->open($response->getFile()->getPathname());
    $categorySheet = (string) $zip->getFromName('xl/worksheets/sheet3.xml');
    $zip->close();

    expect($categorySheet)->toContain('>ATK<');
});

test('the preview marks valid, duplicate and invalid rows', function () {
    $existing = Item::query()->firstOrFail();

    $response = $this->actingAs($this->admin)->post(route('items.import.upload'), [
        'file' => importFile([
            ['name' => 'Stapler Besar', 'category' => 'ATK', 'unit' => 'pcs', 'opening_stock' => 5, 'unit_price' => 25000],
            ['name' => $existing->name, 'variant' => $existing->variant, 'category' => 'ATK', 'unit' => 'pcs'],
            ['name' => 'stapler besar', 'category' => 'atk', 'unit' => 'pcs'],
            ['name' => 'Penggaris', 'category' => 'TIDAKADA', 'unit' => 'pcs'],
            ['name' => 'Spidol', 'category' => 'ATK', 'unit' => 'pcs', 'opening_stock' => 3],
            ['category' => 'ATK', 'unit' => 'pcs', 'notify_low_stock' => 'mungkin'],
        ]),
    ]);

    $token = uploadToken($response->assertRedirect());

    $this->get(route('items.import.show', $token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('items/import')
            ->where('preview.counts', ['valid' => 1, 'duplicate' => 2, 'error' => 3])
            ->where('preview.has_opening_stock', true)
            ->where('preview.rows.0.status', 'valid')
            ->where('preview.rows.1.status', 'duplicate')
            ->where('preview.rows.2.messages.0', 'Sama dengan baris 6 di file ini.')
            ->where('preview.rows.3.status', 'error')
            ->where('preview.rows.4.messages.0', 'Harga satuan wajib diisi bila stok awal diisi (boleh 0).')
            ->where('preview.rows.5.messages', [
                'Notifikasi Stok Rendah diisi "Ya" atau "Tidak".',
                'Nama barang wajib diisi.',
            ]));

    expect(Item::query()->where('name', 'Stapler Besar')->exists())->toBeFalse();
});

test('confirming saves valid rows and records opening stock as one incoming transaction', function () {
    $itemsBefore = Item::query()->count();

    $response = $this->actingAs($this->admin)->post(route('items.import.upload'), [
        'file' => importFile([
            ['name' => 'Stapler Besar', 'category' => 'ATK', 'unit' => 'pcs', 'minimum_stock' => 2, 'notify_low_stock' => 'Tidak', 'opening_stock' => 5, 'unit_price' => 'Rp 25.000'],
            ['name' => 'Penggaris', 'variant' => '30 cm', 'category' => 'ATK', 'unit' => 'pcs'],
            ['code' => 'atk-004', 'name' => 'Lakban', 'category' => 'ATK', 'unit' => 'roll', 'opening_stock' => 10, 'unit_price' => 12000],
            ['name' => 'Salah', 'category' => 'TIDAKADA', 'unit' => 'pcs'],
        ]),
    ]);

    $token = uploadToken($response);

    $this->post(route('items.import.store', $token), ['transacted_on' => now()->subDay()->toDateString()])
        ->assertRedirect(route('items.index'))
        ->assertSessionHasNoErrors();

    expect(Item::query()->count())->toBe($itemsBefore + 3);

    $lakban = Item::query()->where('code', 'ATK-004')->firstOrFail();
    $stapler = Item::query()->where('name', 'Stapler Besar')->firstOrFail();
    $penggaris = Item::query()->where('name', 'Penggaris')->firstOrFail();

    expect($lakban->name)->toBe('Lakban')
        ->and($lakban->current_stock)->toBe(10)
        ->and($stapler->code)->toBe('ATK-005')
        ->and($penggaris->code)->toBe('ATK-006')
        ->and($stapler->current_stock)->toBe(5)
        ->and($stapler->average_price)->toBe('25000.00')
        ->and($stapler->minimum_stock)->toBe(2)
        ->and($stapler->notify_low_stock)->toBeFalse()
        ->and($penggaris->current_stock)->toBe(0);

    $transaction = StockTransaction::query()->latest('id')->firstOrFail();

    expect($transaction->type)->toBe(StockTransactionType::Masuk)
        ->and($transaction->notes)->toBe('Stok awal dari import Excel')
        ->and($transaction->transacted_on->toDateString())->toBe(now()->subDay()->toDateString())
        ->and($transaction->lines()->count())->toBe(2);

    Storage::disk('local')->assertMissing("imports/{$token}.xlsx");
});

test('a file that is not an excel workbook is rejected', function () {
    $this->actingAs($this->admin)
        ->post(route('items.import.upload'), ['file' => UploadedFile::fake()->create('barang.csv', 1, 'text/csv')])
        ->assertSessionHasErrors('file');

    $this->actingAs($this->admin)
        ->post(route('items.import.upload'), ['file' => UploadedFile::fake()->create('barang.xlsx', 1)])
        ->assertSessionHasErrors(['file' => 'File tidak bisa dibaca. Pastikan file berformat Excel (.xlsx).']);
});

test('an unknown upload token sends the user back to the upload step', function () {
    $this->actingAs($this->admin)
        ->get(route('items.import.show', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'))
        ->assertRedirect(route('items.import.create'));
});
