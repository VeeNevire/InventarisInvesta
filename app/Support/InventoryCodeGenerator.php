<?php

namespace App\Support;

use App\Models\Category;
use Illuminate\Database\Eloquent\Model;

/**
 * Builds office inventory codes: INVESTA-{module}-{year}-{category}-{type}-{sequence},
 * e.g. INVESTA-PRL-2025-ITE-LPT-001. The sequence keeps counting per category
 * and item type across years.
 */
abstract class InventoryCodeGenerator
{
    /**
     * Module segment of the code, e.g. PRL or PLK.
     */
    abstract protected function module(): string;

    /**
     * @return class-string<Model>
     */
    abstract protected function model(): string;

    public function next(Category $itemType, ?int $year = null): string
    {
        return $this->format($itemType, $year ?? (int) now()->year, $this->nextSequence($itemType));
    }

    public function format(Category $itemType, int $year, int $sequence): string
    {
        return implode('-', [
            'INVESTA',
            $this->module(),
            $year,
            $this->typePath($itemType),
            str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
        ]);
    }

    public function nextSequence(Category $itemType): int
    {
        $typePath = $this->typePath($itemType);
        $pattern = '/^INVESTA-'.$this->module().'-\d{4}-'.preg_quote($typePath, '/').'-(\d+)$/';

        $highest = $this->model()::query()
            ->where('code', 'like', 'INVESTA-'.$this->module().'-%-'.$typePath.'-%')
            ->pluck('code')
            ->map(fn (string $code): int => preg_match($pattern, $code, $matches) === 1 ? (int) $matches[1] : 0)
            ->max() ?? 0;

        return $highest + 1;
    }

    /**
     * Category code followed by the item type code, e.g. ITE-LPT.
     */
    public function typePath(Category $itemType): string
    {
        $itemType->loadMissing('parent');

        return $itemType->parent
            ? $itemType->parent->code.'-'.$itemType->code
            : $itemType->code;
    }
}
