<?php

namespace App\Enums;

/**
 * Extra access an admin can hand to a Sekretaris account, one checkbox each.
 * Admins always have every permission. Managing user accounts stays
 * admin-only so nobody can raise their own access.
 */
enum Permission: string
{
    case CreateItems = 'items.create';
    case UpdateItems = 'items.update';
    case DeleteItems = 'items.delete';
    case UpdateAssets = 'assets.update';
    case DisposeAssets = 'assets.dispose';
    case CancelTransactions = 'transactions.cancel';
    case ManageEmployees = 'master.employees';
    case ManagePlaces = 'master.places';
    case ManageCategories = 'master.categories';

    public function label(): string
    {
        return match ($this) {
            self::CreateItems => 'Tambah perlengkapan',
            self::UpdateItems => 'Ubah data perlengkapan',
            self::DeleteItems => 'Hapus perlengkapan',
            self::UpdateAssets => 'Ubah data peralatan',
            self::DisposeAssets => 'Hapuskan peralatan',
            self::CancelTransactions => 'Batalkan transaksi',
            self::ManageEmployees => 'Kelola karyawan & divisi',
            self::ManagePlaces => 'Kelola ruangan & supplier',
            self::ManageCategories => 'Kelola kategori',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::CreateItems => 'Mendaftarkan perlengkapan kantor baru dari menu Perlengkapan Kantor.',
            self::UpdateItems => 'Mengubah nama, kategori, harga, lokasi, dan batas minimum barang.',
            self::DeleteItems => 'Menghapus barang yang belum pernah punya transaksi.',
            self::UpdateAssets => 'Mengubah nama, spesifikasi, harga, dan foto peralatan.',
            self::DisposeAssets => 'Menandai peralatan sebagai dihapuskan (dijual, dibuang, hilang).',
            self::CancelTransactions => 'Membatalkan barang masuk atau keluar yang salah catat, dengan alasan.',
            self::ManageEmployees => 'Menambah, mengubah, dan menghapus karyawan serta divisi.',
            self::ManagePlaces => 'Menambah, mengubah, dan menghapus ruangan serta supplier.',
            self::ManageCategories => 'Menambah, mengubah, dan menghapus kategori dan subkategori.',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::CreateItems, self::UpdateItems, self::DeleteItems => 'Perlengkapan Kantor',
            self::UpdateAssets, self::DisposeAssets => 'Peralatan Kantor',
            self::CancelTransactions => 'Transaksi',
            self::ManageEmployees, self::ManagePlaces, self::ManageCategories => 'Master Data',
        };
    }

    /**
     * Whether this permission opens a page under Master Data.
     */
    public function isMasterData(): bool
    {
        return $this->group() === 'Master Data';
    }
}
