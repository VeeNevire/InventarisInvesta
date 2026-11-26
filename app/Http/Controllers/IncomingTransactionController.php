<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Enums\StockTransactionType;
use App\Http\Requests\StoreIncomingTransactionRequest;
use App\Models\Category;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\Supplier;
use App\Services\StockLedger;
use App\Support\ItemCodeGenerator;
use App\Support\TransactionFormOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class IncomingTransactionController extends Controller
{
    public function create(Request $request, TransactionFormOptions $options): Response
    {
        return Inertia::render('transactions/create', [
            'type' => StockTransactionType::Masuk->value,
            'today' => now()->toDateString(),
            'items' => $options->items(),
            'pics' => $options->pics(),
            'preselectedItem' => $request->string('barang')->value() ?: null,
            'suppliers' => Supplier::query()->orderBy('name')->pluck('name'),
            'employees' => [],
            'divisions' => [],
            'categories' => Category::query()
                ->where('type', CategoryType::Persediaan)
                ->whereNotNull('parent_id')
                ->with('parent:id,code,name')
                ->get(['id', 'code', 'name', 'parent_id'])
                ->map(fn (Category $category): array => [
                    'id' => $category->id,
                    'code' => $category->parent->code.'-'.$category->code,
                    'name' => $category->parent->name.' › '.$category->name,
                ])
                ->sortBy('name')
                ->values(),
            'units' => Item::query()->distinct()->orderBy('unit')->pluck('unit'),
        ]);
    }

    public function store(StoreIncomingTransactionRequest $request, StockLedger $ledger, ItemCodeGenerator $codes): RedirectResponse
    {
        $receipt = $request->file('receipt');

        // The temp upload can vanish before it is stored (e.g. antivirus); fail with a clear message.
        if ($receipt instanceof UploadedFile && ! $receipt->getRealPath()) {
            throw ValidationException::withMessages(['receipt' => 'Foto nota gagal terunggah. Pilih ulang fotonya lalu simpan lagi.']);
        }

        $receiptPath = $receipt?->store('receipts', 'local');
        $storedPhotos = [];

        try {
            $transaction = DB::transaction(function () use ($request, $ledger, $codes, $receiptPath, &$storedPhotos): StockTransaction {
                $lines = [];

                /** @var array<int, array{item_id?: int|string|null, new_item?: array{name: string, variant?: string|null, category_id: int|string, unit: string, location?: string|null, minimum_stock?: int|string|null}|null, quantity: int|string, unit_price: float|int|string}> $validatedLines */
                $validatedLines = $request->validated('lines');

                foreach ($validatedLines as $index => $line) {
                    $item = isset($line['item_id'])
                        ? Item::query()->findOrFail($line['item_id'])
                        : $this->createItem($line['new_item'] ?? [], $codes);

                    $photo = $request->file("lines.{$index}.photo");

                    if ($photo instanceof UploadedFile && $item->image_path === null) {
                        $storedPhotos[] = $path = $photo->store('items', 'public');
                        $item->update(['image_path' => $path]);
                    }

                    $lines[] = [
                        'item_id' => $item->id,
                        'quantity' => (int) $line['quantity'],
                        'unit_price' => (float) $line['unit_price'],
                    ];
                }

                return $ledger->record(
                    StockTransactionType::Masuk,
                    [
                        'transacted_on' => $request->validated('transacted_on'),
                        'purchased_on' => $request->validated('purchased_on'),
                        'supplier_id' => Supplier::findOrCreateByName($request->validated('supplier_name'))->id,
                        'pic_name' => Str::squish($request->validated('pic_name')),
                        'receipt_path' => $receiptPath,
                        'notes' => $request->validated('notes'),
                    ],
                    $lines,
                    $request->user(),
                );
            });
        } catch (Throwable $exception) {
            if ($receiptPath) {
                Storage::disk('local')->delete($receiptPath);
            }

            Storage::disk('public')->delete($storedPhotos);

            throw $exception;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Barang masuk {$transaction->number} tersimpan. Stok sudah diperbarui.",
        ]);

        return to_route('transactions.index');
    }

    /**
     * @param  array{name?: string, variant?: string|null, category_id?: int|string, unit?: string, location?: string|null, minimum_stock?: int|string|null}  $attributes
     */
    private function createItem(array $attributes, ItemCodeGenerator $codes): Item
    {
        $category = Category::query()->findOrFail($attributes['category_id'] ?? null);

        return Item::query()->create([
            'category_id' => $category->id,
            'code' => $codes->next($category),
            'name' => Str::squish($attributes['name'] ?? ''),
            'variant' => filled($attributes['variant'] ?? null) ? Str::squish($attributes['variant']) : null,
            'unit' => Str::lower(Str::squish($attributes['unit'] ?? '')),
            'location' => $attributes['location'] ?? null,
            'minimum_stock' => (int) ($attributes['minimum_stock'] ?? 0),
            'notify_low_stock' => true,
        ]);
    }
}
