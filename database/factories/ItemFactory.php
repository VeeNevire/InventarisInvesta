<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'code' => strtoupper(fake()->unique()->bothify('BRG-###')),
            'name' => fake()->words(3, true),
            'variant' => null,
            'unit' => 'pcs',
            'location' => 'Rak '.fake()->randomLetter().fake()->numberBetween(1, 5),
            'minimum_stock' => 10,
            'notify_low_stock' => true,
            'current_stock' => 0,
            'average_price' => 0,
        ];
    }
}
