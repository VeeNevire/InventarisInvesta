<?php

namespace App\Models;

use Database\Factories\StockTransactionLineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A single item row inside a stock transaction. `quantity` is signed:
 * positive adds stock, negative removes it.
 *
 * @property int $id
 * @property int $stock_transaction_id
 * @property int $item_id
 * @property int $quantity
 * @property string $unit_price
 * @property int|null $balance_after
 * @property string|null $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read StockTransaction $transaction
 * @property-read Item $item
 */
#[Fillable(['stock_transaction_id', 'item_id', 'quantity', 'unit_price', 'balance_after', 'note'])]
class StockTransactionLine extends Model
{
    /** @use HasFactory<StockTransactionLineFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<StockTransaction, $this>
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(StockTransaction::class, 'stock_transaction_id');
    }

    /**
     * @return BelongsTo<Item, $this>
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'balance_after' => 'integer',
        ];
    }
}
