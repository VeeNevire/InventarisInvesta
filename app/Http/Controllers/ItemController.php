<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Enums\StockStatus;
use App\Enums\StockTransactionType;
use App\Http\Requests\SaveItemRequest;
use App\Http\Resources\ItemResource;
use App\Http\Resources\StockCardEntryResource;
use App\Models\Category;
use App\Models\Item;
use App\Models\StockTransactionLine;
use App\Support\ItemCodeGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    /**
     * List consumable items with search, category and stock status filters.
     */
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->trim()->value(),
            'category' => $request->string('category')->value(),
            'status' => $request->string('status')->value(),
        ];

        $items = Item::query()
            ->with('category.parent')
            ->when($filters['search'], fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('variant', 'like', "%{$search}%"),
            ))
            ->when($filters['category'], fn (Builder $query, string $code) => $query->whereHas('category', fn (Builder $category) => $category->where('code', $code)->orWhereHas('parent', fn (Builder $parent) => $parent->where('code', $code))))
            ->orderBy('code')
            ->get()
            ->when($filters['status'], fn ($items, string $status) => $items->filter(
                fn (Item $item): bool => $item->stockStatus()->value === $status,
            )->values());

        $allItems = Item::query()->get(['current_stock', 'minimum_stock', 'average_price']);

        return Inertia::render('items/index', [
            'items' => ItemResource::collection($items)->resolve(),
            'filters' => $filters,
            'categories' => Category::query()
                ->where('type', CategoryType::Persediaan)
                ->withCount('items')->with(['children' => fn ($query) => $query->withCount('items')])
                ->orderBy('name')
                ->with('parent:id,name')->get(['id', 'code', 'name', 'parent_id'])
                ->map(fn (Category $category): array => [
                    'id' => $category->id,
                    'parent_id' => $category->parent_id,
                    'code' => $category->code,
                    'name' => $category->name,
                    'items_count' => $category->items_count + $category->children->sum('items_count'),
                ]),
            'statusCounts' => collect(StockStatus::cases())->mapWithKeys(fn (StockStatus $status): array => [
                $status->value => $allItems->filter(fn (Item $item): bool => $item->stockStatus() === $status)->count(),
            ]),
            'summary' => [
                'item_count' => $allItems->count(),
                'total_value' => $allItems->sum(fn (Item $item): float => $item->stockValue()),
            ],
        ]);
    }

    /**
     * Item detail with its full stock card.
     */
    public function show(Item $item): Response
    {
        $item->load('category.parent');

        $entries = $item->transactionLines()
            ->select('stock_transaction_lines.*')
            ->join('stock_transactions', 'stock_transactions.id', '=', 'stock_transaction_lines.stock_transaction_id')
            ->with(['transaction.employee.division', 'transaction.supplier'])
            ->orderBy('stock_transactions.transacted_on')
            ->orderBy('stock_transactions.id')
            ->get();

        $thisMonth = CarbonImmutable::today();
        $activeThisMonth = $entries->filter(fn (StockTransactionLine $line): bool => ! $line->transaction->isCancelled()
            && $line->transaction->transacted_on->isSameMonth($thisMonth));

        return Inertia::render('items/show', [
            'item' => (new ItemResource($item))->resolve(),
            'stockCard' => StockCardEntryResource::collection($entries)->resolve(),
            'monthSummary' => [
                'incoming' => $activeThisMonth->filter(fn (StockTransactionLine $line): bool => $line->transaction->type === StockTransactionType::Masuk)->sum('quantity'),
                'outgoing' => abs($activeThisMonth->filter(fn (StockTransactionLine $line): bool => $line->transaction->type === StockTransactionType::Keluar)->sum('quantity')),
                'outgoing_transactions' => $activeThisMonth->filter(fn (StockTransactionLine $line): bool => $line->transaction->type === StockTransactionType::Keluar)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('items/form', [
            'item' => null,
            ...$this->formOptions(),
        ]);
    }

    public function store(SaveItemRequest $request, ItemCodeGenerator $codes): RedirectResponse
    {
        $category = Category::query()->findOrFail($request->integer('category_id'));

        $item = Item::query()->create([
            ...$request->safe()->except(['photo', 'remove_photo']),
            'code' => $request->validated('code') ?? $codes->next($category),
            'notify_low_stock' => $request->boolean('notify_low_stock'),
            'image_path' => $request->file('photo')?->store('items', 'public'),
        ]);

        $this->toast("Barang {$item->name} ({$item->code}) ditambahkan dengan stok 0. Catat barang masuk untuk mengisi stoknya.");

        return to_route('items.show', $item);
    }

    public function edit(Item $item): Response
    {
        return Inertia::render('items/form', [
            'item' => [
                ...(new ItemResource($item->load('category.parent')))->resolve(),
                'category_id' => $item->category_id,
                'has_transactions' => $item->transactionLines()->exists(),
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(SaveItemRequest $request, Item $item): RedirectResponse
    {
        $attributes = [
            ...$request->safe()->except(['photo', 'remove_photo']),
            'notify_low_stock' => $request->boolean('notify_low_stock'),
        ];

        $oldPhoto = $item->image_path;

        if ($request->hasFile('photo')) {
            $attributes['image_path'] = $request->file('photo')->store('items', 'public');
        } elseif ($request->boolean('remove_photo')) {
            $attributes['image_path'] = null;
        }

        $item->update($attributes);

        if ($oldPhoto && $oldPhoto !== $item->image_path) {
            Storage::disk('public')->delete($oldPhoto);
        }

        $this->toast("Barang {$item->name} diperbarui.");

        return to_route('items.show', $item);
    }

    public function destroy(Item $item): RedirectResponse
    {
        if ($item->transactionLines()->exists()) {
            $this->toast("{$item->name} sudah punya riwayat transaksi, jadi tidak bisa dihapus.", 'error');

            return back();
        }

        if ($item->image_path) {
            Storage::disk('public')->delete($item->image_path);
        }

        $item->delete();
        $this->toast("Barang {$item->name} dihapus.");

        return to_route('items.index');
    }

    /**
     * @return array{categories: Collection<int, Category>, units: Collection<int, string>}
     */
    private function formOptions(): array
    {
        return [
            'categories' => Category::query()
                ->where('type', CategoryType::Persediaan)
                ->orderBy('name')
                ->with('parent:id,name')->get(['id', 'code', 'name', 'parent_id'])
                ->map(fn (Category $category): array => [
                    'id' => $category->id, 'code' => $category->code, 'name' => $category->name,
                    'parent_id' => $category->parent_id, 'next_code' => app(ItemCodeGenerator::class)->next($category),
                ]),
            'units' => Item::query()->distinct()->orderBy('unit')->pluck('unit'),
        ];
    }
}
