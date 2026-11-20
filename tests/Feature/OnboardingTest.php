<?php

use App\Models\Asset;
use App\Models\Employee;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a fresh install shows every first-day step as not done', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('onboarding', [
                'has_employees' => false,
                'has_items' => false,
                'has_incoming' => false,
                'has_outgoing' => false,
                'has_assets' => false,
            ])
        );
});

test('first-day steps tick off once the data exists', function () {
    Employee::factory()->create();
    Item::factory()->create();
    StockTransaction::factory()->create();
    StockTransaction::factory()->outgoing()->create();
    Asset::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('onboarding.has_employees', true)
            ->where('onboarding.has_items', true)
            ->where('onboarding.has_incoming', true)
            ->where('onboarding.has_outgoing', true)
            ->where('onboarding.has_assets', true)
        );
});

test('a cancelled transaction does not count as the first one', function () {
    StockTransaction::factory()->cancelled()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('onboarding.has_incoming', false)
        );
});
