<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\SaveRoomRequest;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('master/rooms', [
            'rooms' => Room::query()
                ->withCount(['heldAssets', 'assetHistories'])
                ->orderBy('name')
                ->get()
                ->map(fn (Room $room): array => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'floor' => $room->floor,
                    'held_assets_count' => $room->held_assets_count,
                    'can_delete' => $room->held_assets_count === 0 && $room->asset_histories_count === 0,
                ]),
        ]);
    }

    public function store(SaveRoomRequest $request): RedirectResponse
    {
        $room = Room::query()->create($request->validated());

        $this->toast("{$room->name} ditambahkan.");

        return back();
    }

    public function update(SaveRoomRequest $request, Room $room): RedirectResponse
    {
        $room->update($request->validated());

        $this->toast("{$room->name} diperbarui.");

        return back();
    }

    public function destroy(Room $room): RedirectResponse
    {
        if ($room->heldAssets()->exists() || $room->assetHistories()->exists()) {
            $this->toast("{$room->name} sudah tercatat di riwayat aset, jadi tidak bisa dihapus.", 'error');

            return back();
        }

        $room->delete();
        $this->toast("{$room->name} dihapus.");

        return back();
    }
}
