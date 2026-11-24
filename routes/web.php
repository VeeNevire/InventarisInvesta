<?php

use App\Http\Controllers\AssetController;
use App\Http\Controllers\AssetMovementController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CancelStockTransactionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GuidePreferenceController;
use App\Http\Controllers\IncomingTransactionController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\ItemImportController;
use App\Http\Controllers\ItemNotificationController;
use App\Http\Controllers\Master\CategoryController;
use App\Http\Controllers\Master\DivisionController;
use App\Http\Controllers\Master\EmployeeController;
use App\Http\Controllers\Master\RoomController;
use App\Http\Controllers\Master\SupplierController;
use App\Http\Controllers\Master\UserController;
use App\Http\Controllers\OutgoingTransactionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReportExportController;
use App\Http\Controllers\ReportPrintController;
use App\Http\Controllers\Settings\AccountController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\StockOpnameController;
use App\Http\Controllers\StockTransactionController;
use App\Http\Controllers\TransactionReceiptController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/masuk', [LoginController::class, 'create'])->name('login');
    Route::post('/masuk', [LoginController::class, 'store'])->name('login.store');
});

Route::middleware('auth')->group(function () {
    Route::post('/keluar', [LoginController::class, 'destroy'])->name('logout');

    Route::get('/', DashboardController::class)->name('dashboard');

    Route::middleware('can:items.create')->prefix('barang/import')->name('items.import.')->group(function () {
        Route::get('/', [ItemImportController::class, 'create'])->name('create');
        Route::get('/template', [ItemImportController::class, 'template'])->name('template');
        Route::post('/', [ItemImportController::class, 'upload'])->name('upload');
        Route::get('/{token}', [ItemImportController::class, 'show'])->whereUuid('token')->name('show');
        Route::post('/{token}', [ItemImportController::class, 'store'])->whereUuid('token')->name('store');
    });

    Route::get('/barang/baru', [ItemController::class, 'create'])->middleware('can:items.create')->name('items.create');
    Route::post('/barang', [ItemController::class, 'store'])->middleware('can:items.create')->name('items.store');
    Route::get('/barang/{item:code}/edit', [ItemController::class, 'edit'])->middleware('can:items.update')->name('items.edit');
    Route::put('/barang/{item:code}', [ItemController::class, 'update'])->middleware('can:items.update')->name('items.update');
    Route::delete('/barang/{item:code}', [ItemController::class, 'destroy'])->middleware('can:items.delete')->name('items.destroy');

    Route::get('/aset/{asset:code}/edit', [AssetController::class, 'edit'])->middleware('can:assets.update')->name('assets.edit');
    Route::put('/aset/{asset:code}', [AssetController::class, 'update'])->middleware('can:assets.update')->name('assets.update');

    Route::prefix('master')->name('master.')->group(function () {
        Route::middleware('can:master.employees')->group(function () {
            Route::resource('karyawan', EmployeeController::class)
                ->only(['index', 'store', 'update', 'destroy'])
                ->parameters(['karyawan' => 'employee'])
                ->names('employees');
            Route::resource('divisi', DivisionController::class)
                ->only(['index', 'store', 'update', 'destroy'])
                ->parameters(['divisi' => 'division'])
                ->names('divisions');
        });
        Route::middleware('can:master.places')->group(function () {
            Route::resource('ruangan', RoomController::class)
                ->only(['index', 'store', 'update', 'destroy'])
                ->parameters(['ruangan' => 'room'])
                ->names('rooms');
            Route::resource('supplier', SupplierController::class)
                ->only(['index', 'store', 'update', 'destroy'])
                ->parameters(['supplier' => 'supplier'])
                ->names('suppliers');
        });
        Route::resource('kategori', CategoryController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->parameters(['kategori' => 'category'])
            ->middleware('can:master.categories')
            ->names('categories');
        Route::resource('pengguna', UserController::class)
            ->only(['index', 'store', 'update', 'destroy'])
            ->parameters(['pengguna' => 'user'])
            ->middleware('can:manage-users')
            ->names('users');
    });

    Route::get('/barang', [ItemController::class, 'index'])->name('items.index');
    Route::get('/barang/{item:code}', [ItemController::class, 'show'])->name('items.show');
    Route::patch('/barang/{item:code}/notifikasi', [ItemNotificationController::class, 'update'])->name('items.notification.update');

    Route::get('/transaksi', [StockTransactionController::class, 'index'])->name('transactions.index');
    Route::get('/transaksi/masuk/baru', [IncomingTransactionController::class, 'create'])->name('transactions.incoming.create');
    Route::post('/transaksi/masuk', [IncomingTransactionController::class, 'store'])->name('transactions.incoming.store');
    Route::get('/transaksi/keluar/baru', [OutgoingTransactionController::class, 'create'])->name('transactions.outgoing.create');
    Route::post('/transaksi/keluar', [OutgoingTransactionController::class, 'store'])->name('transactions.outgoing.store');
    Route::get('/transaksi/{transaction:number}/nota', TransactionReceiptController::class)->name('transactions.receipt');
    Route::post('/transaksi/{transaction:number}/batal', CancelStockTransactionController::class)->name('transactions.cancel');

    Route::get('/cek-stok', [StockOpnameController::class, 'index'])->name('stock-opnames.index');
    Route::post('/cek-stok', [StockOpnameController::class, 'store'])->name('stock-opnames.store');
    Route::get('/cek-stok/{opname:number}', [StockOpnameController::class, 'show'])->name('stock-opnames.show');
    Route::put('/cek-stok/{opname:number}', [StockOpnameController::class, 'update'])->name('stock-opnames.update');
    Route::post('/cek-stok/{opname:number}/selesai', [StockOpnameController::class, 'complete'])->name('stock-opnames.complete');
    Route::delete('/cek-stok/{opname:number}', [StockOpnameController::class, 'destroy'])->name('stock-opnames.destroy');

    Route::inertia('/panduan', 'guide')->name('guide');
    Route::patch('/panduan/preferensi', GuidePreferenceController::class)->name('guide.preference');

    Route::get('/pengaturan', [AccountController::class, 'edit'])->name('settings.edit');
    Route::put('/pengaturan/profil', [AccountController::class, 'update'])->name('settings.profile.update');
    Route::put('/pengaturan/kata-sandi', PasswordController::class)->name('settings.password.update');

    Route::get('/laporan', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/laporan/{report}/unduh', ReportExportController::class)->name('reports.export');
    Route::get('/laporan/{report}/cetak', ReportPrintController::class)->name('reports.print');

    Route::get('/aset', [AssetController::class, 'index'])->name('assets.index');
    Route::get('/aset/baru', [AssetController::class, 'create'])->name('assets.create');
    Route::post('/aset', [AssetController::class, 'store'])->name('assets.store');
    Route::get('/aset/{asset:code}', [AssetController::class, 'show'])->name('assets.show');
    Route::post('/aset/{asset:code}/serahkan', [AssetMovementController::class, 'assign'])->name('assets.assign');
    Route::post('/aset/{asset:code}/kembalikan', [AssetMovementController::class, 'returnAsset'])->name('assets.return');
    Route::post('/aset/{asset:code}/servis', [AssetMovementController::class, 'sendToService'])->name('assets.service');
    Route::post('/aset/{asset:code}/servis/selesai', [AssetMovementController::class, 'completeService'])->name('assets.service.complete');
    Route::post('/aset/{asset:code}/hapuskan', [AssetMovementController::class, 'dispose'])->name('assets.dispose');
});
