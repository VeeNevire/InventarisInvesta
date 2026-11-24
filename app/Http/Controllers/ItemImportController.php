<?php

namespace App\Http\Controllers;

use App\Services\ItemImporter;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * @phpstan-import-type ImportRow from ItemImporter
 */
class ItemImportController extends Controller
{
    private const DIRECTORY = 'imports';

    /**
     * Upload step: template download and the file picker.
     */
    public function create(): Response
    {
        return Inertia::render('items/import', [
            'preview' => null,
            'maxRows' => ItemImporter::MAX_ROWS,
        ]);
    }

    public function template(ItemImporter $importer): BinaryFileResponse
    {
        return response()
            ->download($importer->template(), 'template-import-barang.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    /**
     * Keep the uploaded file for the preview and confirm steps.
     */
    public function upload(Request $request, ItemImporter $importer): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'extensions:xlsx', 'max:5120'],
        ], [
            'file.required' => 'Pilih file Excel yang akan diimpor.',
            'file.extensions' => 'File harus berformat Excel (.xlsx). Simpan ulang dari Excel dengan "Save As" → Excel Workbook.',
            'file.max' => 'Ukuran file maksimal 5 MB.',
        ]);

        $this->deleteStaleUploads();

        $token = (string) Str::uuid();
        $path = $request->file('file')->storeAs(self::DIRECTORY, "{$token}.xlsx", 'local');

        if ($path === false) {
            throw ValidationException::withMessages(['file' => 'File gagal disimpan. Coba unggah ulang.']);
        }

        try {
            $importer->parse(Storage::disk('local')->path($path));
        } catch (RuntimeException $exception) {
            Storage::disk('local')->delete($path);

            throw ValidationException::withMessages(['file' => $exception->getMessage()]);
        }

        return to_route('items.import.show', $token);
    }

    /**
     * Preview step: every row with its status before anything is saved.
     */
    public function show(string $token, ItemImporter $importer): Response|RedirectResponse
    {
        $rows = $this->parse($token, $importer);

        if ($rows === null) {
            return $this->expired();
        }

        return Inertia::render('items/import', [
            'preview' => [
                'token' => $token,
                'rows' => array_map(fn (array $row): array => [
                    'row' => $row['row'],
                    'status' => $row['status'],
                    'messages' => $row['messages'],
                    'values' => $row['values'],
                ], $rows),
                'counts' => [
                    'valid' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'valid')),
                    'duplicate' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'duplicate')),
                    'error' => count(array_filter($rows, fn (array $row): bool => $row['status'] === 'error')),
                ],
                'has_opening_stock' => array_filter(
                    $rows,
                    fn (array $row): bool => $row['status'] === 'valid' && ($row['attributes']['opening_stock'] ?? 0) > 0,
                ) !== [],
            ],
            'maxRows' => ItemImporter::MAX_ROWS,
            'today' => CarbonImmutable::today()->toDateString(),
        ]);
    }

    /**
     * Confirm step: the file is checked again on the server and only valid rows are saved.
     */
    public function store(Request $request, string $token, ItemImporter $importer): RedirectResponse
    {
        $rows = $this->parse($token, $importer);

        if ($rows === null) {
            return $this->expired();
        }

        $validated = $request->validate([
            'transacted_on' => ['nullable', 'date', 'before_or_equal:today'],
        ], [
            'transacted_on.before_or_equal' => 'Tanggal stok awal tidak boleh melewati hari ini.',
        ]);

        $result = $importer->import(
            $rows,
            CarbonImmutable::parse($validated['transacted_on'] ?? 'today'),
            $request->user(),
        );

        Storage::disk('local')->delete($this->path($token));

        if ($result['items'] === 0) {
            $this->toast('Tidak ada barang yang bisa diimpor dari file ini.', 'error');

            return to_route('items.import.create');
        }

        $skipped = count($rows) - $result['items'];
        $message = "{$result['items']} barang berhasil diimpor";
        $message .= $skipped > 0 ? ", {$skipped} baris dilewati." : '.';

        if ($result['transaction']) {
            $message .= " Stok awal dicatat di {$result['transaction']->number}.";
        }

        $this->toast($message);

        return to_route('items.index');
    }

    /**
     * @return list<ImportRow>|null Null when the upload no longer exists or cannot be read.
     */
    private function parse(string $token, ItemImporter $importer): ?array
    {
        $path = $this->path($token);

        if (! Storage::disk('local')->exists($path)) {
            return null;
        }

        try {
            return $importer->parse(Storage::disk('local')->path($path));
        } catch (RuntimeException) {
            return null;
        }
    }

    private function path(string $token): string
    {
        return self::DIRECTORY."/{$token}.xlsx";
    }

    private function expired(): RedirectResponse
    {
        $this->toast('File import sudah tidak tersedia. Silakan unggah ulang.', 'error');

        return to_route('items.import.create');
    }

    /**
     * Remove uploads that were previewed but never confirmed.
     */
    private function deleteStaleUploads(): void
    {
        $disk = Storage::disk('local');
        $cutoff = now()->subDay()->getTimestamp();

        foreach ($disk->files(self::DIRECTORY) as $file) {
            if ($disk->lastModified($file) < $cutoff) {
                $disk->delete($file);
            }
        }
    }
}
