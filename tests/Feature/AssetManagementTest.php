<?php

use App\Enums\AssetHistoryType;
use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Division;
use App\Models\Employee;
use App\Models\Room;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->admin = User::query()->where('email', 'admin@inventarisinvesta.test')->firstOrFail();
    $this->secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail();
    $this->laptopCategory = Category::query()->where('code', 'LPT')->firstOrFail();
});

function findAsset(string $code): Asset
{
    return Asset::query()->where('code', $code)->firstOrFail();
}

test('a new asset gets the next code and a purchase entry', function () {
    Storage::fake('public');

    $this->actingAs($this->secretary)
        ->post(route('assets.store'), [
            'category_id' => $this->laptopCategory->id,
            'name' => 'Laptop Dell Latitude 3440',
            'brand' => 'Dell',
            'serial_number' => 'DL3440-01',
            'purchased_on' => now()->toDateString(),
            'purchase_price' => 11000000,
            'supplier_name' => 'Toko Komputer Jaya',
            'is_depreciated' => '1',
            'useful_life_months' => 48,
            'residual_value' => 1000000,
            'photo' => UploadedFile::fake()->image('laptop.jpg'),
        ])
        ->assertRedirect(route('assets.show', 'INVESTA-PRL-'.now()->year.'-ITE-LPT-006'));

    $asset = findAsset('INVESTA-PRL-'.now()->year.'-ITE-LPT-006');

    expect($asset->status)->toBe(AssetStatus::Tersedia)
        ->and($asset->supplier->name)->toBe('Toko Komputer Jaya')
        ->and($asset->is_depreciated)->toBeTrue()
        ->and($asset->histories()->where('type', AssetHistoryType::Pembelian)->exists())->toBeTrue();
    Storage::disk('public')->assertExists($asset->image_path);
});

test('a secretary can create an item type while adding an asset', function () {
    $itDevices = Category::query()->where('code', 'ITE')->firstOrFail();

    $this->actingAs($this->secretary)->post(route('assets.store'), [
        'new_category' => '1',
        'category_parent_id' => $itDevices->id,
        'category_name' => 'Tablet',
        'category_code' => 'zzz',
        'name' => 'Tablet baru',
        'purchased_on' => '2025-03-01',
        'purchase_price' => 1000,
    ])->assertRedirect(route('assets.show', 'INVESTA-PRL-2025-ITE-ZZZ-001'));

    $itemType = findAsset('INVESTA-PRL-2025-ITE-ZZZ-001')->category;

    expect($itemType->name)->toBe('Tablet')
        ->and($itemType->parent_id)->toBe($itDevices->id);
});

test('the code uses the purchase year and keeps counting across years', function () {
    $data = [
        'category_id' => $this->laptopCategory->id,
        'name' => 'Laptop baru',
        'purchase_price' => 1000,
    ];

    $this->actingAs($this->secretary)->post(route('assets.store'), [...$data, 'purchased_on' => '2025-12-30'])
        ->assertRedirect(route('assets.show', 'INVESTA-PRL-2025-ITE-LPT-006'));
    $this->post(route('assets.store'), [...$data, 'purchased_on' => '2026-01-02'])
        ->assertRedirect(route('assets.show', 'INVESTA-PRL-2026-ITE-LPT-007'));
});

test('assets must be filed under an item type, not a main category', function () {
    $itDevices = Category::query()->where('code', 'ITE')->firstOrFail();

    $this->actingAs($this->secretary)->post(route('assets.store'), [
        'category_id' => $itDevices->id,
        'name' => 'Laptop baru',
        'purchased_on' => now()->toDateString(),
        'purchase_price' => 1000,
    ])->assertSessionHasErrors('category_id');
});

test('a new item type cannot reuse another code', function () {
    $itDevices = Category::query()->where('code', 'ITE')->firstOrFail();

    $this->actingAs($this->secretary)->post(route('assets.store'), [
        'new_category' => '1',
        'category_parent_id' => $itDevices->id,
        'category_name' => 'Laptop lain',
        'category_code' => 'PRT',
        'name' => 'Laptop baru',
        'purchased_on' => now()->toDateString(),
        'purchase_price' => 1000,
    ])->assertSessionHasErrors('category_code');
});

test('serial numbers must be unique', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.store'), [
            'category_id' => $this->laptopCategory->id,
            'name' => 'Laptop dobel',
            'serial_number' => 'PF4M7Q9X',
            'purchased_on' => now()->toDateString(),
            'purchase_price' => 1000,
        ])
        ->assertSessionHasErrors('serial_number');
});

test('an available asset can be handed to an employee', function () {
    $employee = Employee::query()->where('name', 'Fajar Nugroho')->firstOrFail();

    $this->actingAs($this->secretary)
        ->post(route('assets.assign', 'INVESTA-PRL-2025-ITE-LPT-004'), [
            'holder_type' => 'employee',
            'holder_id' => $employee->id,
            'condition' => 'Baik',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect()
        ->assertInertiaFlash('toast.type', 'success');

    $asset = findAsset('INVESTA-PRL-2025-ITE-LPT-004');

    expect($asset->status)->toBe(AssetStatus::Dipakai)
        ->and($asset->holder->is($employee))->toBeTrue();
});

test('an asset in use can be moved to a room in one step', function () {
    $room = Room::query()->where('name', 'Ruang Marketing')->firstOrFail();
    $before = findAsset('INVESTA-PRL-2025-ITE-LPT-003')->histories()->count();

    $this->actingAs($this->secretary)
        ->post(route('assets.assign', 'INVESTA-PRL-2025-ITE-LPT-003'), [
            'holder_type' => 'room',
            'holder_id' => $room->id,
            'condition' => 'Baik',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    $asset = findAsset('INVESTA-PRL-2025-ITE-LPT-003');
    $latest = $asset->histories()->latest('id')->take(2)->get();

    expect($asset->holder->is($room))->toBeTrue()
        ->and($asset->histories()->count())->toBe($before + 2)
        ->and($latest[1]->type)->toBe(AssetHistoryType::Pengembalian)
        ->and($latest[1]->holder->name)->toBe('Budi Santoso')
        ->and($latest[0]->type)->toBe(AssetHistoryType::Penyerahan);

    $this->get(route('assets.show', 'INVESTA-PRL-2025-ITE-LPT-003'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('asset.holder.type', 'room')
            ->where('holderSince', now()->toDateString())
        );
});

test('inactive employees cannot receive assets', function () {
    $employee = Employee::query()->where('name', 'Fajar Nugroho')->firstOrFail();
    $employee->update(['is_active' => false]);

    $this->actingAs($this->secretary)
        ->post(route('assets.assign', 'INVESTA-PRL-2025-ITE-LPT-004'), [
            'holder_type' => 'employee',
            'holder_id' => $employee->id,
            'condition' => 'Baik',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('holder_id');
});

test('a broken return marks the asset as broken', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.return', 'INVESTA-PRL-2025-ITE-LPT-003'), [
            'condition' => 'Rusak',
            'notes' => 'Layar retak',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    $asset = findAsset('INVESTA-PRL-2025-ITE-LPT-003');

    expect($asset->status)->toBe(AssetStatus::Rusak)
        ->and($asset->holder_id)->toBeNull();
});

test('an asset in use cannot be sent to service directly', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.service', 'INVESTA-PRL-2025-ITE-LPT-003'), [
            'vendor' => 'Mitra Komputer',
            'issue' => 'Lambat',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('status');

    expect(findAsset('INVESTA-PRL-2025-ITE-LPT-003')->status)->toBe(AssetStatus::Dipakai);
});

test('the service cycle records vendor and cost', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.service', 'INVESTA-PRL-2023-ITE-LPT-005'), [
            'vendor' => 'Mitra Komputer',
            'issue' => 'Ganti layar',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    expect(findAsset('INVESTA-PRL-2023-ITE-LPT-005')->status)->toBe(AssetStatus::Diperbaiki);

    $this->post(route('assets.service.complete', 'INVESTA-PRL-2023-ITE-LPT-005'), [
        'cost' => 850000,
        'condition' => 'Baik',
        'occurred_on' => now()->toDateString(),
    ])->assertRedirect();

    $asset = findAsset('INVESTA-PRL-2023-ITE-LPT-005');
    $finished = $asset->histories()->where('type', AssetHistoryType::SelesaiPerbaikan)->latest('id')->firstOrFail();

    expect($asset->status)->toBe(AssetStatus::Tersedia)
        ->and((float) $finished->cost)->toBe(850000.0)
        ->and($finished->vendor)->toBe('Mitra Komputer');
});

test('dates before the last history entry are rejected', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.return', 'INVESTA-PRL-2025-ITE-LPT-003'), [
            'condition' => 'Baik',
            'occurred_on' => '2026-03-01',
        ])
        ->assertSessionHasErrors('occurred_on');
});

test('only admins can dispose of an asset', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.dispose', 'INVESTA-PRL-2023-ITE-LPT-005'), [
            'reason' => 'Rusak total',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->post(route('assets.dispose', 'INVESTA-PRL-2023-ITE-LPT-005'), [
            'reason' => 'Rusak total',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    expect(findAsset('INVESTA-PRL-2023-ITE-LPT-005')->status)->toBe(AssetStatus::Dihapuskan);
});

test('only admins can edit an asset', function () {
    $this->actingAs($this->secretary)->get(route('assets.edit', 'INVESTA-PRL-2025-ITE-LPT-003'))->assertForbidden();

    $this->actingAs($this->admin)
        ->put(route('assets.update', 'INVESTA-PRL-2025-ITE-LPT-003'), [
            'category_id' => $this->laptopCategory->id,
            'name' => 'Laptop Lenovo ThinkPad E14 Gen 5 (Marketing)',
            'serial_number' => 'PF4M7Q9X',
            'purchased_on' => '2025-01-14',
            'purchase_price' => 12500000,
            'supplier_name' => 'mitra komputer',
            'is_depreciated' => '0',
        ])
        ->assertRedirect(route('assets.show', 'INVESTA-PRL-2025-ITE-LPT-003'));

    $asset = findAsset('INVESTA-PRL-2025-ITE-LPT-003');

    expect($asset->name)->toBe('Laptop Lenovo ThinkPad E14 Gen 5 (Marketing)')
        ->and($asset->is_depreciated)->toBeFalse()
        ->and($asset->status)->toBe(AssetStatus::Dipakai)
        ->and(Supplier::query()->where('name', 'like', '%mitra%')->count())->toBe(1);
});

test('asset detail exposes the options the dialogs need', function () {
    $this->actingAs($this->secretary)
        ->get(route('assets.show', 'INVESTA-PRL-2025-ITE-LPT-003'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canEdit', false)
            ->where('canDispose', false)
            ->has('employees', 7)
            ->has('rooms', 4)
            ->where('lastHistoryDate', '2026-03-03')
        );
});

test('an asset can be handed to a new employee with a division', function () {
    $division = Division::query()->where('name', 'IT')->firstOrFail();

    $this->actingAs($this->secretary)
        ->post(route('assets.assign', 'INVESTA-PRL-2025-ITE-LPT-004'), [
            'holder_type' => 'employee',
            'holder_id' => '',
            'new_employee_name' => 'Rizky Pratama',
            'new_employee_division_id' => $division->id,
            'condition' => 'Baik',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    $employee = Employee::query()->where('name', 'Rizky Pratama')->firstOrFail();

    expect($employee->division_id)->toBe($division->id)
        ->and(findAsset('INVESTA-PRL-2025-ITE-LPT-004')->holder->is($employee))->toBeTrue();
});

test('assigning to an employee needs an existing or new employee', function () {
    $this->actingAs($this->secretary)
        ->post(route('assets.assign', 'INVESTA-PRL-2025-ITE-LPT-004'), [
            'holder_type' => 'employee',
            'holder_id' => '',
            'new_employee_name' => '',
            'condition' => 'Baik',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('holder_id');
});

test('an employee without a division is shown without one', function () {
    $employee = Employee::factory()->create(['division_id' => null, 'name' => 'Tanpa Divisi']);

    $this->actingAs($this->secretary)
        ->post(route('assets.assign', 'INVESTA-PRL-2025-ITE-LPT-004'), [
            'holder_type' => 'employee',
            'holder_id' => $employee->id,
            'condition' => 'Baik',
            'occurred_on' => now()->toDateString(),
        ])
        ->assertRedirect();

    $this->get(route('assets.show', 'INVESTA-PRL-2025-ITE-LPT-004'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('asset.holder.name', 'Tanpa Divisi')
            ->where('asset.holder.detail', null)
        );
});

test('an asset category cannot be created as a subcategory', function () {
    $this->actingAs($this->secretary)->post(route('assets.store'), [
        'new_category' => '1',
        'category_parent_id' => $this->laptopCategory->id,
        'category_name' => 'Laptop kerja',
        'category_code' => 'ZZZ',
        'name' => 'Laptop baru',
        'purchased_on' => now()->toDateString(),
        'purchase_price' => 1000,
    ])->assertSessionHasErrors('category_parent_id');

    expect(Asset::query()->where('code', 'INV-ZZZ-001')->exists())->toBeFalse();
});
