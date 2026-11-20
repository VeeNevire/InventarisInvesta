<?php

namespace App\Models;

use Database\Factories\RoomFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string|null $floor
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'floor'])]
class Room extends Model
{
    /** @use HasFactory<RoomFactory> */
    use HasFactory;

    /**
     * @return MorphMany<Asset, $this>
     */
    public function heldAssets(): MorphMany
    {
        return $this->morphMany(Asset::class, 'holder');
    }

    /**
     * @return MorphMany<AssetHistory, $this>
     */
    public function assetHistories(): MorphMany
    {
        return $this->morphMany(AssetHistory::class, 'holder');
    }
}
