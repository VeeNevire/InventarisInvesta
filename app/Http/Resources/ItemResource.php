<?php

namespace App\Http\Resources;

use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Item
 */
class ItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->stockStatus();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'variant' => $this->variant,
            'unit' => $this->unit,
            'location' => $this->location,
            'minimum_stock' => $this->minimum_stock,
            'notify_low_stock' => $this->notify_low_stock,
            'current_stock' => $this->current_stock,
            'average_price' => (float) $this->average_price,
            'stock_value' => $this->stockValue(),
            'status' => ['value' => $status->value, 'label' => $status->label()],
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'description' => $this->description,
            'category' => $this->whenLoaded('category', fn () => [
                'code' => $this->category->code,
                'name' => $this->category->name,
                'parent_name' => $this->category->relationLoaded('parent') ? $this->category->parent?->name : null,
            ]),
        ];
    }
}
