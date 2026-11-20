<?php

namespace App\Http\Controllers;

use App\Enums\StockTransactionType;
use App\Http\Requests\StoreOutgoingTransactionRequest;
use App\Models\Division;
use App\Models\Employee;
use App\Services\StockLedger;
use App\Support\TransactionFormOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OutgoingTransactionController extends Controller
{
    public function create(Request $request, TransactionFormOptions $options): Response
    {
        return Inertia::render('transactions/create', [
            'type' => StockTransactionType::Keluar->value,
            'today' => now()->toDateString(),
            'items' => $options->items(),
            'preselectedItem' => $request->string('barang')->value() ?: null,
            'suppliers' => [],
            'categories' => [],
            'units' => [],
            'divisions' => Division::query()->orderBy('name')->get(['id', 'name']),
            'employees' => Employee::query()
                ->where('is_active', true)
                ->with('division')
                ->orderBy('name')
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'division' => $employee->division?->name,
                ]),
        ]);
    }

    public function store(StoreOutgoingTransactionRequest $request, StockLedger $ledger): RedirectResponse
    {
        $transaction = $ledger->record(
            StockTransactionType::Keluar,
            [
                ...$request->safe()->only(['transacted_on', 'purpose', 'notes']),
                'pic_name' => Str::squish($request->validated('pic_name')),
                'employee_id' => $request->filled('employee_id')
                    ? $request->integer('employee_id')
                    : Employee::findOrCreateByName(
                        $request->string('new_employee_name')->value(),
                        $request->filled('new_employee_division_id') ? $request->integer('new_employee_division_id') : null,
                    )->id,
            ],
            $request->validated('lines'),
            $request->user(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Barang keluar {$transaction->number} tersimpan. Stok sudah diperbarui.",
        ]);

        return to_route('transactions.index');
    }
}
