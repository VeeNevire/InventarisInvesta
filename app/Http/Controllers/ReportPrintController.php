<?php

namespace App\Http\Controllers;

use App\Services\InventoryReports;
use App\Support\ReportPeriod;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class ReportPrintController extends Controller
{
    /**
     * Titles of the printable reports, keyed by their URL slug.
     */
    private const TITLES = [
        'ringkasan' => 'Ringkasan Gudang',
        'mutasi' => 'Laporan Mutasi Barang',
        'pemakaian' => 'Laporan Pemakaian Barang per Divisi',
        'persediaan' => 'Laporan Nilai Perlengkapan',
        'aset' => 'Laporan Peralatan per Pemegang',
    ];

    /**
     * A print-ready A4 document of a report, opened in its own tab and sent
     * straight to the browser's print dialog (where it can be saved as PDF).
     */
    public function __invoke(Request $request, string $report, InventoryReports $reports): View
    {
        abort_unless(isset(self::TITLES[$report]), 404);

        $period = ReportPeriod::fromRequest($request);
        $usesPeriod = in_array($report, ['ringkasan', 'mutasi', 'pemakaian'], true);

        return view('reports.print', [
            'report' => $report,
            'title' => self::TITLES[$report],
            'period' => $period,
            'usesPeriod' => $usesPeriod,
            'printedAt' => now()->locale('id'),
            'printedBy' => $request->user()?->name,
            'landscape' => $report === 'mutasi',
            'data' => match ($report) {
                'mutasi' => ['rows' => $reports->stockMovement($period->from, $period->to)],
                'pemakaian' => $reports->usage($period->from, $period->to),
                'persediaan' => $reports->inventoryValue(),
                'aset' => $reports->assetsByHolder(),
                default => [
                    'summary' => $reports->summary($period->from, $period->to),
                    'usage' => $reports->usage($period->from, $period->to),
                ],
            },
        ]);
    }
}
