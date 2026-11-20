<?php

namespace App\Support;

use App\Models\Asset;
use App\Models\Category;

/**
 * Generates asset codes from the category code, e.g. INV-LPT-006.
 */
class AssetCodeGenerator
{
    public function next(Category $category): string
    {
        $prefix = 'INV-'.$category->code.'-';

        $sequence = Asset::query()
            ->where('code', 'like', $prefix.'%')
            ->pluck('code')
            ->map(fn (string $code): int => (int) substr($code, strlen($prefix)))
            ->max() ?? 0;

        return $prefix.str_pad((string) ($sequence + 1), 3, '0', STR_PAD_LEFT);
    }
}
