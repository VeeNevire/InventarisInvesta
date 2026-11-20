<?php

namespace App\Http\Resources;

use App\Models\AssetHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AssetHistory
 */
class AssetHistoryResource extends JsonResource
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
            'type' => ['value' => $this->type->value, 'label' => $this->type->label()],
            'occurred_on' => $this->occurred_on->toDateString(),
            'holder' => AssetResource::holderData($this->holder),
            'condition' => $this->condition,
            'vendor' => $this->vendor,
            'cost' => $this->cost !== null ? (float) $this->cost : null,
            'notes' => $this->notes,
        ];
    }
}
