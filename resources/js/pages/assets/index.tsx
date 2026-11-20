import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { HolderLabel } from '@/components/holder-label';
import { LaptopIcon, PlusIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaFrame } from '@/components/ui/media-frame';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { assetStatusTone, Badge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRupiah } from '@/lib/format';
import { dashboard } from '@/routes';
import {
    create as assetCreate,
    show as assetShow,
    index as assetsIndex,
} from '@/routes/assets';
import type { Asset, AssetStatus } from '@/types';
import { Select } from '@/components/ui/select';

type AssetsIndexProps = {
    assets: Asset[];
    filters: { search: string; status: string; category: string };
    categories: { code: string; name: string }[];
    statusCounts: Record<AssetStatus, number>;
    summary: { total: number; total_value: number };
};

const statusOrder: { value: AssetStatus; label: string }[] = [
    { value: 'tersedia', label: 'Tersedia' },
    { value: 'dipakai', label: 'Dipakai' },
    { value: 'diperbaiki', label: 'Diperbaiki' },
    { value: 'rusak', label: 'Rusak' },
    { value: 'dihapuskan', label: 'Dihapuskan' },
];

export default function AssetsIndex({
    assets,
    filters,
    categories,
    statusCounts,
    summary,
}: AssetsIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        const timeout = window.setTimeout(() => {
            applyFilters({ search });
        }, 300);

        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function applyFilters(changes: Partial<AssetsIndexProps['filters']>) {
        const next = { ...filters, search, ...changes };

        router.get(
            assetsIndex.url(),
            Object.fromEntries(
                Object.entries(next).filter(([, value]) => value !== ''),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <AppLayout
            title="Daftar Aset"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Aset' },
            ]}
        >
            <PageHeader
                title="Semua Aset Perusahaan"
                description="Barang yang dipakai, bukan dihabiskan: laptop, printer, proyektor, dan lainnya. Pemegangnya bisa karyawan atau ruangan."
                actions={
                    <ButtonLink
                        href={assetCreate.url()}
                        icon={<PlusIcon className="size-[18px]" />}
                    >
                        Tambah Aset
                    </ButtonLink>
                }
            />

            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SearchInput
                        id="asset-search"
                        label="Cari aset"
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, kode, atau nomor seri"
                    />
                    <label className="flex items-center gap-2 text-sm text-ink-500">
                        Kategori
                        <Select
                            id="asset-category"
                            aria-label="Kategori"
                            value={filters.category}
                            onChange={(category) => applyFilters({ category })}
                            className="w-56 font-medium"
                            options={[
                                { value: '', label: 'Semua kategori' },
                                ...categories.map((category) => ({
                                    value: category.code,
                                    label: `${category.name} (${category.code})`,
                                })),
                            ]}
                        />
                    </label>
                </div>

                <div className="rounded-2xl bg-white/70 p-3">
                    <SegmentedControl
                        label="Status aset"
                        value={filters.status}
                        onChange={(status) => applyFilters({ status })}
                        segments={[
                            {
                                value: '',
                                label: 'Semua',
                                count: summary.total,
                            },
                            ...statusOrder.map((status) => ({
                                value: status.value,
                                label: status.label,
                                count: statusCounts[status.value],
                            })),
                        ]}
                    />
                </div>

                <p className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-500">
                    <span>
                        Ditampilkan:{' '}
                        <strong className="font-semibold text-ink-900">
                            {assets.length}
                        </strong>
                    </span>
                    <span>
                        Total harga perolehan:{' '}
                        <strong className="font-semibold text-ink-900 tabular-nums">
                            {formatRupiah(summary.total_value)}
                        </strong>
                    </span>
                </p>
            </div>

            {assets.length === 0 ? (
                <div className="rounded-2xl bg-white">
                    {summary.total === 0 ? (
                        <EmptyState
                            icon={LaptopIcon}
                            title="Belum ada aset"
                            description="Aset adalah barang yang dipakai bergantian dan dicatat per unit, misalnya laptop, printer, atau proyektor."
                            action={
                                <ButtonLink
                                    href={assetCreate.url()}
                                    size="sm"
                                    icon={<PlusIcon className="size-4" />}
                                >
                                    Tambah aset pertama
                                </ButtonLink>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={LaptopIcon}
                            title="Tidak ada aset yang cocok"
                            description="Coba kata kunci lain atau hapus filter."
                            action={
                                <ButtonLink
                                    href={assetsIndex.url()}
                                    variant="soft"
                                    size="sm"
                                >
                                    Hapus semua filter
                                </ButtonLink>
                            }
                        />
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead>
                            <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                                <th className="py-3.5 pr-3 pl-5 font-medium">
                                    Aset
                                </th>
                                <th className="px-3 py-3.5 font-medium">
                                    Pemegang
                                </th>
                                <th className="px-3 py-3.5 font-medium">
                                    Status
                                </th>
                                <th className="px-3 py-3.5 font-medium">
                                    Kondisi
                                </th>
                                <th className="px-3 py-3.5 font-medium">
                                    Tanggal beli
                                </th>
                                <th className="py-3.5 pr-5 pl-3 text-right font-medium">
                                    Harga perolehan
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {assets.map((asset) => (
                                <tr
                                    key={asset.id}
                                    className="group relative transition-colors hover:bg-brand-50/40"
                                >
                                    <td className="py-3 pr-3 pl-5">
                                        <div className="flex items-center gap-3">
                                            <MediaFrame
                                                src={asset.image_url}
                                                alt=""
                                                fallbackIcon={LaptopIcon}
                                                className="size-12 shrink-0 rounded-lg [&_span]:hidden [&_svg]:size-5"
                                            />
                                            <div className="flex min-w-0 flex-col gap-0.5">
                                                <Link
                                                    href={assetShow.url(
                                                        asset.code,
                                                    )}
                                                    className="font-semibold text-ink-900 group-hover:text-brand-700 after:absolute after:inset-0"
                                                >
                                                    {asset.name}
                                                </Link>
                                                <span className="text-xs text-ink-400">
                                                    {asset.code} ·{' '}
                                                    {asset.category?.parent_name
                                                        ? `${asset.category.name} (Subkategori ${asset.category.parent_name})`
                                                        : asset.category?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <HolderLabel
                                            holder={asset.holder ?? null}
                                            status={asset.status.value}
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <Badge
                                            tone={
                                                assetStatusTone[
                                                    asset.status.value
                                                ]
                                            }
                                        >
                                            {asset.status.label}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-3 text-ink-700">
                                        {asset.condition ?? '—'}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-ink-700">
                                        {formatDate(asset.purchased_on)}
                                    </td>
                                    <td className="py-3 pr-5 pl-3 text-right font-medium text-ink-900 tabular-nums">
                                        {formatRupiah(asset.purchase_price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AppLayout>
    );
}
