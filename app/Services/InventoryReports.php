<?php

namespace App\Services;

use App\Enums\AssetStatus;
use App\Enums\StockTransactionType;
use App\Models\Asset;
use App\Models\Employee;
use App\Models\Item;
use App\Models\Room;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The figures behind every report. Each method returns plain arrays so the
 * same data feeds the report page and the spreadsheet download.
 */
class InventoryReports
{
    /**
     * Headline numbers for the period.
     *
     * @return array{incoming_value: float, outgoing_value: float, adjustment_value: float, incoming_count: int, outgoing_count: int, adjustment_count: int, inventory_value: float, item_count: int, low_stock_count: int}
     */
    public function summary(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $totals = $this->activeLines()
            ->whereDate('stock_transactions.transacted_on', '>=', $from->toDateString())
            ->whereDate('stock_transactions.transacted_on', '<=', $to->toDateString())
            ->selectRaw('stock_transactions.type as type')
            ->selectRaw('COUNT(DISTINCT stock_transactions.id) as transactions')
            ->selectRaw('SUM(ABS(stock_transaction_lines.quantity) * stock_transaction_lines.unit_price) as value')
            ->groupBy('stock_transactions.type')
            ->get()
            ->keyBy('type');

        $valueOf = fn (StockTransactionType $type): float => (float) ($totals[$type->value]->value ?? 0);
        $countOf = fn (StockTransactionType $type): int => (int) ($totals[$type->value]->transactions ?? 0);

        return [
            'incoming_value' => $valueOf(StockTransactionType::Masuk),
            'outgoing_value' => $valueOf(StockTransactionType::Keluar),
            'adjustment_value' => $valueOf(StockTransactionType::Penyesuaian),
            'incoming_count' => $countOf(StockTransactionType::Masuk),
            'outgoing_count' => $countOf(StockTransactionType::Keluar),
            'adjustment_count' => $countOf(StockTransactionType::Penyesuaian),
            'inventory_value' => (float) Item::query()->selectRaw('COALESCE(SUM(current_stock * average_price), 0) as total')->value('total'),
            'item_count' => Item::query()->count(),
            'low_stock_count' => Item::query()->lowStock()->count(),
        ];
    }

    /**
     * Stock movement per item: opening stock, what came in, went out and was
     * adjusted during the period, and the closing stock.
     *
     * @return array<int, array{code: string, name: string, category: string, unit: string, opening: int, incoming: int, outgoing: int, adjustment: int, closing: int, outgoing_value: float}>
     */
    public function stockMovement(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $opening = $this->activeLines()
            ->whereDate('stock_transactions.transacted_on', '<', $from->toDateString())
            ->selectRaw('stock_transaction_lines.item_id as item_id, SUM(stock_transaction_lines.quantity) as quantity')
            ->groupBy('stock_transaction_lines.item_id')
            ->pluck('quantity', 'item_id');

        $movements = $this->activeLines()
            ->whereDate('stock_transactions.transacted_on', '>=', $from->toDateString())
            ->whereDate('stock_transactions.transacted_on', '<=', $to->toDateString())
            ->selectRaw('stock_transaction_lines.item_id as item_id, stock_transactions.type as type')
            ->selectRaw('SUM(stock_transaction_lines.quantity) as quantity')
            ->selectRaw('SUM(ABS(stock_transaction_lines.quantity) * stock_transaction_lines.unit_price) as value')
            ->groupBy('stock_transaction_lines.item_id', 'stock_transactions.type')
            ->get()
            ->groupBy('item_id');

        return Item::query()
            ->with('category.parent')
            ->orderBy('code')
            ->get()
            ->map(function (Item $item) use ($opening, $movements): array {
                $rows = $movements->get($item->id, collect())->keyBy('type');
                $quantityOf = fn (StockTransactionType $type): int => (int) ($rows[$type->value]->quantity ?? 0);

                $openingStock = (int) ($opening[$item->id] ?? 0);
                $incoming = $quantityOf(StockTransactionType::Masuk);
                $outgoing = abs($quantityOf(StockTransactionType::Keluar));
                $adjustment = $quantityOf(StockTransactionType::Penyesuaian);

                return [
                    'code' => $item->code,
                    'name' => trim($item->name.' '.($item->variant ?? '')),
                    'category' => $item->category->parent?->name ?? $item->category->name,
                    'unit' => $item->unit,
                    'opening' => $openingStock,
                    'incoming' => $incoming,
                    'outgoing' => $outgoing,
                    'adjustment' => $adjustment,
                    'closing' => $openingStock + $incoming - $outgoing + $adjustment,
                    'outgoing_value' => (float) ($rows[StockTransactionType::Keluar->value]->value ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Value of goods taken out, per division and per employee.
     *
     * @return array{divisions: array<int, array{name: string, value: float, transactions: int, employees: int}>, employees: array<int, array{name: string, division: string, value: float, transactions: int}>, top_items: array<int, array{name: string, unit: string, quantity: int, value: float}>, total: float}
     */
    public function usage(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $lines = $this->activeLines()
            ->where('stock_transactions.type', StockTransactionType::Keluar)
            ->whereDate('stock_transactions.transacted_on', '>=', $from->toDateString())
            ->whereDate('stock_transactions.transacted_on', '<=', $to->toDateString())
            ->leftJoin('employees', 'employees.id', '=', 'stock_transactions.employee_id')
            ->leftJoin('divisions', 'divisions.id', '=', 'employees.division_id')
            ->leftJoin('items', 'items.id', '=', 'stock_transaction_lines.item_id')
            ->select([
                'stock_transactions.id as transaction_id',
                'employees.id as employee_id',
                'employees.name as employee_name',
                'divisions.name as division_name',
                'items.name as item_name',
                'items.variant as item_variant',
                'items.unit as item_unit',
                'stock_transaction_lines.item_id',
            ])
            ->selectRaw('ABS(stock_transaction_lines.quantity) as quantity')
            ->selectRaw('ABS(stock_transaction_lines.quantity) * stock_transaction_lines.unit_price as value')
            ->get();

        $divisionName = fn (object $line): string => $line->division_name ?? 'Tanpa divisi';

        $divisions = $lines->groupBy($divisionName)
            ->map(fn (Collection $group, string $name): array => [
                'name' => $name,
                'value' => (float) $group->sum('value'),
                'transactions' => $group->pluck('transaction_id')->unique()->count(),
                'employees' => $group->pluck('employee_id')->filter()->unique()->count(),
            ])
            ->sortByDesc('value')
            ->values()
            ->all();

        $employees = $lines->groupBy(fn (object $line): string => (string) ($line->employee_id ?? 0))
            ->map(fn (Collection $group): array => [
                'name' => (string) ($group->first()->employee_name ?? 'Tanpa penerima'),
                'division' => $divisionName($group->first()),
                'value' => (float) $group->sum('value'),
                'transactions' => $group->pluck('transaction_id')->unique()->count(),
            ])
            ->sortByDesc('value')
            ->values()
            ->all();

        $topItems = $lines->groupBy('item_id')
            ->map(fn (Collection $group): array => [
                'name' => trim($group->first()->item_name.' '.($group->first()->item_variant ?? '')),
                'unit' => (string) $group->first()->item_unit,
                'quantity' => (int) $group->sum('quantity'),
                'value' => (float) $group->sum('value'),
            ])
            ->sortByDesc('value')
            ->values()
            ->take(10)
            ->all();

        return [
            'divisions' => $divisions,
            'employees' => $employees,
            'top_items' => $topItems,
            'total' => (float) $lines->sum('value'),
        ];
    }

    /**
     * Current stock value, per category and per item.
     *
     * @return array{categories: array<int, array{name: string, items: int, value: float}>, items: array<int, array{code: string, name: string, category: string, unit: string, stock: int, average_price: float, value: float}>, total: float}
     */
    public function inventoryValue(): array
    {
        $items = Item::query()
            ->with('category.parent')
            ->orderBy('code')
            ->get()
            ->map(fn (Item $item): array => [
                'code' => $item->code,
                'name' => trim($item->name.' '.($item->variant ?? '')),
                'category' => $item->category->parent?->name ?? $item->category->name,
                'unit' => $item->unit,
                'stock' => $item->current_stock,
                'average_price' => (float) $item->average_price,
                'value' => $item->stockValue(),
            ]);

        return [
            'categories' => $items->groupBy('category')
                ->map(fn (Collection $group, string $name): array => [
                    'name' => $name,
                    'items' => $group->count(),
                    'value' => (float) $group->sum('value'),
                ])
                ->sortByDesc('value')
                ->values()
                ->all(),
            'items' => $items->sortByDesc('value')->values()->all(),
            'total' => (float) $items->sum('value'),
        ];
    }

    /**
     * Assets in use, grouped by who or which room holds them, plus the ones
     * in storage, at the repair shop or broken.
     *
     * @return array{holders: array<int, array{type: string, name: string, detail: string|null, assets: array<int, array{code: string, name: string, category: string, since: string|null, price: float}>, value: float}>, unassigned: array<int, array{code: string, name: string, category: string, status: string, price: float}>, status_counts: array<string, int>, total_value: float}
     */
    public function assetsByHolder(): array
    {
        $assets = Asset::query()
            ->where('status', '!=', AssetStatus::Dihapuskan)
            ->with(['category.parent', 'holder' => fn (MorphTo $morphTo) => $morphTo->morphWith([Employee::class => ['division']])])
            ->orderBy('code')
            ->get();

        $handedOverOn = DB::table('asset_histories')
            ->where('type', 'penyerahan')
            ->selectRaw('asset_id, holder_type, holder_id, MAX(occurred_on) as occurred_on')
            ->groupBy('asset_id', 'holder_type', 'holder_id')
            ->get()
            ->keyBy(fn (object $row): string => "{$row->asset_id}|{$row->holder_type}|{$row->holder_id}");

        $holders = $assets->filter(fn (Asset $asset): bool => $asset->holder !== null)
            ->groupBy(fn (Asset $asset): string => $asset->holder_type.'|'.$asset->holder_id)
            ->map(function (Collection $group) use ($handedOverOn): array {
                /** @var Asset $first */
                $first = $group->first();
                $holder = $first->holder;

                return [
                    'type' => $holder instanceof Room ? 'room' : 'employee',
                    'name' => (string) $holder?->getAttribute('name'),
                    'detail' => $holder instanceof Room ? $holder->floor : ($holder instanceof Employee ? $holder->division?->name : null),
                    'assets' => $group->map(fn (Asset $asset): array => [
                        'code' => $asset->code,
                        'name' => $asset->name,
                        'category' => $asset->category->parent?->name ?? $asset->category->name,
                        'since' => isset($handedOverOn["{$asset->id}|{$asset->holder_type}|{$asset->holder_id}"])
                            ? substr((string) $handedOverOn["{$asset->id}|{$asset->holder_type}|{$asset->holder_id}"]->occurred_on, 0, 10)
                            : null,
                        'price' => (float) $asset->purchase_price,
                    ])->values()->all(),
                    'value' => (float) $group->sum('purchase_price'),
                ];
            })
            ->sortBy([['type', 'asc'], ['name', 'asc']])
            ->values()
            ->all();

        return [
            'holders' => $holders,
            'unassigned' => $assets->filter(fn (Asset $asset): bool => $asset->holder === null)
                ->map(fn (Asset $asset): array => [
                    'code' => $asset->code,
                    'name' => $asset->name,
                    'category' => $asset->category->parent?->name ?? $asset->category->name,
                    'status' => $asset->status->label(),
                    'price' => (float) $asset->purchase_price,
                ])
                ->values()
                ->all(),
            'status_counts' => collect(AssetStatus::cases())
                ->reject(fn (AssetStatus $status): bool => $status === AssetStatus::Dihapuskan)
                ->mapWithKeys(fn (AssetStatus $status): array => [
                    $status->label() => $assets->where('status', $status)->count(),
                ])
                ->all(),
            'total_value' => (float) $assets->sum('purchase_price'),
        ];
    }

    /**
     * Lines of transactions that were not cancelled.
     */
    private function activeLines(): Builder
    {
        return DB::table('stock_transaction_lines')
            ->join('stock_transactions', 'stock_transactions.id', '=', 'stock_transaction_lines.stock_transaction_id')
            ->whereNull('stock_transactions.cancelled_at');
    }
}
