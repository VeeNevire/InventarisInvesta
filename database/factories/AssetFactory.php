<?php

namespace Database\Factories;

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Asset>
 */
class AssetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory()->forAssets(),
            'code' => strtoupper(fake()->unique()->bothify('INV-???-###')),
            'name' => fake()->words(3, true),
            'brand' => fake()->company(),
            'model' => fake()->bothify('??-###'),
            'serial_number' => strtoupper(fake()->bothify('SN########')),
            'purchased_on' => fake()->dateTimeBetween('-3 years', '-1 month')->format('Y-m-d'),
            'purchase_price' => fake()->numberBetween(1, 20) * 500000,
            'status' => AssetStatus::Tersedia,
            'condition' => 'Baik',
            'is_depreciated' => false,
        ];
    }
}
