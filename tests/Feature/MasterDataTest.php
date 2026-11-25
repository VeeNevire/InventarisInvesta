<?php

use App\Enums\CategoryType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Division;
use App\Models\Employee;
use App\Models\Item;
use App\Models\Room;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->admin = User::query()->where('email', 'admin@inventarisinvesta.test')->firstOrFail();
    $this->secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail();
});

test('secretaries cannot open master data or edit items', function (string $route, array $parameters) {
    $this->actingAs($this->secretary)->get(route($route, $parameters))->assertForbidden();
})->with([
    ['master.employees.index', []],
    ['master.users.index', []],
    ['items.create', []],
    ['items.edit', ['item' => 'INVESTA-PLK-2026-PRM-KAL-001']],
]);

test('admins can open every master data page', function (string $route, string $component) {
    $this->actingAs($this->admin)
        ->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['master.employees.index', 'master/employees'],
    ['master.divisions.index', 'master/divisions'],
    ['master.rooms.index', 'master/rooms'],
    ['master.suppliers.index', 'master/suppliers'],
    ['master.categories.index', 'master/categories'],
    ['master.users.index', 'master/users'],
]);

test('employees can be added, edited and deactivated', function () {
    $division = Division::query()->where('name', 'IT')->firstOrFail();

    $this->actingAs($this->admin)
        ->post(route('master.employees.store'), ['name' => 'Lina Marlina', 'division_id' => $division->id, 'position' => 'Staf IT', 'is_active' => '1'])
        ->assertRedirect();

    $employee = Employee::query()->where('name', 'Lina Marlina')->firstOrFail();

    $this->put(route('master.employees.update', $employee), ['name' => 'Lina M.', 'division_id' => $division->id, 'is_active' => '0'])
        ->assertRedirect();

    expect($employee->refresh()->name)->toBe('Lina M.')
        ->and($employee->is_active)->toBeFalse();
});

test('employees with history cannot be deleted', function () {
    $employee = Employee::query()->where('name', 'Budi Santoso')->firstOrFail();

    $this->actingAs($this->admin)
        ->delete(route('master.employees.destroy', $employee))
        ->assertRedirect()
        ->assertInertiaFlash('toast.type', 'error');

    expect($employee->fresh())->not->toBeNull();
});

test('unused employees can be deleted', function () {
    $employee = Employee::factory()->create();

    $this->actingAs($this->admin)->delete(route('master.employees.destroy', $employee))->assertRedirect();

    expect($employee->fresh())->toBeNull();
});

test('divisions with employees cannot be deleted', function () {
    $division = Division::query()->where('name', 'Marketing')->firstOrFail();

    $this->actingAs($this->admin)->delete(route('master.divisions.destroy', $division));

    expect($division->fresh())->not->toBeNull();
});

test('division names must be unique', function () {
    $this->actingAs($this->admin)
        ->post(route('master.divisions.store'), ['name' => 'Marketing'])
        ->assertSessionHasErrors('name');
});

test('rooms and suppliers can be managed', function () {
    $this->actingAs($this->admin)
        ->post(route('master.rooms.store'), ['name' => 'Ruang Direksi', 'floor' => 'Lantai 3'])
        ->assertRedirect();
    $this->post(route('master.suppliers.store'), ['name' => 'Toko Baru', 'phone' => '0812'])
        ->assertRedirect();

    $room = Room::query()->where('name', 'Ruang Direksi')->firstOrFail();
    $supplier = Supplier::query()->where('name', 'Toko Baru')->firstOrFail();

    $this->delete(route('master.rooms.destroy', $room));
    $this->delete(route('master.suppliers.destroy', $supplier));

    expect($room->fresh())->toBeNull()
        ->and($supplier->fresh())->toBeNull();
});

test('suppliers used in transactions cannot be deleted', function () {
    $supplier = Supplier::query()->where('name', 'CV Cetak Prima')->firstOrFail();

    $this->actingAs($this->admin)->delete(route('master.suppliers.destroy', $supplier));

    expect($supplier->fresh())->not->toBeNull();
});

test('category codes are stored uppercase', function () {
    $this->actingAs($this->admin)
        ->post(route('master.categories.store'), ['type' => 'aset', 'code' => 'tab', 'name' => 'Tablet'])
        ->assertRedirect();

    expect(Category::query()->where('type', CategoryType::Aset)->where('code', 'TAB')->exists())->toBeTrue();
});

test('the code of a category in use cannot change', function () {
    $category = Category::query()->where('code', 'PRM')->firstOrFail();

    $this->actingAs($this->admin)
        ->put(route('master.categories.update', $category), ['type' => 'persediaan', 'code' => 'PRO', 'name' => 'Promosi Kantor'])
        ->assertSessionHasErrors('code');

    $this->put(route('master.categories.update', $category), ['type' => 'persediaan', 'code' => 'PRM', 'name' => 'Promosi Kantor'])
        ->assertSessionHasNoErrors();

    expect($category->refresh()->name)->toBe('Promosi Kantor');
});

test('admins can create users and reset passwords', function () {
    $this->actingAs($this->admin)
        ->post(route('master.users.store'), [
            'name' => 'Dewi Sartika',
            'email' => 'dewi@inventarisinvesta.test',
            'role' => 'sekretaris',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ])
        ->assertRedirect();

    $user = User::query()->where('email', 'dewi@inventarisinvesta.test')->firstOrFail();

    $this->put(route('master.users.update', $user), [
        'name' => 'Dewi Sartika',
        'email' => $user->email,
        'role' => 'sekretaris',
        'password' => '',
        'password_confirmation' => '',
    ])->assertSessionHasNoErrors();

    expect(Hash::check('rahasia123', $user->refresh()->password))->toBeTrue();

    $this->put(route('master.users.update', $user), [
        'name' => 'Dewi Sartika',
        'email' => $user->email,
        'role' => 'sekretaris',
        'password' => 'baru12345',
        'password_confirmation' => 'baru12345',
    ]);

    expect(Hash::check('baru12345', $user->refresh()->password))->toBeTrue();
});

test('admins cannot demote themselves or delete their own account', function () {
    $this->actingAs($this->admin)
        ->put(route('master.users.update', $this->admin), [
            'name' => $this->admin->name,
            'email' => $this->admin->email,
            'role' => 'sekretaris',
        ])
        ->assertSessionHasErrors('role');

    $this->delete(route('master.users.destroy', $this->admin));

    expect($this->admin->fresh())->not->toBeNull()
        ->and($this->admin->fresh()->role)->toBe(UserRole::Admin);
});

test('an admin can demote another admin while one admin remains', function () {
    $otherAdmin = User::factory()->admin()->create();

    $this->actingAs($this->admin)
        ->put(route('master.users.update', $otherAdmin), [
            'name' => $otherAdmin->name,
            'email' => $otherAdmin->email,
            'role' => 'sekretaris',
        ])
        ->assertSessionHasNoErrors();

    expect($otherAdmin->refresh()->role)->toBe(UserRole::Sekretaris)
        ->and(User::query()->where('role', UserRole::Admin)->count())->toBe(1);
});

test('admins can add an item with a photo', function () {
    Storage::fake('public');
    $stapler = Category::query()->create([
        'type' => CategoryType::Persediaan,
        'code' => 'STP',
        'name' => 'Stapler',
        'parent_id' => Category::query()->where('code', 'ATK')->value('id'),
    ]);

    $this->actingAs($this->admin)
        ->post(route('items.store'), [
            'category_id' => $stapler->id,
            'name' => 'Stapler',
            'unit' => 'pcs',
            'minimum_stock' => 3,
            'notify_low_stock' => '1',
            'photo' => UploadedFile::fake()->image('stapler.jpg'),
        ])
        ->assertRedirect(route('items.show', 'INVESTA-PLK-'.now()->year.'-ATK-STP-001'));

    $item = Item::query()->where('code', 'INVESTA-PLK-'.now()->year.'-ATK-STP-001')->firstOrFail();

    expect($item->current_stock)->toBe(0)
        ->and($item->notify_low_stock)->toBeTrue();
    Storage::disk('public')->assertExists($item->image_path);
});

test('admins can edit an item and replace its photo', function () {
    Storage::fake('public');
    Storage::disk('public')->put('items/lama.jpg', 'x');
    $item = Item::query()->where('code', 'INVESTA-PLK-2026-PRM-KAL-001')->firstOrFail();
    $item->update(['image_path' => 'items/lama.jpg']);

    $this->actingAs($this->admin)
        ->put(route('items.update', $item->code), [
            'category_id' => $item->category_id,
            'name' => 'Kalender Meja 2027',
            'variant' => 'Meja',
            'unit' => 'pcs',
            'minimum_stock' => 60,
            'notify_low_stock' => '0',
            'photo' => UploadedFile::fake()->image('baru.jpg'),
        ])
        ->assertRedirect(route('items.show', $item->code));

    $item->refresh();

    expect($item->minimum_stock)->toBe(60)
        ->and($item->notify_low_stock)->toBeFalse()
        ->and($item->current_stock)->toBe(78)
        ->and($item->image_path)->not->toBe('items/lama.jpg');
    Storage::disk('public')->assertMissing('items/lama.jpg');
});

test('items with transactions cannot be deleted', function () {
    $this->actingAs($this->admin)->delete(route('items.destroy', 'INVESTA-PLK-2026-PRM-KAL-001'));

    expect(Item::query()->where('code', 'INVESTA-PLK-2026-PRM-KAL-001')->exists())->toBeTrue();
});

test('duplicate item names are rejected', function () {
    $this->actingAs($this->admin)
        ->post(route('items.store'), [
            'category_id' => Category::query()->where('code', 'PTH')->value('id'),
            'name' => 'pulpen hitam',
            'unit' => 'box',
            'minimum_stock' => 0,
        ])
        ->assertSessionHasErrors('name');
});

test('employees can be saved without a division', function () {
    $this->actingAs($this->admin)
        ->post(route('master.employees.store'), ['name' => 'Karyawan Magang', 'division_id' => '', 'is_active' => '1'])
        ->assertSessionHasNoErrors();

    expect(Employee::query()->where('name', 'Karyawan Magang')->value('division_id'))->toBeNull();

    $this->get(route('master.employees.index'))->assertOk();
});

test('item types group goods under a category and build the item code', function () {
    $parent = Category::factory()->create(['type' => CategoryType::Persediaan, 'code' => 'PK', 'name' => 'Perlengkapan Kantor']);

    $this->actingAs($this->admin)->post(route('master.categories.store'), [
        'type' => 'persediaan', 'code' => 'XYZ', 'name' => 'Alat Tulis', 'parent_id' => $parent->id,
    ])->assertRedirect();

    $child = Category::query()->where('code', 'XYZ')->firstOrFail();
    $this->post(route('items.store'), [
        'category_id' => $child->id, 'name' => 'Pulpen Baru', 'unit' => 'pcs', 'minimum_stock' => 0,
    ])->assertRedirect(route('items.show', 'INVESTA-PLK-'.now()->year.'-PK-XYZ-001'));

    $this->get(route('items.index', ['category' => 'PK']))
        ->assertInertia(fn (Assert $page) => $page->where('items.0.code', 'INVESTA-PLK-'.now()->year.'-PK-XYZ-001')->where('items.0.category.parent_name', 'Perlengkapan Kantor'));
});

test('categories cannot have a parent of another type or form a cycle', function () {
    $parent = Category::factory()->create(['type' => CategoryType::Persediaan]);
    $child = Category::factory()->create(['type' => CategoryType::Persediaan, 'parent_id' => $parent->id]);
    $assetCategory = Category::query()->where('type', CategoryType::Aset)->firstOrFail();

    $this->actingAs($this->admin)->put(route('master.categories.update', $parent), [
        'type' => 'persediaan', 'code' => $parent->code, 'name' => $parent->name, 'parent_id' => $child->id,
    ])->assertSessionHasErrors('parent_id');
    $this->post(route('master.categories.store'), [
        'type' => 'persediaan', 'code' => 'XYZ', 'name' => 'Alat Tulis', 'parent_id' => $assetCategory->id,
    ])->assertSessionHasErrors('parent_id');
    $this->delete(route('master.categories.destroy', $parent))->assertInertiaFlash('toast.type', 'error');
    expect($parent->fresh())->not->toBeNull();
});

test('an unused category can be placed under a main category', function () {
    $parent = Category::factory()->create(['type' => CategoryType::Persediaan]);
    $unused = Category::factory()->create(['type' => CategoryType::Persediaan]);

    $this->actingAs($this->admin)->put(route('master.categories.update', $unused), [
        'type' => 'persediaan', 'code' => $unused->code, 'name' => $unused->name, 'parent_id' => $parent->id,
    ])->assertSessionHasNoErrors();

    expect($unused->refresh()->parent_id)->toBe($parent->id);
});

test('an item type in use cannot move to another category or be detached', function () {
    $parent = Category::factory()->create(['type' => CategoryType::Persediaan]);
    $calendar = Category::query()->where('code', 'KAL')->firstOrFail();
    $originalParent = $calendar->parent_id;

    $this->actingAs($this->admin)->put(route('master.categories.update', $calendar), [
        'type' => 'persediaan', 'code' => $calendar->code, 'name' => $calendar->name, 'parent_id' => $parent->id,
    ])->assertSessionHasErrors('parent_id');
    $this->put(route('master.categories.update', $calendar), [
        'type' => 'persediaan', 'code' => $calendar->code, 'name' => $calendar->name, 'parent_id' => '',
    ])->assertSessionHasErrors('parent_id');
    $this->put(route('master.categories.update', $calendar), [
        'type' => 'persediaan', 'code' => $calendar->code, 'name' => 'Kalender Kantor', 'parent_id' => $originalParent,
    ])->assertSessionHasNoErrors();

    expect($calendar->refresh()->parent_id)->toBe($originalParent);
});

test('item codes are always generated and need an item type', function () {
    $calendar = Category::query()->where('code', 'KAL')->firstOrFail();
    $data = ['category_id' => $calendar->id, 'name' => 'Kalender Dinding 2028', 'unit' => 'pcs', 'minimum_stock' => 0];

    $this->actingAs($this->admin)->post(route('items.store'), [...$data, 'code' => 'GUDANG-025'])
        ->assertSessionHasErrors('code');
    $this->post(route('items.store'), [...$data, 'category_id' => $calendar->parent_id])
        ->assertSessionHasErrors('category_id');
    $this->post(route('items.store'), $data)
        ->assertRedirect(route('items.show', 'INVESTA-PLK-'.now()->year.'-PRM-KAL-004'));
});

test('asset categories can have item types', function () {
    $parent = Category::query()->where('type', CategoryType::Aset)->where('code', 'ITE')->firstOrFail();

    $this->actingAs($this->admin)->post(route('master.categories.store'), [
        'type' => 'aset', 'code' => 'ZZZ', 'name' => 'Tablet', 'parent_id' => $parent->id,
    ])->assertSessionHasNoErrors();

    expect(Category::query()->where('code', 'ZZZ')->value('parent_id'))->toBe($parent->id);
});

test('item category filters include subcategories and can select a subcategory', function () {
    $parent = Category::factory()->create(['type' => CategoryType::Persediaan, 'code' => 'QPA']);
    $otherParent = Category::factory()->create(['type' => CategoryType::Persediaan, 'code' => 'QPB']);
    $child = Category::factory()->create(['type' => CategoryType::Persediaan, 'code' => 'QCA', 'parent_id' => $parent->id]);
    $otherChild = Category::factory()->create(['type' => CategoryType::Persediaan, 'code' => 'QCB', 'parent_id' => $otherParent->id]);
    Item::factory()->create(['category_id' => $parent->id]);
    $childItem = Item::factory()->create(['category_id' => $child->id]);
    Item::factory()->create(['category_id' => $otherChild->id]);

    $this->actingAs($this->admin)->get(route('items.index', ['category' => 'QPA']))
        ->assertInertia(fn (Assert $page) => $page->has('items', 2));
    $this->get(route('items.index', ['category' => 'QCA']))
        ->assertInertia(fn (Assert $page) => $page->has('items', 1)->where('items.0.code', $childItem->code));
    $this->get(route('items.index', ['category' => 'QCB']))
        ->assertInertia(fn (Assert $page) => $page->has('items', 1));
});
