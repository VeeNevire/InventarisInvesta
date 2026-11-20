<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\SaveEmployeeRequest;
use App\Models\Division;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('master/employees', [
            'employees' => Employee::query()
                ->with('division')
                ->withCount(['transactions', 'heldAssets', 'assetHistories'])
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (Employee $employee): array => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'division_id' => $employee->division_id,
                    'division' => $employee->division?->name,
                    'position' => $employee->position,
                    'is_active' => $employee->is_active,
                    'transactions_count' => $employee->transactions_count,
                    'held_assets_count' => $employee->held_assets_count,
                    'can_delete' => $employee->transactions_count === 0 && $employee->asset_histories_count === 0,
                ]),
            'divisions' => Division::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(SaveEmployeeRequest $request): RedirectResponse
    {
        $employee = Employee::query()->create([
            ...$request->validated(),
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->toast("Karyawan {$employee->name} ditambahkan.");

        return back();
    }

    public function update(SaveEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $employee->update([
            ...$request->validated(),
            'is_active' => $request->boolean('is_active'),
        ]);

        $this->toast("Data {$employee->name} diperbarui.");

        return back();
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        if ($employee->transactions()->exists() || $employee->assetHistories()->exists()) {
            $this->toast("{$employee->name} sudah tercatat di transaksi atau riwayat aset. Nonaktifkan saja agar riwayatnya tetap ada.", 'error');

            return back();
        }

        $employee->delete();
        $this->toast("Karyawan {$employee->name} dihapus.");

        return back();
    }
}
