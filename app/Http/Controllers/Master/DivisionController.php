<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\SaveDivisionRequest;
use App\Models\Division;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DivisionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('master/divisions', [
            'divisions' => Division::query()
                ->withCount('employees')
                ->orderBy('name')
                ->get()
                ->map(fn (Division $division): array => [
                    'id' => $division->id,
                    'name' => $division->name,
                    'employees_count' => $division->employees_count,
                    'can_delete' => $division->employees_count === 0,
                ]),
        ]);
    }

    public function store(SaveDivisionRequest $request): RedirectResponse
    {
        $division = Division::query()->create($request->validated());

        $this->toast("Divisi {$division->name} ditambahkan.");

        return back();
    }

    public function update(SaveDivisionRequest $request, Division $division): RedirectResponse
    {
        $division->update($request->validated());

        $this->toast("Divisi {$division->name} diperbarui.");

        return back();
    }

    public function destroy(Division $division): RedirectResponse
    {
        if ($division->employees()->exists()) {
            $this->toast("Divisi {$division->name} masih punya karyawan, jadi tidak bisa dihapus.", 'error');

            return back();
        }

        $division->delete();
        $this->toast("Divisi {$division->name} dihapus.");

        return back();
    }
}
