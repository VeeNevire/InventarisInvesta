<?php

namespace App\Enums;

enum StockTransactionType: string
{
    case Masuk = 'masuk';
    case Keluar = 'keluar';
    case Penyesuaian = 'penyesuaian';

    public function label(): string
    {
        return match ($this) {
            self::Masuk => 'Masuk',
            self::Keluar => 'Keluar',
            self::Penyesuaian => 'Penyesuaian',
        };
    }

    /**
     * Prefix used when generating transaction numbers, e.g. BM-2611-0001.
     */
    public function numberPrefix(): string
    {
        return match ($this) {
            self::Masuk => 'BM',
            self::Keluar => 'BK',
            self::Penyesuaian => 'PS',
        };
    }
}
