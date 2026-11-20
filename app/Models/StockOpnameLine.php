<?php

namespace App\Models;

use Database\Factories\StockOpnameLineFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One item on a stock count. `system_stock` and `unit_price` are frozen when
 * the count is completed; while it is a draft the item's live stock is used.
 *
 * @property int $id
 * @property int $stock_opname_id
 * @property int $item_id
 * @property int|null $system_stock
 * @property int|null $counted_stock
 * @property string|null $unit_price
 * @property string|null $reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read StockOpname $opname
 * @property-read Item $item
 */
#[Fillable(['stock_opname_id', 'item_id', 'system_stock', 'counted_stock', 'unit_price', 'reason'])]
class StockOpnameLine extends Model
{
    /** @use HasFactory<StockOpnameLineFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<StockOpname, $this>
     */
    public function opname(): BelongsTo
    {
        return $this->belongsTo(StockOpname::class, 'stock_opname_id');
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
            'system_stock' => 'integer',
            'counted_stock' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }
}
