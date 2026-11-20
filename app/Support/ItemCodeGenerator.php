<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Item;

/**
 * Generates item codes from the category code, e.g. MRC-007.
 */
class ItemCodeGenerator
{
    public function next(Category $category): string
    {
        $prefix = $category->code.'-';

        $sequence = Item::query()
            ->where('code', 'like', $prefix.'%')
            ->pluck('code')
            ->map(fn (string $code): int => (int) substr($code, strlen($prefix)))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($sequence + 1), 3, '0', STR_PAD_LEFT);
    }
}
