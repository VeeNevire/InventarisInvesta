<?php

namespace App\Http\Resources;

use App\Models\Asset;
use App\Models\Employee;
use App\Models\Room;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Asset
 */
class AssetResource extends JsonResource
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
            'code' => $this->code,
            'name' => $this->name,
            'brand' => $this->brand,
            'model' => $this->model,
            'serial_number' => $this->serial_number,
            'specification' => $this->specification,
            'purchased_on' => $this->purchased_on?->toDateString(),
            'purchase_price' => (float) $this->purchase_price,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'condition' => $this->condition,
            'holder' => $this->whenLoaded('holder', fn () => self::holderData($this->holder)),
            'is_depreciated' => $this->is_depreciated,
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'category' => $this->whenLoaded('category', fn () => [
                'code' => $this->category->code,
                'name' => $this->category->name,
                'parent_name' => $this->category->relationLoaded('parent') ? $this->category->parent?->name : null,
            ]),
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier?->name),
        ];
    }

    /**
     * Normalise an employee or room holder for the frontend.
     *
     * @return array{type: string, name: string, detail: string|null}|null
     */
    public static function holderData(?Model $holder): ?array
    {
        return match (true) {
            $holder instanceof Employee => [
                'type' => 'employee',
                'name' => $holder->name,
                'detail' => $holder->division?->name,
            ],
            $holder instanceof Room => [
                'type' => 'room',
                'name' => $holder->name,
                'detail' => $holder->floor,
            ],
            default => null,
        };
    }
}
