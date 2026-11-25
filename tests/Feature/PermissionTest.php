<?php

use App\Enums\AssetStatus;
use App\Enums\Permission;
use App\Models\Asset;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->admin = User::query()->where('email', 'admin@inventarisinvesta.test')->firstOrFail();
    $this->secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail();
});

/**
 * @param  array<int, Permission>  $permissions
 */
function grant(User $user, array $permissions): User
{
    $user->update(['permissions' => array_map(fn (Permission $permission): string => $permission->value, $permissions)]);

    return $user->refresh();
}

test('a ticked permission opens its page for a secretary', function (Permission $permission, string $route, array $parameters) {
    $this->actingAs($this->secretary)->get(route($route, $parameters))->assertForbidden();

    $this->actingAs(grant($this->secretary, [$permission]))->get(route($route, $parameters))->assertOk();
})->with([
    'tambah barang' => [Permission::CreateItems, 'items.create', []],
    'ubah barang' => [Permission::UpdateItems, 'items.edit', ['item' => 'INVESTA-PLK-2026-PRM-KAL-001']],
    'ubah aset' => [Permission::UpdateAssets, 'assets.edit', ['asset' => 'INVESTA-PRL-2025-ITE-LPT-003']],
    'karyawan' => [Permission::ManageEmployees, 'master.employees.index', []],
    'divisi' => [Permission::ManageEmployees, 'master.divisions.index', []],
    'ruangan' => [Permission::ManagePlaces, 'master.rooms.index', []],
    'supplier' => [Permission::ManagePlaces, 'master.suppliers.index', []],
    'kategori' => [Permission::ManageCategories, 'master.categories.index', []],
]);

test('a permission only opens what it names', function () {
    $this->actingAs(grant($this->secretary, [Permission::CreateItems]));

    $this->get(route('items.edit', 'INVESTA-PLK-2026-PRM-KAL-001'))->assertForbidden();
    $this->get(route('master.employees.index'))->assertForbidden();
    $this->get(route('assets.edit', 'INVESTA-PRL-2025-ITE-LPT-003'))->assertForbidden();
});

test('managing user accounts stays admin-only even with every permission', function () {
    $this->actingAs(grant($this->secretary, Permission::cases()));

    $this->get(route('master.users.index'))->assertForbidden();
    $this->put(route('master.users.update', $this->secretary), [
        'name' => $this->secretary->name,
        'email' => $this->secretary->email,
        'role' => 'admin',
    ])->assertForbidden();

    expect($this->secretary->refresh()->isAdmin())->toBeFalse();
});

test('a secretary with the delete permission can delete an unused item', function () {
    $item = Item::factory()->create();

    $this->actingAs(grant($this->secretary, [Permission::UpdateItems]))
        ->delete(route('items.destroy', $item))
        ->assertForbidden();

    $this->actingAs(grant($this->secretary, [Permission::DeleteItems]))
        ->delete(route('items.destroy', $item))
        ->assertRedirect();

    expect($item->fresh())->toBeNull();
});

test('the item form only offers deleting to users who may delete', function () {
    $this->actingAs(grant($this->secretary, [Permission::UpdateItems]))
        ->get(route('items.edit', 'INVESTA-PLK-2026-PRM-KAL-001'))
        ->assertInertia(fn (Assert $page) => $page->where('canDelete', false));

    $this->actingAs($this->admin)
        ->get(route('items.edit', 'INVESTA-PLK-2026-PRM-KAL-001'))
        ->assertInertia(fn (Assert $page) => $page->where('canDelete', true));
});

test('a secretary with the cancel permission can cancel a transaction', function () {
    $transaction = StockTransaction::query()->where('number', 'BK-2611-0004')->firstOrFail();

    $this->actingAs(grant($this->secretary, [Permission::CancelTransactions]))
        ->post(route('transactions.cancel', $transaction->number), ['reason' => 'Salah jumlah barang'])
        ->assertRedirect();

    expect($transaction->refresh()->isCancelled())->toBeTrue()
        ->and($transaction->cancelled_by)->toBe($this->secretary->id);
});

test('a secretary with the dispose permission can dispose of an asset', function () {
    $this->actingAs(grant($this->secretary, [Permission::DisposeAssets]))
        ->post(route('assets.dispose', 'INVESTA-PRL-2023-ITE-LPT-005'), [
            'reason' => 'Rusak total',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    expect(Asset::query()->where('code', 'INVESTA-PRL-2023-ITE-LPT-005')->firstOrFail()->status)->toBe(AssetStatus::Dihapuskan);
});

test('admins can tick permissions for a secretary', function () {
    $this->actingAs($this->admin)
        ->put(route('master.users.update', $this->secretary), [
            'name' => $this->secretary->name,
            'email' => $this->secretary->email,
            'role' => 'sekretaris',
            'permissions' => ['items.create', 'items.delete'],
        ])
        ->assertSessionHasNoErrors();

    expect($this->secretary->refresh()->permissions)->toBe(['items.create', 'items.delete']);

    $this->put(route('master.users.update', $this->secretary), [
        'name' => $this->secretary->name,
        'email' => $this->secretary->email,
        'role' => 'sekretaris',
    ])->assertSessionHasNoErrors();

    expect($this->secretary->refresh()->permissions)->toBe([]);
});

test('promoting a secretary to admin drops the ticked list', function () {
    grant($this->secretary, [Permission::CreateItems]);

    $this->actingAs($this->admin)
        ->put(route('master.users.update', $this->secretary), [
            'name' => $this->secretary->name,
            'email' => $this->secretary->email,
            'role' => 'admin',
            'permissions' => ['items.create'],
        ])
        ->assertSessionHasNoErrors();

    expect($this->secretary->refresh())
        ->isAdmin()->toBeTrue()
        ->permissions->toBe([]);
});

test('unknown permissions are rejected', function () {
    $this->actingAs($this->admin)
        ->put(route('master.users.update', $this->secretary), [
            'name' => $this->secretary->name,
            'email' => $this->secretary->email,
            'role' => 'sekretaris',
            'permissions' => ['users.manage'],
        ])
        ->assertSessionHasErrors('permissions.0');
});

test('the user list shows each account permissions and the options', function () {
    grant($this->secretary, [Permission::CancelTransactions]);

    $this->actingAs($this->admin)
        ->get(route('master.users.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('permissionOptions', count(Permission::cases()))
            ->where('users', fn ($users) => collect($users)->firstWhere('id', $this->secretary->id)['permissions'] === ['transactions.cancel'])
        );
});

test('shared props tell the interface what a secretary may do', function () {
    $this->actingAs(grant($this->secretary, [Permission::ManagePlaces]))
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.can', fn ($can) => $can['master.places'] === true
                && $can['items.create'] === false
                && $can['manage-users'] === false)
            ->where('auth.canAccessMasterData', true)
        );

    $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.can', fn ($can) => $can['items.delete'] === true && $can['manage-users'] === true)
        );
});
