<?php

namespace App\Models;

use Database\Factories\EmployeeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int|null $division_id
 * @property string $name
 * @property string|null $position
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Division|null $division
 */
#[Fillable(['division_id', 'name', 'position', 'is_active'])]
class Employee extends Model
{
    /** @use HasFactory<EmployeeFactory> */
    use HasFactory;

    /**
     * Find an employee by name, ignoring casing and extra spaces, or create
     * one. An employee found this way is marked active again.
     */
    public static function findOrCreateByName(string $name, ?int $divisionId = null): self
    {
        $name = Str::squish($name);

        $employee = self::query()->whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();

        if ($employee) {
            $employee->update([
                'is_active' => true,
                'division_id' => $employee->division_id ?? $divisionId,
            ]);

            return $employee;
        }

        return self::query()->create([
            'name' => $name,
            'division_id' => $divisionId,
            'is_active' => true,
        ]);
    }

    /**
     * Name with the division in brackets when it is known.
     */
    public function displayName(): string
    {
        return $this->division ? "{$this->name} ({$this->division->name})" : $this->name;
    }

    /**
     * @return BelongsTo<Division, $this>
     */
    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    /**
     * @return MorphMany<Asset, $this>
     */
    public function heldAssets(): MorphMany
    {
        return $this->morphMany(Asset::class, 'holder');
    }

    /**
     * @return HasMany<StockTransaction, $this>
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }

    /**
     * @return MorphMany<AssetHistory, $this>
     */
    public function assetHistories(): MorphMany
    {
        return $this->morphMany(AssetHistory::class, 'holder');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
