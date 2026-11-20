<?php

namespace App\Models;

use App\Enums\AssetHistoryType;
use Database\Factories\AssetHistoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $asset_id
 * @property AssetHistoryType $type
 * @property Carbon $occurred_on
 * @property string|null $holder_type
 * @property int|null $holder_id
 * @property string|null $condition
 * @property string|null $vendor
 * @property string|null $cost
 * @property string|null $notes
 * @property int|null $recorded_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Asset $asset
 * @property-read Employee|Room|null $holder
 */
#[Fillable([
    'asset_id', 'type', 'occurred_on', 'holder_type', 'holder_id',
    'condition', 'vendor', 'cost', 'notes', 'recorded_by',
])]
class AssetHistory extends Model
{
    /** @use HasFactory<AssetHistoryFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Asset, $this>
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function holder(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => AssetHistoryType::class,
            'occurred_on' => 'date',
            'cost' => 'decimal:2',
        ];
    }
}
