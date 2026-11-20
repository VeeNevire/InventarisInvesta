<?php

namespace App\Models;

use App\Enums\StockTransactionType;
use Database\Factories\StockTransactionFactory;
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
 * @property string $number
 * @property StockTransactionType $type
 * @property Carbon $transacted_on
 * @property Carbon|null $purchased_on
 * @property int|null $supplier_id
 * @property string|null $pic_name
 * @property string|null $reference
 * @property string|null $receipt_path
 * @property int|null $employee_id
 * @property string|null $purpose
 * @property string|null $notes
 * @property int|null $recorded_by
 * @property Carbon|null $cancelled_at
 * @property int|null $cancelled_by
 * @property string|null $cancellation_reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Supplier|null $supplier
 * @property-read Employee|null $employee
 */
#[Fillable([
    'number', 'type', 'transacted_on', 'purchased_on', 'supplier_id', 'pic_name', 'reference', 'receipt_path',
    'employee_id', 'purpose', 'notes', 'recorded_by',
    'cancelled_at', 'cancelled_by', 'cancellation_reason',
])]
class StockTransaction extends Model
{
    /** @use HasFactory<StockTransactionFactory> */
    use HasFactory;

    /**
     * @return HasMany<StockTransactionLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(StockTransactionLine::class);
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * @return BelongsTo<Employee, $this>
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function isCancelled(): bool
    {
        return $this->cancelled_at !== null;
    }

    /**
     * @param  Builder<StockTransaction>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->whereNull('cancelled_at');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => StockTransactionType::class,
            'transacted_on' => 'date',
            'purchased_on' => 'date',
            'cancelled_at' => 'datetime',
        ];
    }
}
