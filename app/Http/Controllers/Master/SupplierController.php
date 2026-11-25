<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\SaveSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('master/suppliers', [
            'suppliers' => Supplier::query()
                ->withCount(['transactions', 'assets'])
                ->withMax('transactions', 'transacted_on')
                ->orderBy('name')
                ->get()
                ->map(fn (Supplier $supplier): array => [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'phone' => $supplier->phone,
                    'address' => $supplier->address,
                    'transactions_count' => $supplier->transactions_count,
                    'last_transaction_on' => $supplier->getAttribute('transactions_max_transacted_on')
                        ? substr((string) $supplier->getAttribute('transactions_max_transacted_on'), 0, 10)
                        : null,
                    'can_delete' => $supplier->transactions_count === 0 && $supplier->assets_count === 0,
                ]),
        ]);
    }

    public function store(SaveSupplierRequest $request): RedirectResponse
    {
        $supplier = Supplier::query()->create($request->validated());

        $this->toast("Supplier {$supplier->name} ditambahkan.");

        return back();
    }

    public function update(SaveSupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        $this->toast("Supplier {$supplier->name} diperbarui.");

        return back();
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        if ($supplier->transactions()->exists() || $supplier->assets()->exists()) {
            $this->toast("Supplier {$supplier->name} sudah dipakai di transaksi atau peralatan, jadi tidak bisa dihapus.", 'error');

            return back();
        }

        $supplier->delete();
        $this->toast("Supplier {$supplier->name} dihapus.");

        return back();
    }
}
