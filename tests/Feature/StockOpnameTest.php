<?php

use App\Enums\StockOpnameStatus;
use App\Enums\StockTransactionType;
use App\Models\Category;
use App\Models\Item;
use App\Models\StockOpname;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail();
    $this->actingAs($this->secretary);
});

/**
 * @param  array<string, array{0: int|string|null, 1?: string}>  $counts  item code => [counted, reason]
 * @return list<array{id: int, counted_stock: int|string|null, reason: string|null}>
 */
function countsFor(StockOpname $opname, array $counts): array
{
    return $opname->lines()->with('item')->get()->map(fn ($line) => [
        'id' => $line->id,
        'counted_stock' => $counts[$line->item->code][0] ?? null,
        'reason' => $counts[$line->item->code][1] ?? null,
    ])->all();
}

test('starting an opname for one category lists only its items', function () {
    $category = Category::query()->where('code', 'ATK')->firstOrFail();

    $this->post(route('stock-opnames.store'), [
        'category_id' => $category->id,
        'counted_on' => now()->toDateString(),
    ])->assertRedirect();

    $opname = StockOpname::query()->latest('id')->firstOrFail();

    expect($opname->number)->toStartWith('CEK-'.now()->format('ym'))
        ->and($opname->status)->toBe(StockOpnameStatus::Draf)
        ->and($opname->lines()->count())->toBe(3);

    $this->get(route('stock-opnames.show', $opname->number))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('opnames/show')
            ->has('lines', 3)
            ->where('opname.counted_count', 0)
        );
});

test('counts can be saved as a draft without changing stock', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();

    $this->put(route('stock-opnames.update', $opname->number), [
        'lines' => countsFor($opname, ['MRC-001' => [75, 'Rusak']]),
    ])->assertRedirect();

    $line = $opname->lines()->whereRelation('item', 'code', 'MRC-001')->firstOrFail();

    expect($line->counted_stock)->toBe(75)
        ->and($line->reason)->toBe('Rusak')
        ->and(Item::query()->where('code', 'MRC-001')->value('current_stock'))->toBe(78);
});

test('completing an opname books the differences as one adjustment', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();

    $this->post(route('stock-opnames.complete', $opname->number), [
        'lines' => countsFor($opname, [
            'MRC-001' => [75, 'Rusak'],
            'ATK-001' => [13, 'Lupa dicatat masuk'],
            'ATK-002' => [8],
        ]),
    ])->assertRedirect(route('stock-opnames.show', $opname->number));

    $opname->refresh();
    $adjustment = $opname->adjustment;

    expect($opname->status)->toBe(StockOpnameStatus::Selesai)
        ->and($adjustment->type)->toBe(StockTransactionType::Penyesuaian)
        ->and($adjustment->lines()->count())->toBe(2)
        ->and(Item::query()->where('code', 'MRC-001')->value('current_stock'))->toBe(75)
        ->and(Item::query()->where('code', 'ATK-001')->value('current_stock'))->toBe(13)
        ->and(Item::query()->where('code', 'ATK-002')->value('current_stock'))->toBe(8)
        ->and(Item::query()->where('code', 'MRC-002')->value('current_stock'))->toBe(240);

    $line = $opname->lines()->whereRelation('item', 'code', 'MRC-001')->firstOrFail();

    expect($line->system_stock)->toBe(78);

    $this->get(route('items.show', 'MRC-001'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stockCard.9.description', "Cek stok {$opname->number} · Rusak")
            ->where('stockCard.9.balance_after', 75)
        );
});

test('differences need a reason before completing', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();
    $lines = countsFor($opname, ['MRC-001' => [70]]);
    $index = collect($lines)->search(fn ($line) => $line['counted_stock'] === 70);

    $this->post(route('stock-opnames.complete', $opname->number), ['lines' => $lines])
        ->assertSessionHasErrors("lines.{$index}.reason");

    expect($opname->refresh()->status)->toBe(StockOpnameStatus::Draf)
        ->and(Item::query()->where('code', 'MRC-001')->value('current_stock'))->toBe(78);
});

test('an opname needs at least one counted item', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();

    $this->post(route('stock-opnames.complete', $opname->number), ['lines' => countsFor($opname, [])])
        ->assertSessionHasErrors('lines');
});

test('an opname without differences completes without an adjustment', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();

    $this->post(route('stock-opnames.complete', $opname->number), [
        'lines' => countsFor($opname, ['MRC-001' => [78]]),
    ])->assertRedirect();

    expect($opname->refresh()->status)->toBe(StockOpnameStatus::Selesai)
        ->and($opname->adjustment_transaction_id)->toBeNull();
});

test('a completed opname cannot be changed or deleted', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();
    $this->post(route('stock-opnames.complete', $opname->number), ['lines' => countsFor($opname, ['MRC-001' => [78]])]);

    $this->put(route('stock-opnames.update', $opname->number), ['lines' => countsFor($opname, ['MRC-001' => [1]])])
        ->assertSessionHasErrors('lines');
    $this->delete(route('stock-opnames.destroy', $opname->number));

    expect($opname->fresh())->not->toBeNull();
});

test('a draft can be deleted', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $opname = StockOpname::query()->latest('id')->firstOrFail();

    $this->delete(route('stock-opnames.destroy', $opname->number))->assertRedirect(route('stock-opnames.index'));

    expect($opname->fresh())->toBeNull();
});

test('lines from another opname are rejected', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $first = StockOpname::query()->latest('id')->firstOrFail();
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);
    $second = StockOpname::query()->latest('id')->firstOrFail();

    $this->put(route('stock-opnames.update', $second->number), [
        'lines' => [['id' => $first->lines()->value('id'), 'counted_stock' => 1]],
    ])->assertSessionHasErrors('lines.0.id');
});

test('the opname list summarises each count', function () {
    $this->post(route('stock-opnames.store'), ['counted_on' => now()->toDateString()]);

    $this->get(route('stock-opnames.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('opnames/index')
            ->has('opnames', 1)
            ->where('opnames.0.line_count', 12)
            ->where('opnames.0.status.value', 'draf')
        );
});
