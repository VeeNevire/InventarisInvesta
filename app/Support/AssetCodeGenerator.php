<?php

namespace App\Support;

use App\Models\Asset;

/**
 * Generates office equipment codes, e.g. INVESTA-PRL-2025-ITE-LPT-001.
 */
class AssetCodeGenerator extends InventoryCodeGenerator
{
    protected function module(): string
    {
        return 'PRL';
    }

    protected function model(): string
    {
        return Asset::class;
    }
}
