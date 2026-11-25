<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(DatabaseSeeder::class);
    $this->actingAs(User::query()->where('email', 'sekretaris@inventarisinvesta.test')->firstOrFail());
});

test('the summary report totals the period', function () {
    $this->get(route('reports.index', ['dari' => '2026-11-01', 'sampai' => '2026-11-18']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->where('report', 'ringkasan')
            ->where('period.from', '2026-11-01')
            ->where('data.summary.incoming_count', 2)
            ->where('data.summary.outgoing_count', 6)
            ->where('data.summary.adjustment_count', 1)
            ->where('data.summary.incoming_value', 1850000)
            ->has('data.usage.divisions', 3)
        );
});

test('the stock movement report reconciles opening and closing stock', function () {
    $this->get(route('reports.index', ['laporan' => 'mutasi', 'dari' => '2026-11-01', 'sampai' => '2026-11-18']))
        ->assertOk()
        ->assertInertia(function (Assert $page) {
            $rows = collect($page->toArray()['props']['data']['rows'])->keyBy('code');
            $calendar = $rows['INVESTA-PLK-2026-PRM-KAL-001'];

            expect($calendar['opening'])->toBe(330)
                ->and($calendar['incoming'])->toBe(200)
                ->and($calendar['outgoing'])->toBe(450)
                ->and($calendar['adjustment'])->toBe(-2)
                ->and($calendar['closing'])->toBe(78);
        });
});

test('cancelled transactions are left out of reports', function () {
    $this->get(route('reports.index', ['laporan' => 'mutasi', 'dari' => '2026-11-07', 'sampai' => '2026-11-07']))
        ->assertInertia(function (Assert $page) {
            $calendar = collect($page->toArray()['props']['data']['rows'])->firstWhere('code', 'INVESTA-PLK-2026-PRM-KAL-001');

            expect($calendar['outgoing'])->toBe(10);
        });
});

test('the usage report groups outgoing goods by division', function () {
    $this->get(route('reports.index', ['laporan' => 'pemakaian', 'dari' => '2026-11-01', 'sampai' => '2026-11-18']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('data.divisions.0.name', 'Marketing')
            ->has('data.employees', 3)
            ->has('data.top_items')
        );
});

test('the inventory and asset reports use current data', function () {
    $this->get(route('reports.index', ['laporan' => 'persediaan']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('data.items', 12)
            ->has('data.categories', 2)
        );

    $this->get(route('reports.index', ['laporan' => 'aset']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('data.holders', 6)
            ->has('data.unassigned', 4)
        );
});

test('unknown reports and future dates fall back safely', function () {
    $this->get(route('reports.index', ['laporan' => 'apa', 'dari' => 'kemarin', 'sampai' => '2999-01-01']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('report', 'ringkasan')
            ->where('period.to', now()->toDateString())
        );
});

test('reports can be downloaded as a styled excel workbook', function (string $report, array $expected) {
    $response = $this->get(route('reports.export', ['report' => $report, 'dari' => '2026-11-01', 'sampai' => '2026-11-18']));

    $response->assertOk()->assertDownload("laporan-{$report}-2026-11-01-sd-2026-11-18.xlsx");

    $zip = new ZipArchive;
    expect($zip->open($response->baseResponse->getFile()->getPathname()))->toBeTrue();

    $content = '';

    for ($index = 0; $index < $zip->numFiles; $index++) {
        $content .= $zip->getFromIndex($index);
    }

    $zip->close();

    expect($content)->toContain('Dicetak');

    foreach ($expected as $text) {
        expect($content)->toContain($text);
    }
})->with([
    'ringkasan' => ['ringkasan', ['Ringkasan Gudang', 'Pemakaian Barang per Divisi', 'Barang Paling Banyak Keluar']],
    'mutasi' => ['mutasi', ['Laporan Mutasi Barang', 'Kalender Meja 2027 Meja', 'orientation="landscape"']],
    'pemakaian' => ['pemakaian', ['Pemakaian Barang per Karyawan', 'Budi Santoso']],
    'persediaan' => ['persediaan', ['Nilai Perlengkapan per Kategori', 'Nilai Perlengkapan per Barang']],
    'aset' => ['aset', ['Karyawan: Budi Santoso', 'INVESTA-PRL-2025-ITE-LPT-003', 'Peralatan Tanpa Pemegang']],
]);

test('unknown report downloads return not found', function () {
    $this->get(route('reports.export', ['report' => 'rahasia']))->assertNotFound();
});

test('every report has a print-ready page', function (string $report, string $title) {
    $this->get(route('reports.print', ['report' => $report, 'dari' => '2026-11-01', 'sampai' => '2026-11-18']))
        ->assertOk()
        ->assertSee($title)
        ->assertSee('Dibuat oleh')
        ->assertSee('Mengetahui')
        ->assertSee('Ayu Lestari');
})->with([
    ['ringkasan', 'Ringkasan Gudang'],
    ['mutasi', 'Laporan Mutasi Barang'],
    ['pemakaian', 'Laporan Pemakaian Barang per Divisi'],
    ['persediaan', 'Laporan Nilai Perlengkapan'],
    ['aset', 'Laporan Peralatan per Pemegang'],
]);

test('the print page shows the period in words', function () {
    $this->get(route('reports.print', ['report' => 'mutasi', 'dari' => '2026-11-01', 'sampai' => '2026-11-18']))
        ->assertSee('Periode 1 November 2026 s.d. 18 November 2026')
        ->assertSee('Kalender Meja 2027 Meja');
});

test('unknown reports cannot be printed', function () {
    $this->get(route('reports.print', ['report' => 'rahasia']))->assertNotFound();
});
