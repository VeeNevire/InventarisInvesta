<?php

namespace App\Http\Controllers;

use App\Enums\CategoryType;
use App\Enums\StockOpnameStatus;
use App\Http\Requests\SaveStockOpnameCountsRequest;
use App\Http\Requests\StartStockOpnameRequest;
use App\Models\Category;
use App\Models\StockOpname;
use App\Models\StockOpnameLine;
use App\Services\StockOpnameService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StockOpnameController extends Controller
{
    /**
     * Reasons offered as suggestions on the count sheet.
     */
    private const REASONS = ['Rusak', 'Hilang', 'Salah catat', 'Lupa dicatat keluar', 'Lupa dicatat masuk', 'Bonus supplier', 'Kedaluwarsa'];

    public function __construct(private StockOpnameService $opnames) {}

    public function index(): Response
    {
        $opnames = StockOpname::query()
            ->with(['category', 'creator', 'adjustment', 'lines.item'])
            ->latest('counted_on')
            ->latest('id')
            ->get()
            ->map(function (StockOpname $opname): array {
                $summary = $this->summarize($opname, $opname->lines);

                return [
                    'number' => $opname->number,
                    'counted_on' => $opname->counted_on->toDateString(),
                    'scope' => $opname->category->name ?? 'Semua barang',
                    'status' => ['value' => $opname->status->value, 'label' => $opname->status->label()],
                    'created_by' => $opname->creator?->name,
                    'adjustment_number' => $opname->adjustment?->number,
                    ...$summary,
                ];
            });

        return Inertia::render('opnames/index', [
            'opnames' => $opnames,
            'categories' => $this->categories(),
            'today' => now()->toDateString(),
        ]);
    }

    public function store(StartStockOpnameRequest $request): RedirectResponse
    {
        $opname = $this->opnames->start(
            $request->filled('category_id') ? Category::query()->find($request->integer('category_id')) : null,
            $request->validated('counted_on'),
            $request->validated('notes'),
            $request->user(),
        );

        $this->toast("Lembar hitung {$opname->number} dibuat. Isi jumlah fisik tiap barang.");

        return to_route('stock-opnames.show', $opname);
    }

    public function show(StockOpname $opname): Response
    {
        $opname->load(['category', 'creator', 'completer', 'adjustment', 'lines.item.category']);

        return Inertia::render('opnames/show', [
            'opname' => [
                'number' => $opname->number,
                'counted_on' => $opname->counted_on->toDateString(),
                'scope' => $opname->category->name ?? 'Semua barang',
                'status' => ['value' => $opname->status->value, 'label' => $opname->status->label()],
                'notes' => $opname->notes,
                'created_by' => $opname->creator?->name,
                'completed_by' => $opname->completer?->name,
                'completed_at' => $opname->completed_at?->toIso8601String(),
                'adjustment_number' => $opname->adjustment?->number,
                ...$this->summarize($opname, $opname->lines),
            ],
            'lines' => $opname->lines->map(fn (StockOpnameLine $line): array => [
                'id' => $line->id,
                'item_code' => $line->item->code,
                'item_name' => $line->item->name,
                'variant' => $line->item->variant,
                'unit' => $line->item->unit,
                'location' => $line->item->location,
                'category' => $line->item->category->name,
                'image_url' => $line->item->image_path ? Storage::disk('public')->url($line->item->image_path) : null,
                'system_stock' => $this->systemStock($opname, $line),
                'unit_price' => $this->unitPrice($opname, $line),
                'counted_stock' => $line->counted_stock,
                'reason' => $line->reason,
            ])->values(),
            'reasons' => self::REASONS,
        ]);
    }

    public function update(SaveStockOpnameCountsRequest $request, StockOpname $opname): RedirectResponse
    {
        $this->opnames->saveCounts($opname, $request->validated('lines'));

        $this->toast('Hasil hitung tersimpan sebagai draf.');

        return back();
    }

    public function complete(SaveStockOpnameCountsRequest $request, StockOpname $opname): RedirectResponse
    {
        $this->opnames->saveCounts($opname, $request->validated('lines'));
        $this->opnames->complete($opname, $request->user());

        $opname->refresh()->load('adjustment');

        $this->toast($opname->adjustment
            ? "Cek stok {$opname->number} selesai. Selisih dicatat sebagai {$opname->adjustment->number}."
            : "Cek stok {$opname->number} selesai. Semua stok sudah cocok.");

        return to_route('stock-opnames.show', $opname);
    }

    public function destroy(StockOpname $opname): RedirectResponse
    {
        if (! $opname->isDraft()) {
            $this->toast('Cek stok yang sudah selesai tidak bisa dihapus.', 'error');

            return back();
        }

        $opname->delete();
        $this->toast("Draf {$opname->number} dihapus.");

        return to_route('stock-opnames.index');
    }

    /**
     * @param  Collection<int, StockOpnameLine>  $lines
     * @return array{line_count: int, counted_count: int, difference_count: int, difference_value: float}
     */
    private function summarize(StockOpname $opname, Collection $lines): array
    {
        $counted = $lines->whereNotNull('counted_stock');
        $differences = $counted->filter(fn (StockOpnameLine $line): bool => $line->counted_stock !== $this->systemStock($opname, $line));

        return [
            'line_count' => $lines->count(),
            'counted_count' => $counted->count(),
            'difference_count' => $differences->count(),
            'difference_value' => (float) $differences->sum(
                fn (StockOpnameLine $line): float => ((int) $line->counted_stock - $this->systemStock($opname, $line)) * $this->unitPrice($opname, $line),
            ),
        ];
    }

    /**
     * Frozen figure once completed, the item's live stock while still a draft.
     */
    private function systemStock(StockOpname $opname, StockOpnameLine $line): int
    {
        return $opname->status === StockOpnameStatus::Selesai && $line->system_stock !== null
            ? $line->system_stock
            : $line->item->current_stock;
    }

    private function unitPrice(StockOpname $opname, StockOpnameLine $line): float
    {
        return (float) ($opname->status === StockOpnameStatus::Selesai && $line->unit_price !== null
            ? $line->unit_price
            : $line->item->average_price);
    }

    /**
     * @return Collection<int, array{id: int, name: string, items_count: int}>
     */
    private function categories(): Collection
    {
        return Category::query()
            ->where('type', CategoryType::Persediaan)
            ->withCount('items')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'items_count' => $category->items_count,
            ]);
    }
}
