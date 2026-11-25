<?php

namespace Database\Factories;

use App\Enums\CategoryType;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => CategoryType::Persediaan,
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'name' => fake()->unique()->words(2, true),
        ];
    }

    /**
     * An item type (jenis barang) under a new main category of the same type.
     */
    public function itemType(): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_id' => Category::factory()->state(['type' => $attributes['type']]),
        ]);
    }

    public function forAssets(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CategoryType::Aset,
        ]);
    }
}
