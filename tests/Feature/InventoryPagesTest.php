<?php

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\Item;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::query()->firstOrFail());
});

test('dashboard shows stock and asset summaries', function () {
    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('stats.low_stock', 5)
            ->where('stats.low_stock_notified', 4)
            ->where('stats.assets_total', 10)
            ->has('lowStockAlerts', 4)
            ->has('monthlyMovement', 6)
        );
});

test('item list can be filtered by category and stock status', function () {
    $this->get(route('items.index', ['category' => 'MRC', 'status' => 'menipis']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('items/index')
            ->has('items', 2)
            ->where('items.0.code', 'MRC-001')
            ->where('items.1.code', 'MRC-003')
        );
});

test('item list can be searched', function () {
    $this->get(route('items.index', ['search' => 'gantungan']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('items', 2));
});

test('item detail shows the stock card including cancelled rows', function () {
    $this->get(route('items.show', 'MRC-001'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('items/show')
            ->where('item.current_stock', 78)
            ->where('item.status.value', 'menipis')
            ->has('stockCard', 9)
            ->where('stockCard.4.is_cancelled', true)
            ->where('stockCard.4.balance_after', null)
            ->where('stockCard.8.balance_after', 78)
        );
});

test('low stock notification can be switched off per item', function () {
    $item = Item::query()->where('code', 'MRC-001')->firstOrFail();

    $this->patch(route('items.notification.update', $item->code), ['notify_low_stock' => false])
        ->assertRedirect();

    expect($item->refresh()->notify_low_stock)->toBeFalse();

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('lowStockAlerts', 3));
});

test('notification update requires a boolean', function () {
    $this->patch(route('items.notification.update', 'MRC-001'), ['notify_low_stock' => 'maybe'])
        ->assertSessionHasErrors('notify_low_stock');
});

test('asset list can be filtered by status', function () {
    $this->get(route('assets.index', ['status' => AssetStatus::Dipakai->value]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('assets/index')
            ->has('assets', 6)
            ->where('statusCounts.tersedia', 2)
        );
});

test('asset detail shows holder, history and depreciation', function () {
    $this->get(route('assets.show', 'INV-LPT-003'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('assets/show')
            ->where('asset.holder.name', 'Budi Santoso')
            ->where('asset.holder.type', 'employee')
            ->where('holderSince', '2026-03-03')
            ->has('histories', 6)
            ->where('serviceCost', 650000)
            ->has('depreciation')
        );
});

test('room holders are shown as rooms', function () {
    $asset = Asset::query()->where('code', 'INV-PRY-001')->firstOrFail();

    $this->get(route('assets.show', $asset->code))
        ->assertInertia(fn (Assert $page) => $page
            ->where('asset.holder.type', 'room')
            ->where('asset.holder.name', 'Ruang Rapat Utama')
        );
});
