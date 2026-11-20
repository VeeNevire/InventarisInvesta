<?php

namespace Database\Factories;

use App\Enums\AssetHistoryType;
use App\Models\Asset;
use App\Models\AssetHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssetHistory>
 */
class AssetHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'asset_id' => Asset::factory(),
            'type' => AssetHistoryType::Pembelian,
            'occurred_on' => now()->toDateString(),
            'condition' => 'Baik',
        ];
    }
}
