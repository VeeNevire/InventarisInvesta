<?php

namespace Database\Seeders;

use App\Enums\AssetHistoryType;
use App\Enums\AssetStatus;
use App\Enums\CategoryType;
use App\Enums\StockTransactionType;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Division;
use App\Models\Employee;
use App\Models\Item;
use App\Models\Room;
use App\Models\StockTransaction;
use App\Models\Supplier;
use App\Models\User;
use App\Services\StockLedger;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Example data for InventarisInvesta: merchandise, office supplies and assets
 * with a realistic history of stock movements.
 */
class InventorySeeder extends Seeder
{
    public function run(StockLedger $ledger): void
    {
        $admin = User::query()->where('email', 'admin@inventarisinvesta.test')->first();
        $secretary = User::query()->where('email', 'sekretaris@inventarisinvesta.test')->first();

        $itemCategories = collect([
            'MRC' => 'Merchandise',
            'ATK' => 'ATK',
            'PRM' => 'Materi Promosi',
            'KTR' => 'Perlengkapan Kantor',
        ])->map(fn (string $name, string $code) => Category::query()->create([
            'type' => CategoryType::Persediaan,
            'code' => $code,
            'name' => $name,
        ]));

        $assetCategories = collect([
            'LPT' => 'Laptop',
            'PRN' => 'Printer',
            'PRY' => 'Proyektor',
            'MON' => 'Monitor',
            'KMR' => 'Kamera',
        ])->map(fn (string $name, string $code) => Category::query()->create([
            'type' => CategoryType::Aset,
            'code' => $code,
            'name' => $name,
        ]));

        $suppliers = collect([
            'cetakPrima' => 'CV Cetak Prima',
            'sinarJaya' => 'Percetakan Sinar Jaya',
            'sumberRezeki' => 'Toko Sumber Rezeki',
            'mitraKomputer' => 'Mitra Komputer',
            'saldoAwal' => 'Saldo awal',
        ])->map(fn (string $name) => Supplier::query()->create(['name' => $name]));

        $divisions = collect(['Marketing', 'HRD', 'Sales', 'Keuangan', 'Sekretariat', 'IT'])
            ->mapWithKeys(fn (string $name) => [$name => Division::query()->create(['name' => $name])]);

        $employees = collect([
            'budi' => ['Budi Santoso', 'Marketing', 'Staf Marketing'],
            'rina' => ['Rina Kartika', 'HRD', 'Staf HRD'],
            'dimas' => ['Dimas Prakoso', 'Sales', 'Sales Executive'],
            'hendra' => ['Hendra Wijaya', 'Keuangan', 'Kepala Keuangan'],
            'sari' => ['Sari Wulandari', 'Keuangan', 'Staf Keuangan'],
            'ayu' => ['Ayu Lestari', 'Sekretariat', 'Sekretaris'],
            'fajar' => ['Fajar Nugroho', 'IT', 'Staf IT'],
        ])->map(fn (array $employee) => Employee::query()->create([
            'name' => $employee[0],
            'division_id' => $divisions[$employee[1]]->id,
            'position' => $employee[2],
        ]));

        $rooms = collect([
            'keuangan' => ['Ruang Keuangan', 'Lantai 2'],
            'rapat' => ['Ruang Rapat Utama', 'Lantai 1'],
            'marketing' => ['Ruang Marketing', 'Lantai 2'],
            'lobi' => ['Lobi', 'Lantai 1'],
        ])->map(fn (array $room) => Room::query()->create(['name' => $room[0], 'floor' => $room[1]]));

        $items = collect([
            'kalenderMeja27' => ['MRC', 'MRC-001', 'Kalender Meja 2027', 'Meja', 'pcs', 'Rak A1', 100, true],
            'kalenderDinding27' => ['MRC', 'MRC-002', 'Kalender Dinding 2027', 'Dinding', 'pcs', 'Rak A1', 100, true],
            'gantunganAkrilik' => ['MRC', 'MRC-003', 'Gantungan Kunci', 'Akrilik', 'pcs', 'Rak A2', 50, true],
            'gantunganLogam' => ['MRC', 'MRC-004', 'Gantungan Kunci', 'Logam', 'pcs', 'Rak A2', 50, true],
            'tumbler' => ['MRC', 'MRC-005', 'Tumbler Logo 500 ml', null, 'pcs', 'Rak A3', 20, true],
            'kalenderMeja26' => ['MRC', 'MRC-006', 'Kalender Meja 2026', 'Meja', 'pcs', 'Rak A4', 0, false],
            'kertasA4' => ['ATK', 'ATK-001', 'Kertas A4 80 gsm', null, 'rim', 'Rak B1', 20, false],
            'pulpen' => ['ATK', 'ATK-002', 'Pulpen Hitam', null, 'box', 'Rak B2', 5, true],
            'map' => ['ATK', 'ATK-003', 'Map Plastik Logo', null, 'pcs', 'Rak B2', 50, true],
            'brosur' => ['PRM', 'PRM-001', 'Brosur Produk 2026', null, 'lbr', 'Rak C1', 500, true],
            'xBanner' => ['PRM', 'PRM-002', 'X-Banner Logo', null, 'pcs', 'Rak C2', 2, true],
            'tinta' => ['KTR', 'KTR-001', 'Tinta Printer Hitam', null, 'botol', 'Rak D1', 4, true],
        ])->map(fn (array $item) => Item::query()->create([
            'category_id' => $itemCategories[$item[0]]->id,
            'code' => $item[1],
            'name' => $item[2],
            'variant' => $item[3],
            'unit' => $item[4],
            'location' => $item[5],
            'minimum_stock' => $item[6],
            'notify_low_stock' => $item[7],
        ]));

        $record = function (StockTransactionType $type, string $date, array $attributes, array $lines, ?string $cancelReason = null) use ($ledger, $items, $secretary, $admin): void {
            $transaction = StockTransaction::query()->create([
                'number' => $ledger->nextNumber($type, now()->parse($date)),
                'type' => $type,
                'transacted_on' => $date,
                'recorded_by' => $secretary?->id,
                'cancelled_at' => $cancelReason ? now()->parse($date)->setTime(14, 0) : null,
                'cancelled_by' => $cancelReason ? $admin?->id : null,
                'cancellation_reason' => $cancelReason,
                ...$attributes,
            ]);

            foreach ($lines as [$itemKey, $quantity, $price]) {
                $transaction->lines()->create([
                    'item_id' => $items[$itemKey]->id,
                    'quantity' => $type === StockTransactionType::Keluar ? -$quantity : $quantity,
                    'unit_price' => $price ?? 0,
                ]);
            }
        };

        $in = StockTransactionType::Masuk;
        $out = StockTransactionType::Keluar;

        $record($in, '2026-08-01', ['supplier_id' => $suppliers['saldoAwal']->id, 'reference' => 'Migrasi data awal'], [
            ['kalenderMeja26', 300, 5000], ['kertasA4', 40, 52000], ['pulpen', 12, 24000],
            ['map', 200, 2500], ['brosur', 700, 650], ['xBanner', 6, 185000],
            ['tinta', 8, 95000], ['gantunganLogam', 220, 7500], ['gantunganAkrilik', 120, 3200],
        ]);
        $record($out, '2026-08-03', ['employee_id' => $employees['rina']->id, 'purpose' => 'Hadiah karyawan'], [['kalenderMeja26', 160, null]]);
        $record($out, '2026-08-05', ['employee_id' => $employees['budi']->id, 'purpose' => 'Pameran UMKM'], [['xBanner', 2, null]]);
        $record($in, '2026-10-02', ['supplier_id' => $suppliers['cetakPrima']->id, 'reference' => 'Nota 1187'], [
            ['kalenderMeja27', 500, 5000], ['kalenderDinding27', 300, 8500],
        ]);
        $record($out, '2026-10-15', ['employee_id' => $employees['budi']->id, 'purpose' => 'Untuk klien PT Andalas'], [
            ['kalenderMeja27', 50, null], ['kalenderDinding27', 30, null], ['gantunganLogam', 40, null],
        ]);
        $record($in, '2026-10-20', ['supplier_id' => $suppliers['sumberRezeki']->id, 'reference' => 'Nota SR-559'], [['tumbler', 60, 45000]]);
        $record($out, '2026-10-28', ['employee_id' => $employees['rina']->id, 'purpose' => 'Hadiah karyawan'], [
            ['kalenderMeja27', 120, null], ['kalenderDinding27', 30, null], ['gantunganAkrilik', 85, null],
        ]);
        $record($out, '2026-11-05', ['employee_id' => $employees['dimas']->id, 'purpose' => 'Kunjungan klien'], [
            ['kalenderMeja27', 40, null], ['tumbler', 40, null], ['kertasA4', 28, null],
        ]);
        $record($out, '2026-11-07', ['employee_id' => $employees['dimas']->id, 'purpose' => 'Kunjungan klien'], [['kalenderMeja27', 100, null]], 'Jumlah salah, diinput ulang');
        $record($out, '2026-11-07', ['employee_id' => $employees['dimas']->id, 'purpose' => 'Kunjungan klien'], [['kalenderMeja27', 10, null]]);
        $record($in, '2026-11-12', ['supplier_id' => $suppliers['cetakPrima']->id, 'reference' => 'Nota 1240'], [['kalenderMeja27', 200, 6000]]);
        $record($out, '2026-11-16', ['employee_id' => $employees['budi']->id, 'purpose' => 'Pameran Expo'], [
            ['kalenderMeja27', 400, null], ['map', 50, null], ['brosur', 500, null],
        ]);
        $record($out, '2026-11-17', ['employee_id' => $employees['hendra']->id, 'purpose' => 'Operasional kantor'], [['tinta', 5, null], ['pulpen', 2, null]]);
        $record($out, '2026-11-17', ['employee_id' => $employees['budi']->id, 'purpose' => 'Hampers klien'], [['tumbler', 20, null]]);
        $record($in, '2026-11-18', ['supplier_id' => $suppliers['sinarJaya']->id, 'reference' => 'Nota SJ-882'], [['brosur', 1000, 650]]);
        $record(StockTransactionType::Penyesuaian, '2026-11-18', ['notes' => 'Cek stok: 2 pcs rusak'], [['kalenderMeja27', -2, null]]);
        $record($out, '2026-11-18', ['employee_id' => $employees['hendra']->id, 'purpose' => 'Operasional kantor'], [['pulpen', 2, null]]);

        $items->each(fn (Item $item) => $ledger->recalculate($item));

        $this->seedAssets($assetCategories, $suppliers['mitraKomputer'], $employees, $rooms, $secretary);
    }

    /**
     * @param  Collection<string, Category>  $categories
     * @param  Collection<string, Employee>  $employees
     * @param  Collection<string, Room>  $rooms
     */
    private function seedAssets($categories, Supplier $supplier, $employees, $rooms, ?User $recorder): void
    {
        $assets = [
            ['LPT', 'INV-LPT-001', 'Laptop Lenovo ThinkPad E14', 'Lenovo', 'ThinkPad E14 Gen 4', 'PF3K1A2B', 'Intel Core i5-1235U · 16 GB RAM · 512 GB SSD', '2025-01-06', 11800000, AssetStatus::Dipakai, $employees['hendra'], [48, 1000000], [
                [AssetHistoryType::Penyerahan, '2025-01-10', $employees['hendra'], 'Baik', null],
            ]],
            ['LPT', 'INV-LPT-002', 'Laptop ASUS Vivobook 14', 'ASUS', 'Vivobook 14 A1404', 'R7N0CV11', 'Intel Core i5-1335U · 8 GB RAM · 512 GB SSD', '2026-02-05', 8900000, AssetStatus::Dipakai, $employees['sari'], [48, 900000], [
                [AssetHistoryType::Penyerahan, '2026-02-11', $employees['sari'], 'Baik', 'Pengganti INV-LPT-003'],
            ]],
            ['LPT', 'INV-LPT-003', 'Laptop Lenovo ThinkPad E14 Gen 5', 'Lenovo', 'ThinkPad E14 Gen 5', 'PF4M7Q9X', 'Intel Core i5-1335U · 16 GB RAM · 512 GB SSD · layar 14" WUXGA', '2025-01-14', 12500000, AssetStatus::Dipakai, $employees['budi'], [48, 1000000], [
                [AssetHistoryType::Penyerahan, '2025-01-20', $employees['sari'], 'Baik', null],
                [AssetHistoryType::Pengembalian, '2026-02-10', $employees['sari'], 'Perlu servis', 'Beberapa tombol keyboard tidak berfungsi'],
                [AssetHistoryType::Perbaikan, '2026-02-11', null, null, 'Ganti keyboard', 'Mitra Komputer'],
                [AssetHistoryType::SelesaiPerbaikan, '2026-02-24', null, 'Baik', 'Keyboard sudah diganti', 'Mitra Komputer', 650000],
                [AssetHistoryType::Penyerahan, '2026-03-03', $employees['budi'], 'Baik', null],
            ]],
            ['LPT', 'INV-LPT-004', 'Laptop HP 240 G9', 'HP', '240 G9', '5CD3281JK', 'Intel Core i3-1215U · 8 GB RAM · 256 GB SSD', '2025-06-10', 7600000, AssetStatus::Tersedia, null, null, [
                [AssetHistoryType::Penyerahan, '2025-06-12', $employees['fajar'], 'Baik', null],
                [AssetHistoryType::Pengembalian, '2026-09-30', $employees['fajar'], 'Baik', 'Mendapat laptop baru dari divisi IT'],
            ]],
            ['LPT', 'INV-LPT-005', 'Laptop Acer Aspire 3', 'Acer', 'Aspire 3 A314', 'NXK6TSN00', 'AMD Ryzen 3 · 8 GB RAM · 256 GB SSD', '2023-08-15', 6900000, AssetStatus::Rusak, null, null, [
                [AssetHistoryType::Penyerahan, '2023-08-20', $employees['dimas'], 'Baik', null],
                [AssetHistoryType::Pengembalian, '2026-11-02', $employees['dimas'], 'Rusak', 'Layar mati total'],
            ]],
            ['PRN', 'INV-PRN-001', 'Printer Epson L3250', 'Epson', 'EcoTank L3250', 'X8KJ004512', 'Print, scan, copy · Wi-Fi', '2025-05-05', 2850000, AssetStatus::Dipakai, $rooms['keuangan'], null, [
                [AssetHistoryType::Penyerahan, '2025-05-06', $rooms['keuangan'], 'Baik', null],
            ]],
            ['PRN', 'INV-PRN-002', 'Printer Canon G2010', 'Canon', 'PIXMA G2010', 'KMQ09921', 'Print, scan, copy', '2024-11-11', 2400000, AssetStatus::Diperbaiki, null, null, [
                [AssetHistoryType::Penyerahan, '2024-11-12', $rooms['marketing'], 'Baik', null],
                [AssetHistoryType::Pengembalian, '2026-11-11', $rooms['marketing'], 'Perlu servis', 'Hasil cetak bergaris'],
                [AssetHistoryType::Perbaikan, '2026-11-12', null, null, 'Hasil cetak bergaris', 'Mitra Komputer'],
            ]],
            ['PRY', 'INV-PRY-001', 'Proyektor Epson EB-X51', 'Epson', 'EB-X51', 'X5DF220188', '3.800 lumen · XGA · HDMI', '2025-06-20', 6750000, AssetStatus::Dipakai, $rooms['rapat'], [60, 500000], [
                [AssetHistoryType::Penyerahan, '2025-06-21', $rooms['rapat'], 'Baik', null],
            ]],
            ['MON', 'INV-MON-001', 'Monitor LG 24MP400', 'LG', '24MP400-B', '305NTQD4K', '24" IPS · Full HD · 75 Hz', '2025-08-08', 1650000, AssetStatus::Dipakai, $employees['dimas'], null, [
                [AssetHistoryType::Penyerahan, '2025-08-09', $employees['dimas'], 'Baik', null],
            ]],
            ['KMR', 'INV-KMR-001', 'Kamera Canon EOS M50 Mark II', 'Canon', 'EOS M50 Mark II', '0831009921', '24,1 MP · lensa kit 15-45 mm', '2024-03-12', 9200000, AssetStatus::Tersedia, null, [48, 1500000], []],
        ];

        foreach ($assets as [$categoryCode, $code, $name, $brand, $model, $serial, $specification, $purchasedOn, $price, $status, $holder, $depreciation, $histories]) {
            $asset = Asset::query()->create([
                'category_id' => $categories[$categoryCode]->id,
                'code' => $code,
                'name' => $name,
                'brand' => $brand,
                'model' => $model,
                'serial_number' => $serial,
                'specification' => $specification,
                'purchased_on' => $purchasedOn,
                'purchase_price' => $price,
                'supplier_id' => $supplier->id,
                'status' => $status,
                'condition' => match ($status) {
                    AssetStatus::Rusak => 'Rusak',
                    AssetStatus::Diperbaiki => 'Perlu servis',
                    default => 'Baik',
                },
                'holder_type' => $holder?->getMorphClass(),
                'holder_id' => $holder?->getKey(),
                'is_depreciated' => $depreciation !== null,
                'useful_life_months' => $depreciation[0] ?? null,
                'residual_value' => $depreciation[1] ?? null,
            ]);

            $asset->histories()->create([
                'type' => AssetHistoryType::Pembelian,
                'occurred_on' => $purchasedOn,
                'vendor' => $supplier->name,
                'cost' => $price,
                'condition' => 'Baru',
                'recorded_by' => $recorder?->id,
            ]);

            foreach ($histories as $history) {
                [$type, $date, $historyHolder, $condition, $notes] = $history;

                $asset->histories()->create([
                    'type' => $type,
                    'occurred_on' => $date,
                    'holder_type' => $historyHolder?->getMorphClass(),
                    'holder_id' => $historyHolder?->getKey(),
                    'condition' => $condition,
                    'notes' => $notes,
                    'vendor' => $history[5] ?? null,
                    'cost' => $history[6] ?? null,
                    'recorded_by' => $recorder?->id,
                ]);
            }
        }
    }
}
