import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BellIcon,
    BellOffIcon,
    BoxIcon,
    GridIcon,
    ListIcon,
    MapPinIcon,
    PlusIcon,
    TableIcon,
} from '@/components/icons';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { MediaFrame } from '@/components/ui/media-frame';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Badge, stockStatusTone } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { create as itemCreate } from '@/routes/items';
import { create as itemImport } from '@/routes/items/import';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';
import { formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { show as itemShow, index as itemsIndex } from '@/routes/items';
import type { Item, StockStatus } from '@/types';

type ItemsIndexProps = {
    items: Item[];
    filters: { search: string; category: string; status: string };
    categories: {
        id: number;
        parent_id: number | null;
        code: string;
        name: string;
        items_count: number;
    }[];
    statusCounts: Record<StockStatus, number>;
    summary: { item_count: number; total_value: number };
};

type ViewMode = 'table' | 'cards';

const VIEW_STORAGE_KEY = 'inventaris.items.view';

export default function ItemsIndex({
    items,
    filters,
    categories,
    statusCounts,
    summary,
}: ItemsIndexProps) {
    const canCreateItems = usePage().props.auth.can['items.create'];
    const [search, setSearch] = useState(filters.search);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const isFirstRender = useRef(true);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);

            if (stored === 'cards' || stored === 'table') {
                setViewMode(stored);
            }
        } catch {
            // Storage can be unavailable (private mode); keep the default.
        }
    }, []);

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

    function applyFilters(changes: Partial<ItemsIndexProps['filters']>) {
        const next = { ...filters, search, ...changes };

        router.get(
            itemsIndex.url(),
            Object.fromEntries(
                Object.entries(next).filter(([, value]) => value !== ''),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function changeView(mode: ViewMode) {
        setViewMode(mode);

        try {
            window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
        } catch {
            // Ignore storage failures; the view still switches.
        }
    }

    const shownQuantity = items.reduce(
        (total, item) => total + item.current_stock,
        0,
    );
    const shownValue = items.reduce(
        (total, item) => total + item.stock_value,
        0,
    );

    return (
        <AppLayout
            title="Daftar Barang"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Barang' },
            ]}
        >
            <PageHeader
                title="Semua Barang Persediaan"
                description="Barang habis pakai di gudang: merchandise, ATK, materi promosi, dan perlengkapan kantor."
                actions={
                    <>
                        {canCreateItems && (
                            <ButtonLink
                                href={itemCreate.url()}
                                variant="soft"
                                icon={<PlusIcon className="size-[18px]" />}
                            >
                                Tambah barang
                            </ButtonLink>
                        )}
                        {canCreateItems && (
                            <ButtonLink
                                href={itemImport.url()}
                                variant="soft"
                                icon={<TableIcon className="size-[18px]" />}
                            >
                                Import Excel
                            </ButtonLink>
                        )}
                        <ButtonLink
                            href={incomingCreate.url()}
                            variant="outline"
                            icon={<ArrowDownTrayIcon className="size-[18px]" />}
                        >
                            Barang Masuk
                        </ButtonLink>
                        <ButtonLink
                            href={outgoingCreate.url()}
                            icon={<ArrowUpTrayIcon className="size-[18px]" />}
                        >
                            Barang Keluar
                        </ButtonLink>
                    </>
                }
            />

            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SearchInput
                        id="item-search"
                        label="Cari barang"
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, varian, atau kode barang"
                    />
                    <div className="flex items-center gap-3">
                        <SegmentedControl<ViewMode>
                            label="Tampilan"
                            value={viewMode}
                            onChange={changeView}
                            segments={[
                                {
                                    value: 'table',
                                    label: (
                                        <>
                                            <ListIcon className="size-4" />
                                            Tabel
                                        </>
                                    ),
                                },
                                {
                                    value: 'cards',
                                    label: (
                                        <>
                                            <GridIcon className="size-4" />
                                            Kartu
                                        </>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full sm:w-64">
                        <Select
                            id="category-filter"
                            aria-label="Filter kategori"
                            value={filters.category}
                            onChange={(category) => applyFilters({ category })}
                            options={[
                                { value: '', label: 'Semua kategori' },
                                ...categories
                                    .filter((category) => !category.parent_id)
                                    .flatMap((category) => [
                                        {
                                            value: category.code,
                                            label: category.name,
                                        },
                                        ...categories
                                            .filter(
                                                (child) =>
                                                    child.parent_id ===
                                                    category.id,
                                            )
                                            .map((child) => ({
                                                value: child.code,
                                                label: child.name,
                                                indent: true,
                                            })),
                                    ]),
                            ]}
                        />
                    </div>
                    <SegmentedControl
                        label="Status stok"
                        value={filters.status}
                        onChange={(status) => applyFilters({ status })}
                        segments={[
                            { value: '', label: 'Semua status' },
                            {
                                value: 'aman',
                                label: 'Aman',
                                count: statusCounts.aman,
                            },
                            {
                                value: 'menipis',
                                label: 'Menipis',
                                count: statusCounts.menipis,
                            },
                            {
                                value: 'habis',
                                label: 'Habis',
                                count: statusCounts.habis,
                            },
                        ]}
                    />
                </div>

                <p className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-500">
                    <span>
                        Ditampilkan:{' '}
                        <strong className="font-semibold text-ink-900">
                            {items.length}
                        </strong>
                    </span>
                    <span>
                        Total stok:{' '}
                        <strong className="font-semibold text-ink-900 tabular-nums">
                            {formatNumber(shownQuantity)}
                        </strong>
                    </span>
                    <span>
                        Total nilai:{' '}
                        <strong className="font-semibold text-ink-900 tabular-nums">
                            {formatRupiah(shownValue)}
                        </strong>
                    </span>
                </p>
            </div>

            {items.length === 0 ? (
                <div className="rounded-2xl bg-white">
                    {summary.item_count === 0 ? (
                        <EmptyState
                            title="Belum ada barang persediaan"
                            description="Barang habis pakai seperti ATK, kalender, atau merchandise. Daftarkan barangnya, lalu isi stok awal lewat Barang Masuk."
                            action={
                                <ButtonLink
                                    href={
                                        canCreateItems
                                            ? itemCreate.url()
                                            : incomingCreate.url()
                                    }
                                    size="sm"
                                    icon={<PlusIcon className="size-4" />}
                                >
                                    {canCreateItems
                                        ? 'Tambah barang pertama'
                                        : 'Catat barang masuk'}
                                </ButtonLink>
                            }
                        />
                    ) : (
                        <EmptyState
                            title="Tidak ada barang yang cocok"
                            description="Coba kata kunci lain atau hapus filter kategori dan status."
                            action={
                                <ButtonLink
                                    href={itemsIndex.url()}
                                    variant="soft"
                                    size="sm"
                                >
                                    Hapus semua filter
                                </ButtonLink>
                            }
                        />
                    )}
                </div>
            ) : viewMode === 'cards' ? (
                <ItemCards items={items} />
            ) : (
                <ItemTable items={items} />
            )}
        </AppLayout>
    );
}

function StockMeter({ item }: { item: Item }) {
    const target = Math.max(item.minimum_stock * 2, 1);
    const fill = Math.min(100, (item.current_stock / target) * 100);
    const minimumMark = Math.min(100, (item.minimum_stock / target) * 100);

    return (
        <span className="relative block h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
            <span
                className={cn(
                    'block h-full rounded-full',
                    item.status.value === 'aman' ? 'bg-ok' : 'bg-low',
                )}
                style={{ width: `${fill}%` }}
            />
            {item.minimum_stock > 0 && (
                <span
                    className="absolute top-0 h-full w-0.5 bg-ink-700/40"
                    style={{ left: `${minimumMark}%` }}
                />
            )}
        </span>
    );
}

function ItemTable({ items }: { items: Item[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
            <table className="w-full min-w-[920px] text-sm">
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">Barang</th>
                        <th className="px-3 py-3.5 font-medium">Kategori</th>
                        <th className="px-3 py-3.5 font-medium">Lokasi</th>
                        <th className="px-3 py-3.5 font-medium">Sisa stok</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Harga rata-rata
                        </th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Nilai
                        </th>
                        <th className="px-3 py-3.5 font-medium">Status</th>
                        <th className="py-3.5 pr-5 pl-3 text-center font-medium">
                            <span className="sr-only">Notifikasi</span>
                            <BellIcon className="mx-auto size-4" />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {items.map((item) => (
                        <tr
                            key={item.id}
                            className="group relative transition-colors hover:bg-brand-50/40"
                        >
                            <td className="py-3 pr-3 pl-5">
                                <div className="flex items-center gap-3">
                                    <MediaFrame
                                        src={item.image_url}
                                        alt=""
                                        className="size-12 shrink-0 rounded-lg [&_span]:hidden [&_svg]:size-5"
                                    />
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <Link
                                            href={itemShow.url(item.code)}
                                            className="font-semibold text-ink-900 group-hover:text-brand-700 after:absolute after:inset-0 focus-visible:outline-none"
                                        >
                                            {item.name}
                                            {item.variant && (
                                                <span className="font-normal text-ink-500">
                                                    {' '}
                                                    · {item.variant}
                                                </span>
                                            )}
                                        </Link>
                                        <span className="text-xs text-ink-400">
                                            {item.code}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {item.category?.parent_name
                                    ? `${item.category.name} (Subkategori ${item.category.parent_name})`
                                    : item.category?.name}
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {item.location ?? '—'}
                            </td>
                            <td className="px-3 py-3">
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-semibold text-ink-900 tabular-nums">
                                        {formatNumber(item.current_stock)}{' '}
                                        <span className="font-normal text-ink-500">
                                            {item.unit}
                                        </span>
                                    </span>
                                    <StockMeter item={item} />
                                </div>
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {formatRupiah(item.average_price)}
                            </td>
                            <td className="px-3 py-3 text-right font-medium text-ink-900 tabular-nums">
                                {formatRupiah(item.stock_value)}
                            </td>
                            <td className="px-3 py-3">
                                <Badge
                                    tone={stockStatusTone[item.status.value]}
                                >
                                    {item.status.label}
                                </Badge>
                            </td>
                            <td className="py-3 pr-5 pl-3 text-center">
                                {item.notify_low_stock ? (
                                    <BellIcon
                                        className="mx-auto size-4 text-brand-600"
                                        aria-label="Notifikasi aktif"
                                        aria-hidden={false}
                                        role="img"
                                    />
                                ) : (
                                    <BellOffIcon
                                        className="mx-auto size-4 text-ink-400"
                                        aria-label="Notifikasi dimatikan"
                                        aria-hidden={false}
                                        role="img"
                                    />
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ItemCards({ items }: { items: Item[] }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
                <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white bg-white p-2 shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]"
                >
                    <MediaFrame
                        src={item.image_url}
                        alt={item.name}
                        fallbackIcon={BoxIcon}
                        className="h-36"
                    >
                        <Badge
                            tone={stockStatusTone[item.status.value]}
                            className="absolute top-2.5 left-2.5"
                        >
                            {item.status.label}
                        </Badge>
                    </MediaFrame>
                    <div className="flex flex-col gap-1 px-2">
                        <span className="text-[13px] text-ink-500">
                            {item.code}
                        </span>
                        <h3 className="truncate text-[15px] font-semibold text-ink-900">
                            {item.name}
                            {item.variant && ` · ${item.variant}`}
                        </h3>
                        <span className="flex items-center gap-1 text-xs text-ink-500">
                            <MapPinIcon className="size-3.5" />
                            {item.location ?? 'Belum ada lokasi'}
                        </span>
                    </div>
                    <dl className="mx-2 divide-y divide-ink-100 rounded-xl border border-ink-100 text-[13px]">
                        <div className="flex items-center justify-between px-3 py-2.5">
                            <dt className="text-ink-500">Sisa stok</dt>
                            <dd className="font-semibold text-ink-900 tabular-nums">
                                {formatNumber(item.current_stock)} {item.unit}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2.5">
                            <dt className="text-ink-500">Total nilai</dt>
                            <dd className="font-semibold text-ink-900 tabular-nums">
                                {formatRupiah(item.stock_value)}
                            </dd>
                        </div>
                    </dl>
                    <ButtonLink
                        href={itemShow.url(item.code)}
                        variant="soft"
                        className="mx-2 mb-2"
                    >
                        Lihat Detail
                    </ButtonLink>
                </article>
            ))}
        </div>
    );
}
