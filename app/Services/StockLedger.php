<?php

namespace App\Services;

use App\Enums\StockTransactionType;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\StockTransactionLine;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Keeps each item's stock card consistent. Stock is never edited directly:
 * it is replayed from the item's non-cancelled transaction lines, using the
 * weighted average cost method for valuation.
 */
class StockLedger
{
    /**
     * Record a stock transaction and update the stock of every item in it.
     *
     * Quantities in `$lines` are always positive; the sign is derived from
     * the transaction type. Throws a validation error, and stores nothing,
     * when an outgoing line would take an item's stock below zero.
     *
     * @param  array<string, mixed>  $attributes
     * @param  list<array{item_id: int, quantity: int, unit_price?: float|int|string|null, note?: string|null}>  $lines
     *
     * @throws ValidationException
     */
    public function record(StockTransactionType $type, array $attributes, array $lines, ?User $recorder = null): StockTransaction
    {
        return DB::transaction(function () use ($type, $attributes, $lines, $recorder): StockTransaction {
            $items = Item::query()
                ->whereIn('id', array_column($lines, 'item_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $date = CarbonImmutable::parse($attributes['transacted_on']);

            $transaction = StockTransaction::query()->create([
                ...$attributes,
                'number' => $this->nextNumber($type, $date),
                'type' => $type,
                'recorded_by' => $recorder?->id,
            ]);

            foreach ($lines as $line) {
                $transaction->lines()->create([
                    'item_id' => $line['item_id'],
                    'quantity' => $type === StockTransactionType::Keluar ? -$line['quantity'] : $line['quantity'],
                    'unit_price' => $type === StockTransactionType::Masuk ? ($line['unit_price'] ?? 0) : 0,
                    'note' => $line['note'] ?? null,
                ]);
            }

            $this->recalculateOrFail($items, fn (int $index, Item $item): array => [
                "lines.{$index}.quantity" => "Stok {$item->name} tidak cukup. Sisa {$item->current_stock} {$item->unit}.",
            ], $lines);

            return $transaction;
        });
    }

    /**
     * Cancel a transaction and roll its effect out of every item's stock.
     *
     * @throws ValidationException
     */
    public function cancel(StockTransaction $transaction, string $reason, ?User $cancelledBy = null): void
    {
        DB::transaction(function () use ($transaction, $reason, $cancelledBy): void {
            $transaction->update([
                'cancelled_at' => now(),
                'cancelled_by' => $cancelledBy?->id,
                'cancellation_reason' => $reason,
            ]);

            $items = Item::query()
                ->whereIn('id', $transaction->lines()->pluck('item_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $this->recalculateOrFail($items, fn (int $index, Item $item): array => [
                'reason' => "Transaksi ini tidak bisa dibatalkan karena stok {$item->name} akan menjadi minus. Batalkan dulu transaksi keluar setelahnya.",
            ]);
        });
    }

    /**
     * Replay every active line of the item in chronological order, store the
     * running balance and valuation price on each line, and cache the final
     * stock and average price on the item.
     *
     * @return int The lowest running balance reached, used to detect stock going negative.
     */
    public function recalculate(Item $item): int
    {
        return DB::transaction(function () use ($item): int {
            $lines = StockTransactionLine::query()
                ->select('stock_transaction_lines.*')
                ->join('stock_transactions', 'stock_transactions.id', '=', 'stock_transaction_lines.stock_transaction_id')
                ->where('stock_transaction_lines.item_id', $item->id)
                ->orderBy('stock_transactions.transacted_on')
                ->orderBy('stock_transactions.id')
                ->orderBy('stock_transaction_lines.id')
                ->with('transaction')
                ->get();

            $balance = 0;
            $lowestBalance = 0;
            $averagePrice = 0.0;

            foreach ($lines as $line) {
                if ($line->transaction->isCancelled()) {
                    $line->update(['balance_after' => null]);

                    continue;
                }

                if ($line->transaction->type === StockTransactionType::Masuk) {
                    $totalValue = ($balance * $averagePrice) + ($line->quantity * (float) $line->unit_price);
                    $balance += $line->quantity;
                    $averagePrice = $balance > 0 ? $totalValue / $balance : (float) $line->unit_price;

                    $line->update(['balance_after' => $balance]);

                    continue;
                }

                $balance += $line->quantity;
                $lowestBalance = min($lowestBalance, $balance);

                $line->update([
                    'balance_after' => $balance,
                    'unit_price' => round($averagePrice, 2),
                ]);
            }

            $item->update([
                'current_stock' => $balance,
                'average_price' => round($averagePrice, 2),
            ]);

            return $lowestBalance;
        });
    }

    /**
     * Next transaction number for the type and month, e.g. BK-2611-0007.
     */
    public function nextNumber(StockTransactionType $type, CarbonInterface $date): string
    {
        $prefix = sprintf('%s-%s-', $type->numberPrefix(), $date->format('ym'));

        $lastNumber = StockTransaction::query()
            ->where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->value('number');

        $sequence = $lastNumber ? ((int) substr($lastNumber, -4)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Recalculate the items and abort the surrounding database transaction
     * when any item's running balance drops below zero.
     *
     * @param  Collection<int, Item>  $items
     * @param  callable(int, Item): array<string, string>  $errorFor
     * @param  list<array{item_id: int, quantity: int, unit_price?: float|int|string|null, note?: string|null}>  $lines
     *
     * @throws ValidationException
     */
    private function recalculateOrFail(Collection $items, callable $errorFor, array $lines = []): void
    {
        $stockBefore = $items->mapWithKeys(fn (Item $item): array => [$item->id => $item->current_stock]);
        $lineIndexes = array_flip(array_column($lines, 'item_id'));

        foreach ($items as $item) {
            if ($this->recalculate($item) >= 0) {
                continue;
            }

            $item->current_stock = $stockBefore[$item->id];

            throw ValidationException::withMessages($errorFor($lineIndexes[$item->id] ?? 0, $item));
        }
    }
}
