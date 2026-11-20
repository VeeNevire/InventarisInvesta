<?php

namespace App\Enums;

enum StockStatus: string
{
    case Aman = 'aman';
    case Menipis = 'menipis';
    case Habis = 'habis';

    public static function fromQuantities(int $currentStock, int $minimumStock): self
    {
        if ($currentStock <= 0) {
            return self::Habis;
        }

        if ($minimumStock > 0 && $currentStock <= $minimumStock) {
            return self::Menipis;
        }

        return self::Aman;
    }

    public function label(): string
    {
        return match ($this) {
            self::Aman => 'Aman',
            self::Menipis => 'Menipis',
            self::Habis => 'Habis',
        };
    }
}
