<?php

use App\Models\Category;
use App\Models\Employee;
use App\Models\Item;
use App\Models\StockTransaction;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail();
    $this->admin = User::query()->where('email', 'admin@inventarisinvesta.test')->firstOrFail();
    $this->calendar = Item::query()->where('code', 'MRC-001')->firstOrFail();
});

test('forms show the preselected item', function () {
    $this->actingAs($this->secretary)
        ->get(route('transactions.outgoing.create', ['barang' => 'MRC-001']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('transactions/create')
            ->where('type', 'keluar')
            ->where('preselectedItem', 'MRC-001')
            ->has('employees', 7)
        );
});

test('incoming goods increase stock and update the average price', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [
                ['item_id' => $this->calendar->id, 'quantity' => 22, 'unit_price' => 7000],
            ],
        ])
        ->assertRedirect(route('transactions.index'))
        ->assertInertiaFlash('toast.type', 'success');

    $this->calendar->refresh();
    $transaction = StockTransaction::query()->latest('id')->firstOrFail();

    expect($this->calendar->current_stock)->toBe(100)
        ->and((float) $this->calendar->average_price)->toBe(5765.0)
        ->and($transaction->number)->toStartWith('BM-'.now()->format('ym'))
        ->and($transaction->recorded_by)->toBe($this->secretary->id);
});

test('incoming goods require the PIC name', function () {
    $transactionCount = StockTransaction::query()->count();

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1, 'unit_price' => 5000]],
        ])
        ->assertSessionHasErrors(['pic_name' => 'Tulis nama PIC yang menerima barang.']);

    expect(StockTransaction::query()->count())->toBe($transactionCount);
});

test('incoming goods require the purchase date', function () {
    $transactionCount = StockTransaction::query()->count();

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1, 'unit_price' => 5000]],
        ])
        ->assertSessionHasErrors(['purchased_on' => 'Tulis tanggal pembelian barang.']);

    expect(StockTransaction::query()->count())->toBe($transactionCount);
});

test('purchase date cannot be after the received date', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->subDay()->toDateString(),
            'purchased_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1, 'unit_price' => 5000]],
        ])
        ->assertSessionHasErrors(['purchased_on' => 'Tanggal pembelian tidak boleh setelah tanggal terima barang.']);
});

test('the typed PIC name is saved and searchable in transaction history', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => '  Siti   Aminah  ',
            'purchased_on' => now()->subDays(3)->toDateString(),
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 2, 'unit_price' => 5000]],
        ])
        ->assertRedirect(route('transactions.index'));

    $transaction = StockTransaction::query()->latest('id')->firstOrFail();

    expect($transaction->pic_name)->toBe('Siti Aminah')
        ->and($transaction->purchased_on->toDateString())->toBe(now()->subDays(3)->toDateString())
        ->and($transaction->transacted_on->toDateString())->toBe(now()->toDateString())
        ->and($transaction->recorded_by)->toBe($this->secretary->id);

    $this->get(route('transactions.index', ['search' => 'Siti']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('transactions/index')
            ->has('transactions', 1)
            ->where('transactions.0.pic_name', 'Siti Aminah')
            ->where('transactions.0.purchased_on', now()->subDays(3)->toDateString())
            ->where('transactions.0.transacted_on', now()->toDateString())
            ->where('transactions.0.recorded_by', 'Ayu Lestari')
        );
});

test('outgoing goods reduce stock and record the recipient', function () {
    $employee = Employee::query()->where('name', 'Budi Santoso')->firstOrFail();

    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->toDateString(),
            'employee_id' => $employee->id,
            'purpose' => 'Hampers klien',
            'lines' => [
                ['item_id' => $this->calendar->id, 'quantity' => 30],
            ],
        ])
        ->assertRedirect(route('transactions.index'));

    $line = $this->calendar->transactionLines()->latest('id')->firstOrFail();

    expect($this->calendar->refresh()->current_stock)->toBe(48)
        ->and($line->quantity)->toBe(-30)
        ->and($line->balance_after)->toBe(48)
        ->and($line->transaction->employee_id)->toBe($employee->id)
        ->and($line->transaction->pic_name)->toBe('Siti Aminah');
});

test('outgoing goods cannot exceed the remaining stock', function () {
    $employee = Employee::query()->firstOrFail();
    $transactionCount = StockTransaction::query()->count();

    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->toDateString(),
            'employee_id' => $employee->id,
            'purpose' => 'Terlalu banyak',
            'lines' => [
                ['item_id' => $this->calendar->id, 'quantity' => 79],
            ],
        ])
        ->assertSessionHasErrors('lines.0.quantity');

    expect($this->calendar->refresh()->current_stock)->toBe(78)
        ->and(StockTransaction::query()->count())->toBe($transactionCount);
});

test('outgoing goods require the PIC name', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'transacted_on' => now()->toDateString(),
            'employee_id' => Employee::query()->firstOrFail()->id,
            'purpose' => 'Keperluan kantor',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1]],
        ])
        ->assertSessionHasErrors(['pic_name' => 'Tulis nama PIC yang mengeluarkan barang.']);
});

test('outgoing form requires a recipient, purpose and at least one item', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->toDateString(),
            'lines' => [],
        ])
        ->assertSessionHasErrors(['employee_id', 'purpose', 'lines']);
});

test('the same item cannot appear twice in one transaction', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->toDateString(),
            'employee_id' => Employee::query()->firstOrFail()->id,
            'purpose' => 'Dobel',
            'lines' => [
                ['item_id' => $this->calendar->id, 'quantity' => 1],
                ['item_id' => $this->calendar->id, 'quantity' => 1],
            ],
        ])
        ->assertSessionHasErrors('lines.1.item_id');
});

test('transactions cannot be dated in the future', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->addDay()->toDateString(),
            'employee_id' => Employee::query()->firstOrFail()->id,
            'purpose' => 'Besok',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1]],
        ])
        ->assertSessionHasErrors('transacted_on');
});

test('admins can cancel a transaction and stock is restored', function () {
    $transaction = StockTransaction::query()->where('number', 'BK-2611-0004')->firstOrFail();

    $this->actingAs($this->admin)
        ->post(route('transactions.cancel', $transaction->number), ['reason' => 'Salah jumlah barang'])
        ->assertRedirect();

    expect($transaction->refresh()->isCancelled())->toBeTrue()
        ->and($transaction->cancelled_by)->toBe($this->admin->id)
        ->and($this->calendar->refresh()->current_stock)->toBe(478);
});

test('secretaries cannot cancel transactions', function () {
    $transaction = StockTransaction::query()->where('number', 'BK-2611-0004')->firstOrFail();

    $this->actingAs($this->secretary)
        ->post(route('transactions.cancel', $transaction->number), ['reason' => 'Salah jumlah barang'])
        ->assertForbidden();

    expect($transaction->refresh()->isCancelled())->toBeFalse();
});

test('cancelling requires a reason', function () {
    $this->actingAs($this->admin)
        ->post(route('transactions.cancel', 'BK-2611-0004'), ['reason' => ''])
        ->assertSessionHasErrors('reason');
});

test('cancelling incoming goods that were already used out is refused', function () {
    $incoming = StockTransaction::query()->where('number', 'BM-2611-0001')->firstOrFail();

    $this->actingAs($this->admin)
        ->post(route('transactions.cancel', $incoming->number), ['reason' => 'Nota salah input'])
        ->assertSessionHasErrors('reason');

    expect($incoming->refresh()->isCancelled())->toBeFalse()
        ->and($this->calendar->refresh()->current_stock)->toBe(78);
});

test('an already cancelled transaction cannot be cancelled again', function () {
    $this->actingAs($this->admin)
        ->post(route('transactions.cancel', 'BK-2611-0002'), ['reason' => 'Batal lagi'])
        ->assertForbidden();
});

test('transaction history can be filtered by type', function () {
    $this->actingAs($this->secretary)
        ->get(route('transactions.index', ['type' => 'masuk']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('transactions/index')
            ->has('transactions', 5)
            ->where('canCancel', false)
            ->where('transactions.0.can_cancel', false)
        );
});

test('a typed supplier name reuses an existing supplier regardless of casing', function () {
    $suppliers = Supplier::query()->count();

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => '  cv cetak   prima ',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1, 'unit_price' => 5000]],
        ])
        ->assertRedirect(route('transactions.index'));

    $transaction = StockTransaction::query()->latest('id')->firstOrFail();

    expect(Supplier::query()->count())->toBe($suppliers)
        ->and($transaction->supplier->name)->toBe('CV Cetak Prima');
});

test('a new supplier name creates a supplier', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'Toko Maju Jaya',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1, 'unit_price' => 5000]],
        ])
        ->assertRedirect(route('transactions.index'));

    expect(Supplier::query()->where('name', 'Toko Maju Jaya')->exists())->toBeTrue();
});

test('the receipt photo is stored privately and shown to signed-in users', function () {
    Storage::fake('local');

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'receipt' => UploadedFile::fake()->image('nota.jpg', 800, 1200),
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 5, 'unit_price' => 5000]],
        ])
        ->assertRedirect(route('transactions.index'));

    $transaction = StockTransaction::query()->latest('id')->firstOrFail();

    Storage::disk('local')->assertExists($transaction->receipt_path);

    $this->get(route('transactions.receipt', $transaction->number))->assertOk();

    auth()->logout();

    $this->get(route('transactions.receipt', $transaction->number))->assertRedirect(route('login'));
});

test('the receipt must be an image', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'receipt' => UploadedFile::fake()->create('nota.pdf', 100, 'application/pdf'),
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 5, 'unit_price' => 5000]],
        ])
        ->assertSessionHasErrors('receipt');
});

test('a new item can be created while recording incoming goods', function () {
    $merchandise = Category::query()->where('code', 'MRC')->firstOrFail();

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [
                [
                    'new_item' => [
                        'name' => 'Kalender Meja 2028',
                        'variant' => 'Meja',
                        'category_id' => $merchandise->id,
                        'unit' => 'PCS',
                        'location' => 'Rak A5',
                        'minimum_stock' => 50,
                    ],
                    'quantity' => 300,
                    'unit_price' => 6500,
                ],
                ['item_id' => $this->calendar->id, 'quantity' => 10, 'unit_price' => 5000],
            ],
        ])
        ->assertRedirect(route('transactions.index'));

    $item = Item::query()->where('name', 'Kalender Meja 2028')->firstOrFail();

    expect($item->code)->toBe('MRC-007')
        ->and($item->unit)->toBe('pcs')
        ->and($item->minimum_stock)->toBe(50)
        ->and($item->current_stock)->toBe(300)
        ->and((float) $item->average_price)->toBe(6500.0)
        ->and($this->calendar->refresh()->current_stock)->toBe(88);
});

test('a new item that already exists is rejected', function () {
    $items = Item::query()->count();

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [[
                'new_item' => [
                    'name' => 'kalender meja 2027',
                    'variant' => 'meja',
                    'category_id' => Category::query()->where('code', 'MRC')->value('id'),
                    'unit' => 'pcs',
                ],
                'quantity' => 1,
                'unit_price' => 1000,
            ]],
        ])
        ->assertSessionHasErrors('lines.0.new_item.name');

    expect(Item::query()->count())->toBe($items);
});

test('a new item needs a name, category and unit', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [['new_item' => ['name' => ''], 'quantity' => 1, 'unit_price' => 1000]],
        ])
        ->assertSessionHasErrors(['lines.0.new_item.name', 'lines.0.new_item.category_id', 'lines.0.new_item.unit']);
});

test('a photo can be attached to a new item while recording incoming goods', function () {
    Storage::fake('public');

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [[
                'new_item' => [
                    'name' => 'Payung Logo',
                    'category_id' => Category::query()->where('code', 'MRC')->value('id'),
                    'unit' => 'pcs',
                ],
                'quantity' => 20,
                'unit_price' => 35000,
                'photo' => UploadedFile::fake()->image('payung.jpg'),
            ]],
        ])
        ->assertRedirect(route('transactions.index'));

    $item = Item::query()->where('name', 'Payung Logo')->firstOrFail();

    expect($item->image_path)->not->toBeNull();
    Storage::disk('public')->assertExists($item->image_path);
});

test('an existing item without a photo gets one from incoming goods', function () {
    Storage::fake('public');

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [[
                'item_id' => $this->calendar->id,
                'quantity' => 5,
                'unit_price' => 5000,
                'photo' => UploadedFile::fake()->image('kalender.png'),
            ]],
        ])
        ->assertRedirect(route('transactions.index'));

    Storage::disk('public')->assertExists($this->calendar->refresh()->image_path);
});

test('an existing item photo is not replaced from incoming goods', function () {
    Storage::fake('public');
    $this->calendar->update(['image_path' => 'items/lama.jpg']);

    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [[
                'item_id' => $this->calendar->id,
                'quantity' => 5,
                'unit_price' => 5000,
                'photo' => UploadedFile::fake()->image('baru.png'),
            ]],
        ])
        ->assertRedirect(route('transactions.index'));

    expect($this->calendar->refresh()->image_path)->toBe('items/lama.jpg')
        ->and(Storage::disk('public')->allFiles('items'))->toBe([]);
});

test('an item photo must be an image', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.incoming.store'), [
            'transacted_on' => now()->toDateString(),
            'supplier_name' => 'CV Cetak Prima',
            'pic_name' => 'Ayu Lestari',
            'purchased_on' => now()->toDateString(),
            'lines' => [[
                'item_id' => $this->calendar->id,
                'quantity' => 5,
                'unit_price' => 5000,
                'photo' => UploadedFile::fake()->create('foto.pdf', 50, 'application/pdf'),
            ]],
        ])
        ->assertSessionHasErrors('lines.0.photo');
});

test('a new employee can be added while recording outgoing goods', function () {
    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->toDateString(),
            'new_employee_name' => '  Tono   Sugiarto ',
            'purpose' => 'Perlengkapan karyawan baru',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1]],
        ])
        ->assertRedirect(route('transactions.index'));

    $employee = Employee::query()->where('name', 'Tono Sugiarto')->firstOrFail();
    $transaction = StockTransaction::query()->latest('id')->firstOrFail();

    expect($employee->division_id)->toBeNull()
        ->and($employee->is_active)->toBeTrue()
        ->and($transaction->employee_id)->toBe($employee->id);

    $this->get(route('transactions.index'))
        ->assertInertia(fn (Assert $page) => $page->where('transactions.0.counterpart', 'Tono Sugiarto'));
});

test('a typed employee name reuses an existing employee', function () {
    $employees = Employee::query()->count();

    $this->actingAs($this->secretary)
        ->post(route('transactions.outgoing.store'), [
            'pic_name' => '  Siti   Aminah  ',
            'transacted_on' => now()->toDateString(),
            'new_employee_name' => 'budi santoso',
            'purpose' => 'Klien',
            'lines' => [['item_id' => $this->calendar->id, 'quantity' => 1]],
        ])
        ->assertRedirect(route('transactions.index'));

    expect(Employee::query()->count())->toBe($employees)
        ->and(StockTransaction::query()->latest('id')->first()->employee->name)->toBe('Budi Santoso');
});
