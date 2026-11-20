<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\StockOpname;
use App\Models\StockOpnameLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockOpnameLine>
 */
class StockOpnameLineFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stock_opname_id' => StockOpname::factory(),
            'item_id' => Item::factory(),
            'counted_stock' => null,
        ];
    }
}
