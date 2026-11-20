<?php

namespace App\Models;

use App\Enums\AssetStatus;
use Carbon\CarbonInterface;
use Database\Factories\AssetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $category_id
 * @property string $code
 * @property string $name
 * @property string|null $brand
 * @property string|null $model
 * @property string|null $serial_number
 * @property string|null $specification
 * @property Carbon|null $purchased_on
 * @property string $purchase_price
 * @property int|null $supplier_id
 * @property AssetStatus $status
 * @property string|null $condition
 * @property string|null $holder_type
 * @property int|null $holder_id
 * @property bool $is_depreciated
 * @property int|null $useful_life_months
 * @property string|null $residual_value
 * @property string|null $image_path
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Category $category
 * @property-read Supplier|null $supplier
 * @property-read Employee|Room|null $holder
 */
#[Fillable([
    'category_id', 'code', 'name', 'brand', 'model', 'serial_number',
    'specification', 'purchased_on', 'purchase_price', 'supplier_id',
    'status', 'condition', 'holder_type', 'holder_id', 'is_depreciated',
    'useful_life_months', 'residual_value', 'image_path',
])]
class Asset extends Model
{
    /** @use HasFactory<AssetFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * The employee or room currently holding this asset.
     *
     * @return MorphTo<Model, $this>
     */
    public function holder(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return HasMany<AssetHistory, $this>
     */
    public function histories(): HasMany
    {
        return $this->hasMany(AssetHistory::class);
    }

    /**
     * Straight-line depreciation figures as of the given date, or null when
     * depreciation is not enabled for this asset.
     *
     * @return array{months_elapsed: int, useful_life_months: int, monthly: float, accumulated: float, book_value: float}|null
     */
    public function depreciation(?CarbonInterface $asOf = null): ?array
    {
        if (! $this->is_depreciated || ! $this->useful_life_months || ! $this->purchased_on) {
            return null;
        }

        $asOf ??= now();
        $price = (float) $this->purchase_price;
        $residual = (float) ($this->residual_value ?? 0);
        $monthly = ($price - $residual) / $this->useful_life_months;
        $monthsElapsed = (int) max(0, min(
            $this->useful_life_months,
            ($asOf->year - $this->purchased_on->year) * 12 + ($asOf->month - $this->purchased_on->month),
        ));
        $accumulated = round($monthly * $monthsElapsed, 2);

        return [
            'months_elapsed' => $monthsElapsed,
            'useful_life_months' => $this->useful_life_months,
            'monthly' => round($monthly, 2),
            'accumulated' => $accumulated,
            'book_value' => round($price - $accumulated, 2),
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => AssetStatus::class,
            'purchased_on' => 'date',
            'purchase_price' => 'decimal:2',
            'residual_value' => 'decimal:2',
            'is_depreciated' => 'boolean',
            'useful_life_months' => 'integer',
        ];
    }
}
