<?php

namespace App\Http\Resources;

use App\Enums\StockTransactionType;
use App\Models\StockTransactionLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of an item's stock card (kartu stok).
 *
 * @mixin StockTransactionLine
 */
class StockCardEntryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $transaction = $this->transaction;

        $description = match ($transaction->type) {
            StockTransactionType::Masuk => collect([$transaction->supplier?->name, $transaction->reference])->filter()->implode(' · '),
            StockTransactionType::Keluar => collect([
                $transaction->employee?->displayName(),
                $transaction->purpose,
            ])->filter()->implode(' · '),
            StockTransactionType::Penyesuaian => collect([$transaction->notes ?? 'Penyesuaian stok', $this->note])->filter()->implode(' · '),
        };

        return [
            'id' => $this->id,
            'number' => $transaction->number,
            'type' => ['value' => $transaction->type->value, 'label' => $transaction->type->label()],
            'transacted_on' => $transaction->transacted_on->toDateString(),
            'description' => $description,
            'quantity_in' => $this->quantity > 0 ? $this->quantity : null,
            'quantity_out' => $this->quantity < 0 ? abs($this->quantity) : null,
            'unit_price' => (float) $this->unit_price,
            'balance_after' => $this->balance_after,
            'is_cancelled' => $transaction->isCancelled(),
            'cancellation_reason' => $transaction->cancellation_reason,
        ];
    }
}
