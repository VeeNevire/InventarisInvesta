<?php

namespace App\Models;

use App\Enums\StockOpnameStatus;
use Database\Factories\StockOpnameFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A physical stock count. While it is a draft the counts can still change;
 * completing it books every difference as one adjustment transaction.
 *
 * @property int $id
 * @property string $number
 * @property Carbon $counted_on
 * @property int|null $category_id
 * @property StockOpnameStatus $status
 * @property string|null $notes
 * @property int|null $adjustment_transaction_id
 * @property int|null $created_by
 * @property int|null $completed_by
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Category|null $category
 * @property-read StockTransaction|null $adjustment
 */
#[Fillable([
    'number', 'counted_on', 'category_id', 'status', 'notes',
    'adjustment_transaction_id', 'created_by', 'completed_by', 'completed_at',
])]
class StockOpname extends Model
{
    /** @use HasFactory<StockOpnameFactory> */
    use HasFactory;

    /**
     * @return HasMany<StockOpnameLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(StockOpnameLine::class);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<StockTransaction, $this>
     */
    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(StockTransaction::class, 'adjustment_transaction_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function isDraft(): bool
    {
        return $this->status === StockOpnameStatus::Draf;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => StockOpnameStatus::class,
            'counted_on' => 'date',
            'completed_at' => 'datetime',
        ];
    }
}
