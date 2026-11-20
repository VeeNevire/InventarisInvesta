<?php

namespace Database\Factories;

use App\Models\Division;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'division_id' => Division::factory(),
            'name' => fake()->name(),
            'position' => fake()->jobTitle(),
            'is_active' => true,
        ];
    }
}
