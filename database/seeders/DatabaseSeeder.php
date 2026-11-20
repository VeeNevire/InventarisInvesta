<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'Admin Gudang',
            'email' => 'admin@inventarisinvesta.test',
        ]);

        User::factory()->create([
            'name' => 'Ayu Lestari',
            'email' => 'sekretaris@inventarisinvesta.test',
        ]);

        if (app()->environment('testing')) {
            $this->call(InventorySeeder::class);
        }
    }
}
