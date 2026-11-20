<?php

use App\Enums\StockTransactionType;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Services\StockLedger;
use Carbon\CarbonImmutable;

function recordLine(Item $item, StockTransactionType $type, string $date, int $quantity, float $price = 0, bool $cancelled = false): void
{
    $transaction = StockTransaction::factory()->create([
        'type' => $type,
        'transacted_on' => $date,
        'cancelled_at' => $cancelled ? now() : null,
        'cancellation_reason' => $cancelled ? 'Salah input' : null,
    ]);

    $transaction->lines()->create([
        'item_id' => $item->id,
        'quantity' => $quantity,
        'unit_price' => $price,
    ]);
}

test('recalculating replays lines with weighted average cost', function () {
    $item = Item::factory()->create();

    recordLine($item, StockTransactionType::Masuk, '2026-10-01', 100, 5000);
    recordLine($item, StockTransactionType::Keluar, '2026-10-05', -20);
    recordLine($item, StockTransactionType::Masuk, '2026-10-10', 120, 6000);
    recordLine($item, StockTransactionType::Penyesuaian, '2026-10-12', -2);

    app(StockLedger::class)->recalculate($item);

    $item->refresh();
    $lines = $item->transactionLines()->orderBy('id')->get();

    expect($item->current_stock)->toBe(198)
        ->and((float) $item->average_price)->toBe(5600.0)
        ->and($lines->pluck('balance_after')->all())->toBe([100, 80, 200, 198])
        ->and((float) $lines[1]->unit_price)->toBe(5000.0)
        ->and((float) $lines[3]->unit_price)->toBe(5600.0);
});

test('cancelled transactions do not change the stock', function () {
    $item = Item::factory()->create();

    recordLine($item, StockTransactionType::Masuk, '2026-10-01', 50, 1000);
    recordLine($item, StockTransactionType::Keluar, '2026-10-02', -30, cancelled: true);

    app(StockLedger::class)->recalculate($item);

    $cancelledLine = $item->transactionLines()->orderByDesc('id')->first();

    expect($item->refresh()->current_stock)->toBe(50)
        ->and($cancelledLine->balance_after)->toBeNull();
});

test('transaction numbers continue per type and month', function () {
    $ledger = app(StockLedger::class);
    $date = CarbonImmutable::parse('2026-11-18');

    StockTransaction::factory()->create(['number' => 'BK-2611-0006', 'type' => StockTransactionType::Keluar]);
    StockTransaction::factory()->create(['number' => 'BK-2610-0019', 'type' => StockTransactionType::Keluar]);

    expect($ledger->nextNumber(StockTransactionType::Keluar, $date))->toBe('BK-2611-0007')
        ->and($ledger->nextNumber(StockTransactionType::Masuk, $date))->toBe('BM-2611-0001');
});
