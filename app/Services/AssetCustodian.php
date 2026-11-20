<?php

namespace App\Services;

use App\Enums\AssetHistoryType;
use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\Employee;
use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Moves an asset between holders and states, writing one history entry for
 * every step so the asset's trail stays complete.
 *
 * Allowed moves:
 *  - Tersedia  → Dipakai     (assign)
 *  - Dipakai   → Dipakai     (assign to someone else: return + hand over)
 *  - Dipakai   → Tersedia / Rusak (return)
 *  - Tersedia / Rusak → Diperbaiki (send to service)
 *  - Diperbaiki → Tersedia / Rusak (service finished)
 *  - anything but Dipakai / Diperbaiki → Dihapuskan (dispose)
 */
class AssetCustodian
{
    public const CONDITION_GOOD = 'Baik';

    public const CONDITION_NEEDS_SERVICE = 'Perlu servis';

    public const CONDITION_BROKEN = 'Rusak';

    /**
     * Hand the asset to an employee or a room. When it is already in use,
     * the current holder returns it first, on the same date.
     */
    public function assign(Asset $asset, Employee|Room $holder, string $date, string $condition, ?string $notes, ?User $recorder): void
    {
        $this->ensureStatus($asset, [AssetStatus::Tersedia, AssetStatus::Dipakai], 'Aset hanya bisa diserahkan saat tersedia atau sedang dipakai.');

        if ($asset->holder_type === $holder->getMorphClass() && $asset->holder_id === $holder->getKey()) {
            throw ValidationException::withMessages(['holder_id' => 'Aset ini sudah dipegang oleh pemegang yang sama.']);
        }

        DB::transaction(function () use ($asset, $holder, $date, $condition, $notes, $recorder): void {
            if ($asset->status === AssetStatus::Dipakai && $asset->holder_type !== null) {
                $this->record($asset, AssetHistoryType::Pengembalian, $date, $recorder, [
                    'holder_type' => $asset->holder_type,
                    'holder_id' => $asset->holder_id,
                    'condition' => $condition,
                    'notes' => 'Dipindahkan ke '.$holder->getAttribute('name'),
                ]);
            }

            $this->record($asset, AssetHistoryType::Penyerahan, $date, $recorder, [
                'holder_type' => $holder->getMorphClass(),
                'holder_id' => $holder->getKey(),
                'condition' => $condition,
                'notes' => $notes,
            ]);

            $asset->update([
                'status' => AssetStatus::Dipakai,
                'condition' => $condition,
                'holder_type' => $holder->getMorphClass(),
                'holder_id' => $holder->getKey(),
            ]);
        });
    }

    /**
     * Take the asset back from its holder. A broken asset becomes "Rusak",
     * anything else returns to storage.
     */
    public function return(Asset $asset, string $date, string $condition, ?string $notes, ?User $recorder): void
    {
        $this->ensureStatus($asset, [AssetStatus::Dipakai], 'Hanya aset yang sedang dipakai yang bisa dikembalikan.');

        DB::transaction(function () use ($asset, $date, $condition, $notes, $recorder): void {
            $this->record($asset, AssetHistoryType::Pengembalian, $date, $recorder, [
                'holder_type' => $asset->holder_type,
                'holder_id' => $asset->holder_id,
                'condition' => $condition,
                'notes' => $notes,
            ]);

            $asset->update([
                'status' => $condition === self::CONDITION_BROKEN ? AssetStatus::Rusak : AssetStatus::Tersedia,
                'condition' => $condition,
                'holder_type' => null,
                'holder_id' => null,
            ]);
        });
    }

    public function sendToService(Asset $asset, string $date, string $vendor, string $issue, ?User $recorder): void
    {
        $this->ensureStatus($asset, [AssetStatus::Tersedia, AssetStatus::Rusak], 'Kembalikan aset dulu sebelum dikirim servis.');

        DB::transaction(function () use ($asset, $date, $vendor, $issue, $recorder): void {
            $this->record($asset, AssetHistoryType::Perbaikan, $date, $recorder, [
                'vendor' => $vendor,
                'notes' => $issue,
            ]);

            $asset->update([
                'status' => AssetStatus::Diperbaiki,
                'condition' => self::CONDITION_NEEDS_SERVICE,
            ]);
        });
    }

    public function completeService(Asset $asset, string $date, float $cost, string $condition, ?string $notes, ?User $recorder): void
    {
        $this->ensureStatus($asset, [AssetStatus::Diperbaiki], 'Aset ini tidak sedang diservis.');

        DB::transaction(function () use ($asset, $date, $cost, $condition, $notes, $recorder): void {
            $vendor = $asset->histories()
                ->where('type', AssetHistoryType::Perbaikan)
                ->latest('occurred_on')
                ->latest('id')
                ->value('vendor');

            $this->record($asset, AssetHistoryType::SelesaiPerbaikan, $date, $recorder, [
                'vendor' => $vendor,
                'cost' => $cost,
                'condition' => $condition,
                'notes' => $notes,
            ]);

            $asset->update([
                'status' => $condition === self::CONDITION_BROKEN ? AssetStatus::Rusak : AssetStatus::Tersedia,
                'condition' => $condition,
            ]);
        });
    }

    public function dispose(Asset $asset, string $date, string $reason, ?User $recorder): void
    {
        $this->ensureStatus($asset, [AssetStatus::Tersedia, AssetStatus::Rusak], 'Kembalikan atau selesaikan servis aset dulu sebelum dihapuskan.');

        DB::transaction(function () use ($asset, $date, $reason, $recorder): void {
            $this->record($asset, AssetHistoryType::Penghapusan, $date, $recorder, [
                'condition' => $asset->condition,
                'notes' => $reason,
            ]);

            $asset->update(['status' => AssetStatus::Dihapuskan]);
        });
    }

    /**
     * @param  list<AssetStatus>  $allowed
     *
     * @throws ValidationException
     */
    private function ensureStatus(Asset $asset, array $allowed, string $message): void
    {
        if (! in_array($asset->status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function record(Asset $asset, AssetHistoryType $type, string $date, ?User $recorder, array $attributes): void
    {
        $asset->histories()->create([
            ...$attributes,
            'type' => $type,
            'occurred_on' => $date,
            'recorded_by' => $recorder?->id,
        ]);
    }
}
