<?php

namespace App\Enums;

enum AssetHistoryType: string
{
    case Pembelian = 'pembelian';
    case Penyerahan = 'penyerahan';
    case Pengembalian = 'pengembalian';
    case Perbaikan = 'perbaikan';
    case SelesaiPerbaikan = 'selesai_perbaikan';
    case Penghapusan = 'penghapusan';

    public function label(): string
    {
        return match ($this) {
            self::Pembelian => 'Pembelian',
            self::Penyerahan => 'Penyerahan',
            self::Pengembalian => 'Pengembalian',
            self::Perbaikan => 'Dikirim servis',
            self::SelesaiPerbaikan => 'Selesai servis',
            self::Penghapusan => 'Dihapuskan',
        };
    }
}
