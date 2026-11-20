<?php

namespace Database\Factories;

use App\Enums\StockOpnameStatus;
use App\Models\StockOpname;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockOpname>
 */
class StockOpnameFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => strtoupper(fake()->unique()->bothify('OP-####-####')),
            'counted_on' => now()->toDateString(),
            'status' => StockOpnameStatus::Draf,
        ];
    }
}
