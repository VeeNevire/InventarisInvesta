<?php

namespace App\Http\Controllers;

use App\Enums\AssetStatus;
use App\Enums\StockTransactionType;
use App\Http\Resources\AssetResource;
use App\Http\Resources\ItemResource;
use App\Http\Resources\StockTransactionResource;
use App\Models\Asset;
use App\Models\Employee;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\StockTransactionLine;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Number of days without outgoing movement before an item counts as idle.
     */
    private const IDLE_AFTER_DAYS = 90;

    public function __invoke(): Response
    {
        $today = CarbonImmutable::today();

        $todayTransactions = StockTransaction::query()
            ->active()
            ->whereDate('transacted_on', $today)
            ->get();

        $lowStockItems = Item::query()->lowStock()->with('category')->orderBy('current_stock')->get();

        return Inertia::render('dashboard', [
            'today' => $today->toDateString(),
            'stats' => [
                'incoming_today' => $todayTransactions->where('type', StockTransactionType::Masuk)->count(),
                'outgoing_today' => $todayTransactions->where('type', StockTransactionType::Keluar)->count(),
                'low_stock' => $lowStockItems->count(),
                'low_stock_notified' => $lowStockItems->where('notify_low_stock', true)->count(),
                'assets_in_use' => Asset::query()->where('status', AssetStatus::Dipakai)->count(),
                'assets_total' => Asset::query()->where('status', '!=', AssetStatus::Dihapuskan)->count(),
                'inventory_value' => (float) Item::query()->selectRaw('COALESCE(SUM(current_stock * average_price), 0) as total')->value('total'),
                'item_count' => Item::query()->count(),
            ],
            'lowStockItems' => ItemResource::collection($lowStockItems->take(6))->resolve(),
            'recentTransactions' => StockTransactionResource::collection(
                StockTransaction::query()
                    ->with(['lines.item', 'employee.division', 'supplier'])
                    ->latest('transacted_on')
                    ->latest('id')
                    ->limit(6)
                    ->get(),
            )->resolve(),
            'assetsNeedingAttention' => AssetResource::collection(
                Asset::query()
                    ->whereIn('status', [AssetStatus::Diperbaiki, AssetStatus::Rusak])
                    ->with(['category', 'holder' => fn (MorphTo $morphTo) => $morphTo->morphWith([Employee::class => ['division']])])
                    ->get(),
            )->resolve(),
            'idleItems' => $this->idleItems($today),
            'monthlyMovement' => $this->monthlyMovement($today),
            'onboarding' => $this->onboarding(),
        ]);
    }

    /**
     * First-day checklist: which basic steps have already been done once.
     *
     * @return array{has_employees: bool, has_items: bool, has_incoming: bool, has_outgoing: bool, has_assets: bool}
     */
    private function onboarding(): array
    {
        return [
            'has_employees' => Employee::query()->exists(),
            'has_items' => Item::query()->exists(),
            'has_incoming' => StockTransaction::query()->active()->where('type', StockTransactionType::Masuk)->exists(),
            'has_outgoing' => StockTransaction::query()->active()->where('type', StockTransactionType::Keluar)->exists(),
            'has_assets' => Asset::query()->exists(),
        ];
    }

    /**
     * Items still in stock that have not gone out for a long time.
     *
     * @return array<int, array{code: string, name: string, unit: string, current_stock: int, stock_value: float, last_out_on: string|null, idle_days: int|null}>
     */
    private function idleItems(CarbonImmutable $today): array
    {
        return Item::query()
            ->where('current_stock', '>', 0)
            ->addSelect(['last_out_on' => StockTransaction::query()
                ->select('stock_transactions.transacted_on')
                ->join('stock_transaction_lines', 'stock_transaction_lines.stock_transaction_id', '=', 'stock_transactions.id')
                ->whereColumn('stock_transaction_lines.item_id', 'items.id')
                ->where('stock_transactions.type', StockTransactionType::Keluar)
                ->whereNull('stock_transactions.cancelled_at')
                ->orderByDesc('stock_transactions.transacted_on')
                ->limit(1),
            ])
            ->get()
            ->map(function (Item $item) use ($today): array {
                $lastOut = $item->getAttribute('last_out_on');
                $lastOutDate = $lastOut ? CarbonImmutable::parse($lastOut) : null;

                return [
                    'code' => $item->code,
                    'name' => trim($item->name.' '.($item->variant ?? '')),
                    'unit' => $item->unit,
                    'current_stock' => $item->current_stock,
                    'stock_value' => $item->stockValue(),
                    'last_out_on' => $lastOutDate?->toDateString(),
                    'idle_days' => $lastOutDate ? (int) $lastOutDate->diffInDays($today) : null,
                ];
            })
            ->filter(fn (array $item): bool => $item['idle_days'] === null || $item['idle_days'] > self::IDLE_AFTER_DAYS)
            ->sortByDesc('idle_days')
            ->values()
            ->take(5)
            ->all();
    }

    /**
     * Value of goods in and out for each of the last six months.
     *
     * @return array<int, array{month: string, incoming: float, outgoing: float}>
     */
    private function monthlyMovement(CarbonImmutable $today): array
    {
        $start = $today->startOfMonth()->subMonths(5);

        /** @var Collection<int, StockTransactionLine> $lines */
        $lines = StockTransactionLine::query()
            ->with('transaction')
            ->whereHas('transaction', fn ($query) => $query->active()->whereDate('transacted_on', '>=', $start))
            ->get();

        return collect(range(0, 5))
            ->map(function (int $offset) use ($start, $lines): array {
                $month = $start->addMonths($offset);
                $monthLines = $lines->filter(fn (StockTransactionLine $line): bool => $line->transaction->transacted_on->isSameMonth($month));

                $valueOf = fn (StockTransactionType $type): float => (float) $monthLines
                    ->filter(fn (StockTransactionLine $line): bool => $line->transaction->type === $type)
                    ->sum(fn (StockTransactionLine $line): float => abs($line->quantity) * (float) $line->unit_price);

                return [
                    'month' => $month->format('Y-m'),
                    'incoming' => $valueOf(StockTransactionType::Masuk),
                    'outgoing' => $valueOf(StockTransactionType::Keluar),
                ];
            })
            ->all();
    }
}
