<?php

namespace App\Enums;

enum StockOpnameStatus: string
{
    case Draf = 'draf';
    case Selesai = 'selesai';

    public function label(): string
    {
        return match ($this) {
            self::Draf => 'Draf',
            self::Selesai => 'Selesai',
        };
    }
}
