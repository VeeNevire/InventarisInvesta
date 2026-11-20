<?php

namespace App\Http\Controllers;

use App\Http\Requests\Asset\AssignAssetRequest;
use App\Http\Requests\Asset\CompleteAssetServiceRequest;
use App\Http\Requests\Asset\DisposeAssetRequest;
use App\Http\Requests\Asset\ReturnAssetRequest;
use App\Http\Requests\Asset\SendAssetToServiceRequest;
use App\Models\Asset;
use App\Models\Employee;
use App\Models\Room;
use App\Services\AssetCustodian;
use Illuminate\Http\RedirectResponse;

class AssetMovementController extends Controller
{
    public function __construct(private AssetCustodian $custodian) {}

    public function assign(AssignAssetRequest $request, Asset $asset): RedirectResponse
    {
        $holder = match (true) {
            $request->validated('holder_type') === 'room' => Room::query()->findOrFail($request->integer('holder_id')),
            $request->filled('holder_id') => Employee::query()->findOrFail($request->integer('holder_id')),
            default => Employee::findOrCreateByName(
                $request->string('new_employee_name')->value(),
                $request->filled('new_employee_division_id') ? $request->integer('new_employee_division_id') : null,
            ),
        };

        $wasInUse = $asset->holder_id !== null;

        $this->custodian->assign(
            $asset,
            $holder,
            $request->validated('occurred_on'),
            $request->validated('condition'),
            $request->validated('notes'),
            $request->user(),
        );

        $this->toast($wasInUse
            ? "{$asset->code} dipindahkan ke {$holder->name}."
            : "{$asset->code} diserahkan ke {$holder->name}.");

        return back();
    }

    public function returnAsset(ReturnAssetRequest $request, Asset $asset): RedirectResponse
    {
        $this->custodian->return(
            $asset,
            $request->validated('occurred_on'),
            $request->validated('condition'),
            $request->validated('notes'),
            $request->user(),
        );

        $this->toast("{$asset->code} sudah dikembalikan.");

        return back();
    }

    public function sendToService(SendAssetToServiceRequest $request, Asset $asset): RedirectResponse
    {
        $this->custodian->sendToService(
            $asset,
            $request->validated('occurred_on'),
            $request->validated('vendor'),
            $request->validated('issue'),
            $request->user(),
        );

        $this->toast("{$asset->code} dicatat sedang diservis.");

        return back();
    }

    public function completeService(CompleteAssetServiceRequest $request, Asset $asset): RedirectResponse
    {
        $this->custodian->completeService(
            $asset,
            $request->validated('occurred_on'),
            (float) $request->validated('cost'),
            $request->validated('condition'),
            $request->validated('notes'),
            $request->user(),
        );

        $this->toast("Servis {$asset->code} selesai.");

        return back();
    }

    public function dispose(DisposeAssetRequest $request, Asset $asset): RedirectResponse
    {
        $this->custodian->dispose(
            $asset,
            $request->validated('occurred_on'),
            $request->validated('reason'),
            $request->user(),
        );

        $this->toast("{$asset->code} sudah dihapuskan dari daftar aset aktif.");

        return back();
    }
}
