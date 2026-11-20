<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\StockTransactionLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockTransactionLine>
 */
class StockTransactionLineFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stock_transaction_id' => StockTransaction::factory(),
            'item_id' => Item::factory(),
            'quantity' => fake()->numberBetween(1, 50),
            'unit_price' => fake()->numberBetween(1, 100) * 1000,
        ];
    }
}
