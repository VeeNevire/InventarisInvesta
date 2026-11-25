<?php

namespace App\Support;

use App\Models\Item;

/**
 * Generates office supply codes, e.g. INVESTA-PLK-2025-ATK-HVS-001.
 */
class ItemCodeGenerator extends InventoryCodeGenerator
{
    protected function module(): string
    {
        return 'PLK';
    }

    protected function model(): string
    {
        return Item::class;
    }
}
