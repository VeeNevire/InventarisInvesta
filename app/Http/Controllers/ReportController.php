<?php

namespace App\Http\Controllers;

use App\Services\InventoryReports;
use App\Support\ReportPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * The available reports, keyed by their URL slug.
     */
    public const REPORTS = ['ringkasan', 'mutasi', 'pemakaian', 'persediaan', 'aset'];

    public function index(Request $request, InventoryReports $reports): Response
    {
        $report = in_array($request->query('laporan'), self::REPORTS, true)
            ? (string) $request->query('laporan')
            : 'ringkasan';
        $period = ReportPeriod::fromRequest($request);

        return Inertia::render('reports/index', [
            'report' => $report,
            'period' => $period->toArray(),
            'today' => now()->toDateString(),
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
