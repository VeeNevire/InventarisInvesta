<?php

namespace App\Enums;

enum AssetStatus: string
{
    case Tersedia = 'tersedia';
    case Dipakai = 'dipakai';
    case Diperbaiki = 'diperbaiki';
    case Rusak = 'rusak';
    case Dihapuskan = 'dihapuskan';

    public function label(): string
    {
        return match ($this) {
            self::Tersedia => 'Tersedia',
            self::Dipakai => 'Dipakai',
            self::Diperbaiki => 'Diperbaiki',
            self::Rusak => 'Rusak',
            self::Dihapuskan => 'Dihapuskan',
        };
    }
}
