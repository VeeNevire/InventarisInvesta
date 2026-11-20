<?php

namespace App\Http\Resources;

use App\Models\StockTransaction;
use App\Models\StockTransactionLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockTransaction
 */
class StockTransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'type' => ['value' => $this->type->value, 'label' => $this->type->label()],
            'transacted_on' => $this->transacted_on->toDateString(),
            'purchased_on' => $this->purchased_on?->toDateString(),
            'counterpart' => $this->counterpart(),
            'pic_name' => $this->pic_name,
            'purpose' => $this->purpose ?? $this->notes,
            'reference' => $this->reference,
            'receipt_url' => $this->receipt_path ? route('transactions.receipt', $this->number, absolute: false) : null,
            'notes' => $this->notes,
            'is_cancelled' => $this->isCancelled(),
            'cancellation_reason' => $this->cancellation_reason,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'recorded_by' => $this->whenLoaded('recorder', fn () => $this->recorder?->name),
            'cancelled_by' => $this->whenLoaded('canceller', fn () => $this->canceller?->name),
            'can_cancel' => $request->user()?->can('cancel', $this->resource) ?? false,
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn (StockTransactionLine $line) => [
                'item_code' => $line->item->code,
                'item_name' => trim($line->item->name.' '.($line->item->variant ?? '')),
                'unit' => $line->item->unit,
                'quantity' => $line->quantity,
                'unit_price' => (float) $line->unit_price,
            ])),
        ];
    }

    /**
     * Who the goods came from or went to.
     */
    private function counterpart(): ?string
    {
        if ($this->employee) {
            return $this->employee->displayName();
        }

        return $this->supplier?->name;
    }
}
