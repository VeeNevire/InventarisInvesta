<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\Item;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * Options shared by the incoming and outgoing transaction forms.
 */
class TransactionFormOptions
{
    /**
     * Names allowed as PIC: active employees and application users.
     *
     * @return array<int, string>
     */
    public function pics(): array
    {
        return Employee::query()->where('is_active', true)->pluck('name')
            ->merge(User::query()->pluck('name'))
            ->unique()
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * Every consumable item with the figures the form needs to validate and
     * prefill a line.
     *
     * @return array<int, array{id: int, code: string, name: string, variant: string|null, unit: string, category: string, current_stock: int, minimum_stock: int, average_price: float, image_url: string|null}>
     */
    public function items(): array
    {
        return Item::query()
            ->with('category')
            ->orderBy('name')
            ->orderBy('variant')
            ->get()
            ->map(fn (Item $item): array => [
                'id' => $item->id,
                'code' => $item->code,
                'name' => $item->name,
                'variant' => $item->variant,
                'unit' => $item->unit,
                'category' => $item->category->name,
                'current_stock' => $item->current_stock,
                'minimum_stock' => $item->minimum_stock,
                'average_price' => (float) $item->average_price,
                'image_url' => $item->image_path ? Storage::disk('public')->url($item->image_path) : null,
            ])
            ->values()
            ->all();
    }
}
