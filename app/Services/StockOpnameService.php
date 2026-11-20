<?php

namespace App\Services;

use App\Enums\StockOpnameStatus;
use App\Enums\StockTransactionType;
use App\Models\Category;
use App\Models\Item;
use App\Models\StockOpname;
use App\Models\StockOpnameLine;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Runs a stock count: start a draft sheet, save counts as they come in, then
 * complete it so every difference is booked as one adjustment transaction.
 */
class StockOpnameService
{
    public function __construct(private StockLedger $ledger) {}

    /**
     * Start a count sheet for every item, or only the items of one category.
     */
    public function start(?Category $category, string $countedOn, ?string $notes, ?User $user): StockOpname
    {
        return DB::transaction(function () use ($category, $countedOn, $notes, $user): StockOpname {
            $opname = StockOpname::query()->create([
                'number' => $this->nextNumber(CarbonImmutable::parse($countedOn)),
                'counted_on' => $countedOn,
                'category_id' => $category?->id,
                'status' => StockOpnameStatus::Draf,
                'notes' => $notes,
                'created_by' => $user?->id,
            ]);

            Item::query()
                ->when($category, fn ($query, Category $category) => $query->where('category_id', $category->id))
                ->orderBy('location')
                ->orderBy('name')
                ->orderBy('variant')
                ->pluck('id')
                ->each(fn (int $itemId) => $opname->lines()->create(['item_id' => $itemId]));

            return $opname;
        });
    }

    /**
     * Store counts and reasons on a draft. Lines not mentioned are left as they are.
     *
     * @param  array<int, array{id: int|string, counted_stock?: int|string|null, reason?: string|null}>  $lines
     */
    public function saveCounts(StockOpname $opname, array $lines): void
    {
        $this->ensureDraft($opname);

        DB::transaction(function () use ($opname, $lines): void {
            foreach ($lines as $line) {
                $counted = $line['counted_stock'] ?? null;

                $opname->lines()->whereKey($line['id'])->update([
                    'counted_stock' => $counted === null || $counted === '' ? null : (int) $counted,
                    'reason' => filled($line['reason'] ?? null) ? trim((string) $line['reason']) : null,
                ]);
            }
        });
    }

    /**
     * Freeze the system figures, book the differences and close the count.
     *
     * @throws ValidationException
     */
    public function complete(StockOpname $opname, ?User $user): void
    {
        $this->ensureDraft($opname);

        DB::transaction(function () use ($opname, $user): void {
            /** @var Collection<int, StockOpnameLine> $lines */
            $lines = $opname->lines()->whereNotNull('counted_stock')->with('item')->get();

            if ($lines->isEmpty()) {
                throw ValidationException::withMessages([
                    'lines' => 'Isi hasil hitung minimal satu barang sebelum menyelesaikan cek stok.',
                ]);
            }

            Item::query()->whereIn('id', $lines->pluck('item_id'))->lockForUpdate()->get();

            $adjustments = [];

            foreach ($lines as $line) {
                $item = $line->item->refresh();
                $difference = (int) $line->counted_stock - $item->current_stock;

                $line->update([
                    'system_stock' => $item->current_stock,
                    'unit_price' => $item->average_price,
                ]);

                if ($difference !== 0) {
                    $adjustments[] = [
                        'item_id' => $item->id,
                        'quantity' => $difference,
                        'note' => $line->reason,
                    ];
                }
            }

            $adjustment = $adjustments === []
                ? null
                : $this->ledger->record(
                    StockTransactionType::Penyesuaian,
                    [
                        'transacted_on' => now()->toDateString(),
                        'notes' => "Cek stok {$opname->number}",
                    ],
                    $adjustments,
                    $user,
                );

            $opname->update([
                'status' => StockOpnameStatus::Selesai,
                'adjustment_transaction_id' => $adjustment?->id,
                'completed_by' => $user?->id,
                'completed_at' => now(),
            ]);
        });
    }

    public function nextNumber(CarbonImmutable $date): string
    {
        $prefix = 'CEK-'.$date->format('ym').'-';

        $last = StockOpname::query()
            ->where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->value('number');

        $sequence = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @throws ValidationException
     */
    private function ensureDraft(StockOpname $opname): void
    {
        if (! $opname->isDraft()) {
            throw ValidationException::withMessages([
                'lines' => 'Cek stok ini sudah selesai dan tidak bisa diubah lagi.',
            ]);
        }
    }
}
