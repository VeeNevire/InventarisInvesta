<?php

namespace App\Models;

use App\Enums\StockStatus;
use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $category_id
 * @property string $code
 * @property string $name
 * @property string|null $variant
 * @property string $unit
 * @property string|null $location
 * @property int $minimum_stock
 * @property bool $notify_low_stock
 * @property int $current_stock
 * @property string $average_price
 * @property string|null $image_path
 * @property string|null $description
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Category $category
 */
#[Fillable([
    'category_id', 'code', 'name', 'variant', 'unit', 'location',
    'minimum_stock', 'notify_low_stock', 'current_stock', 'average_price',
    'image_path', 'description',
])]
class Item extends Model
{
    /** @use HasFactory<ItemFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return HasMany<StockTransactionLine, $this>
     */
    public function transactionLines(): HasMany
    {
        return $this->hasMany(StockTransactionLine::class);
    }

    public function stockStatus(): StockStatus
    {
        return StockStatus::fromQuantities($this->current_stock, $this->minimum_stock);
    }

    public function stockValue(): float
    {
        return $this->current_stock * (float) $this->average_price;
    }

    /**
     * Items that are out of stock or at/below their minimum stock.
     *
     * @param  Builder<Item>  $query
     */
    #[Scope]
    protected function lowStock(Builder $query): void
    {
        $query->where(function (Builder $query): void {
            $query->where('current_stock', '<=', 0)
                ->orWhere(function (Builder $query): void {
                    $query->where('minimum_stock', '>', 0)
                        ->whereColumn('current_stock', '<=', 'minimum_stock');
                });
        });
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'minimum_stock' => 'integer',
            'current_stock' => 'integer',
            'notify_low_stock' => 'boolean',
            'average_price' => 'decimal:2',
        ];
    }
}
