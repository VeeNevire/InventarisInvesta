<?php

namespace Database\Factories;

use App\Enums\StockTransactionType;
use App\Models\StockTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockTransaction>
 */
class StockTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => strtoupper(fake()->unique()->bothify('BM-####-####')),
            'type' => StockTransactionType::Masuk,
            'transacted_on' => now()->toDateString(),
            'reference' => fake()->bothify('Nota ####'),
        ];
    }

    public function outgoing(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => StockTransactionType::Keluar,
            'number' => strtoupper(fake()->unique()->bothify('BK-####-####')),
            'reference' => null,
            'purpose' => fake()->sentence(3),
        ]);
    }

    public function cancelled(string $reason = 'Salah input'): static
    {
        return $this->state(fn (array $attributes) => [
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }
}
