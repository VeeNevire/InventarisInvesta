<?php

namespace App\Http\Controllers;

use App\Services\InventoryReports;
use App\Support\ReportPeriod;
use App\Support\Spreadsheet\Sheet;
use App\Support\Spreadsheet\XlsxWriter;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportExportController extends Controller
{
    /**
     * Download a report as a styled Excel workbook: a title block, bordered
     * tables with number formats and totals, one sheet per table.
     */
    public function __invoke(Request $request, string $report, InventoryReports $reports): BinaryFileResponse
    {
        abort_unless(in_array($report, ReportController::REPORTS, true), 404);

        $period = ReportPeriod::fromRequest($request);
        $usesPeriod = in_array($report, ['ringkasan', 'mutasi', 'pemakaian'], true);
        $meta = [
            $usesPeriod
                ? 'Periode '.$this->longDate($period->from).' s.d. '.$this->longDate($period->to)
                : 'Keadaan per '.$this->longDate(CarbonImmutable::today()),
            'Dicetak '.$this->localized(CarbonImmutable::now(), 'j F Y, H.i').' oleh '.($request->user()->name ?? '—'),
        ];

        $workbook = new XlsxWriter(config('app.name'));

        foreach ($this->sheets($report, $period, $reports) as $sheet) {
            foreach ($meta as $line) {
                $sheet->subtitle($line);
            }

            $workbook->add($sheet);
        }

        $filename = sprintf(
            'laporan-%s-%s-sd-%s.xlsx',
            $report,
            $period->from->toDateString(),
            $period->to->toDateString(),
        );

        return response()
            ->download($workbook->save(), $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    /**
     * @return list<Sheet>
     */
    private function sheets(string $report, ReportPeriod $period, InventoryReports $reports): array
    {
        return match ($report) {
            'mutasi' => [$this->movementSheet($reports->stockMovement($period->from, $period->to))],
            'pemakaian' => $this->usageSheets($reports->usage($period->from, $period->to)),
            'persediaan' => $this->inventorySheets($reports->inventoryValue()),
            'aset' => $this->assetSheets($reports->assetsByHolder()),
            default => $this->summarySheets($period, $reports),
        };
    }

    /**
     * @return list<Sheet>
     */
    private function summarySheets(ReportPeriod $period, InventoryReports $reports): array
    {
        $summary = $reports->summary($period->from, $period->to);
        $usage = $reports->usage($period->from, $period->to);

        $overview = (new Sheet('Ringkasan', 'Ringkasan Gudang'))
            ->columns([['Keterangan', 38], ['Jumlah transaksi', 18, 'int'], ['Nilai', 22, 'rupiah']])
            ->row(['Barang masuk', $summary['incoming_count'], $summary['incoming_value']])
            ->row(['Barang keluar', $summary['outgoing_count'], $summary['outgoing_value']])
            ->row(['Selisih cek stok (penyesuaian)', $summary['adjustment_count'], $summary['adjustment_value']])
            ->totals(['Nilai persediaan saat ini', null, $summary['inventory_value']])
            ->note("Jumlah jenis barang: {$summary['item_count']}. Barang dengan stok kritis: {$summary['low_stock_count']}.")
            ->note('Nilai barang dihitung dengan harga rata-rata. Transaksi yang dibatalkan tidak dihitung.');

        return [
            $overview,
            $this->divisionSheet($usage, 'Per Divisi', 'Pemakaian Barang per Divisi'),
            $this->topItemsSheet($usage['top_items']),
        ];
    }

    /**
     * @param  array<int, array{code: string, name: string, category: string, unit: string, opening: int, incoming: int, outgoing: int, adjustment: int, closing: int, outgoing_value: float}>  $rows
     */
    private function movementSheet(array $rows): Sheet
    {
        $sheet = (new Sheet('Mutasi Barang', 'Laporan Mutasi Barang'))
            ->landscape()
            ->columns([
                ['No', 6, 'int'], ['Kode', 11], ['Nama barang', 34], ['Kategori', 18], ['Satuan', 9],
                ['Stok awal', 12, 'int'], ['Masuk', 11, 'int'], ['Keluar', 11, 'int'],
                ['Penyesuaian', 13, 'signed'], ['Stok akhir', 12, 'int'], ['Nilai keluar', 18, 'rupiah'],
            ]);

        foreach ($rows as $index => $row) {
            $sheet->row([
                $index + 1, $row['code'], $row['name'], $row['category'], $row['unit'],
                $row['opening'], $row['incoming'], $row['outgoing'], $row['adjustment'], $row['closing'], $row['outgoing_value'],
            ]);
        }

        return $sheet
            ->totals([
                null, 'Jumlah ('.count($rows).' barang)', null, null, null, null,
                array_sum(array_column($rows, 'incoming')),
                array_sum(array_column($rows, 'outgoing')),
                array_sum(array_column($rows, 'adjustment')),
                null,
                array_sum(array_column($rows, 'outgoing_value')),
            ])
            ->note('Stok akhir = stok awal + masuk − keluar ± penyesuaian. Jumlah tiap kolom dalam satuan masing-masing barang.');
    }

    /**
     * @param  array{divisions: array<int, array{name: string, value: float, transactions: int, employees: int}>, employees: array<int, array{name: string, division: string, value: float, transactions: int}>, top_items: array<int, array{name: string, unit: string, quantity: int, value: float}>, total: float}  $usage
     * @return list<Sheet>
     */
    private function usageSheets(array $usage): array
    {
        $employees = (new Sheet('Per Karyawan', 'Pemakaian Barang per Karyawan'))
            ->columns([['No', 6, 'int'], ['Nama karyawan', 30], ['Divisi', 20], ['Transaksi', 13, 'int'], ['Nilai barang', 20, 'rupiah'], ['Porsi', 10, 'percent']]);

        foreach ($usage['employees'] as $index => $employee) {
            $employees->row([
                $index + 1, $employee['name'], $employee['division'], $employee['transactions'], $employee['value'],
                $usage['total'] > 0 ? $employee['value'] / $usage['total'] : 0,
            ]);
        }

        $employees->totals([null, 'Total', null, array_sum(array_column($usage['employees'], 'transactions')), $usage['total'], $usage['total'] > 0 ? 1 : 0]);

        return [
            $this->divisionSheet($usage, 'Per Divisi', 'Pemakaian Barang per Divisi'),
            $employees,
            $this->topItemsSheet($usage['top_items']),
        ];
    }

    /**
     * @param  array{divisions: array<int, array{name: string, value: float, transactions: int, employees: int}>, total: float}  $usage
     */
    private function divisionSheet(array $usage, string $name, string $title): Sheet
    {
        $sheet = (new Sheet($name, $title))
            ->columns([['No', 6, 'int'], ['Divisi', 28], ['Karyawan', 12, 'int'], ['Transaksi', 13, 'int'], ['Nilai barang', 20, 'rupiah'], ['Porsi', 10, 'percent']]);

        foreach ($usage['divisions'] as $index => $division) {
            $sheet->row([
                $index + 1, $division['name'], $division['employees'], $division['transactions'], $division['value'],
                $usage['total'] > 0 ? $division['value'] / $usage['total'] : 0,
            ]);
        }

        return $sheet->totals([
            null, 'Total', null, array_sum(array_column($usage['divisions'], 'transactions')), $usage['total'], $usage['total'] > 0 ? 1 : 0,
        ]);
    }

    /**
     * @param  array<int, array{name: string, unit: string, quantity: int, value: float}>  $items
     */
    private function topItemsSheet(array $items): Sheet
    {
        $sheet = (new Sheet('Barang Terbanyak', 'Barang Paling Banyak Keluar'))
            ->columns([['No', 6, 'int'], ['Nama barang', 36], ['Jumlah keluar', 15, 'int'], ['Satuan', 10], ['Nilai', 20, 'rupiah']]);

        foreach ($items as $index => $item) {
            $sheet->row([$index + 1, $item['name'], $item['quantity'], $item['unit'], $item['value']]);
        }

        return $sheet->note('10 barang teratas berdasarkan nilai barang keluar.');
    }

    /**
     * @param  array{categories: array<int, array{name: string, items: int, value: float}>, items: array<int, array{code: string, name: string, category: string, unit: string, stock: int, average_price: float, value: float}>, total: float}  $inventory
     * @return list<Sheet>
     */
    private function inventorySheets(array $inventory): array
    {
        $categories = (new Sheet('Per Kategori', 'Nilai Persediaan per Kategori'))
            ->columns([['No', 6, 'int'], ['Kategori', 30], ['Jenis barang', 15, 'int'], ['Nilai', 22, 'rupiah'], ['Porsi', 10, 'percent']]);

        foreach ($inventory['categories'] as $index => $category) {
            $categories->row([
                $index + 1, $category['name'], $category['items'], $category['value'],
                $inventory['total'] > 0 ? $category['value'] / $inventory['total'] : 0,
            ]);
        }

        $categories->totals([null, 'Total nilai persediaan', array_sum(array_column($inventory['categories'], 'items')), $inventory['total'], 1]);

        $items = (new Sheet('Per Barang', 'Nilai Persediaan per Barang'))
            ->columns([['No', 6, 'int'], ['Kode', 11], ['Nama barang', 34], ['Kategori', 18], ['Stok', 10, 'int'], ['Satuan', 9], ['Harga rata-rata', 18, 'rupiah'], ['Nilai', 20, 'rupiah']]);

        foreach ($inventory['items'] as $index => $item) {
            $items->row([$index + 1, $item['code'], $item['name'], $item['category'], $item['stock'], $item['unit'], $item['average_price'], $item['value']]);
        }

        $items->totals([null, 'Total', null, null, null, null, null, $inventory['total']])
            ->note('Nilai = stok × harga rata-rata. Diurutkan dari nilai terbesar.');

        return [$categories, $items];
    }

    /**
     * @param  array{holders: array<int, array{type: string, name: string, detail: string|null, assets: array<int, array{code: string, name: string, category: string, since: string|null, price: float}>, value: float}>, unassigned: array<int, array{code: string, name: string, category: string, status: string, price: float}>, status_counts: array<string, int>, total_value: float}  $assets
     * @return list<Sheet>
     */
    private function assetSheets(array $assets): array
    {
        $inUse = (new Sheet('Aset Dipakai', 'Aset per Pemegang'))
            ->columns([['No', 6, 'int'], ['Kode aset', 15], ['Nama aset', 36], ['Kategori', 16], ['Sejak', 18], ['Harga perolehan', 20, 'rupiah']]);

        $counter = 0;

        foreach ($assets['holders'] as $holder) {
            $label = ($holder['type'] === 'room' ? 'Ruangan: ' : 'Karyawan: ').$holder['name'].($holder['detail'] ? " ({$holder['detail']})" : '');
            $inUse->group([null, $label, null, null, count($holder['assets']).' aset', $holder['value']]);

            foreach ($holder['assets'] as $asset) {
                $inUse->row([
                    ++$counter, $asset['code'], $asset['name'], $asset['category'],
                    $asset['since'] ? $this->longDate(CarbonImmutable::parse($asset['since'])) : '—',
                    $asset['price'],
                ]);
            }
        }

        $inUse->totals([null, 'Total aset dipakai', null, null, $counter.' aset', array_sum(array_column($assets['holders'], 'value'))]);

        $unassigned = (new Sheet('Tanpa Pemegang', 'Aset Tanpa Pemegang'))
            ->columns([['No', 6, 'int'], ['Kode aset', 15], ['Nama aset', 36], ['Kategori', 16], ['Status', 16], ['Harga perolehan', 20, 'rupiah']]);

        foreach ($assets['unassigned'] as $index => $asset) {
            $unassigned->row([$index + 1, $asset['code'], $asset['name'], $asset['category'], $asset['status'], $asset['price']]);
        }

        $statusSummary = collect($assets['status_counts'])
            ->map(fn (int $count, string $label): string => "{$label} {$count}")
            ->implode(', ');

        $unassigned->totals([null, 'Total harga perolehan seluruh aset aktif', null, null, null, $assets['total_value']])
            ->note("Jumlah aset: {$statusSummary}.");

        return [$inUse, $unassigned];
    }

    private function longDate(CarbonImmutable $date): string
    {
        return $this->localized($date, 'j F Y');
    }

    /**
     * Format a date with Indonesian month names.
     */
    private function localized(CarbonImmutable $date, string $format): string
    {
        $indonesian = $date->locale('id');

        return $indonesian instanceof CarbonImmutable
            ? $indonesian->translatedFormat($format)
            : $date->format($format);
    }
}
