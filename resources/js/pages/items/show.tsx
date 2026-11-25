import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BellIcon,
    BoxIcon,
} from '@/components/icons';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { MediaFrame } from '@/components/ui/media-frame';
import { PageHeader } from '@/components/ui/page-header';
import {
    Badge,
    stockStatusTone,
    transactionTone,
} from '@/components/ui/status-badge';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { edit as itemEdit } from '@/routes/items';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';
import { formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as itemsIndex } from '@/routes/items';
import { update as updateNotification } from '@/routes/items/notification';
import type { Item, StockCardEntry } from '@/types';
import { Select } from '@/components/ui/select';

type ItemShowProps = {
    item: Item;
    stockCard: StockCardEntry[];
    monthSummary: {
        incoming: number;
        outgoing: number;
        outgoing_transactions: number;
    };
};

type CardFilter = 'all' | 'masuk' | 'keluar' | 'penyesuaian';

export default function ItemShow({
    item,
    stockCard,
    monthSummary,
}: ItemShowProps) {
    const canEditItem = usePage().props.auth.can['items.update'];
    const [cardFilter, setCardFilter] = useState<CardFilter>('all');
    const [isSavingNotification, setIsSavingNotification] = useState(false);
    const fullName = item.variant
        ? `${item.name} · ${item.variant}`
        : item.name;

    const visibleEntries = stockCard.filter(
        (entry) => cardFilter === 'all' || entry.type.value === cardFilter,
    );

    function toggleNotification(enabled: boolean) {
        router.patch(
            updateNotification.url(item.code),
            { notify_low_stock: enabled },
            {
                preserveScroll: true,
                onStart: () => setIsSavingNotification(true),
                onFinish: () => setIsSavingNotification(false),
            },
        );
    }

    const details: { label: string; value: string }[] = [
        { label: 'Kode barang', value: item.code },
        {
            label: 'Kategori',
            value: item.category?.parent_name
                ? `${item.category.parent_name} › ${item.category.name}`
                : (item.category?.name ?? '—'),
        },
        { label: 'Varian', value: item.variant ?? '—' },
        { label: 'Satuan', value: item.unit },
        { label: 'Lokasi', value: item.location ?? '—' },
        {
            label: 'Stok minimum',
            value: `${formatNumber(item.minimum_stock)} ${item.unit}`,
        },
    ];

    return (
        <AppLayout
            title={fullName}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Perlengkapan Kantor', href: itemsIndex.url() },
                { title: fullName },
            ]}
        >
            <PageHeader
                eyebrow={
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-500">
                            {item.code}
                        </span>
                        <Badge tone={stockStatusTone[item.status.value]}>
                            {item.status.label}
                        </Badge>
                    </div>
                }
                title={fullName}
                description={
                    item.description ??
                    `${item.category?.name} · ${item.location ?? 'lokasi belum diisi'}`
                }
                actions={
                    <>
                        {canEditItem && (
                            <ButtonLink
                                href={itemEdit.url(item.code)}
                                variant="soft"
                            >
                                Edit barang
                            </ButtonLink>
                        )}
                        <ButtonLink
                            href={incomingCreate.url({
                                query: { barang: item.code },
                            })}
                            variant="outline"
                            icon={<ArrowDownTrayIcon className="size-[18px]" />}
                        >
                            Barang Masuk
                        </ButtonLink>
                        <ButtonLink
                            href={outgoingCreate.url({
                                query: { barang: item.code },
                            })}
                            icon={<ArrowUpTrayIcon className="size-[18px]" />}
                        >
                            Barang Keluar
                        </ButtonLink>
                    </>
                }
            />

            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="flex flex-col gap-4">
                    <Card className="p-2">
                        <MediaFrame
                            src={item.image_url}
                            alt={fullName}
                            fallbackIcon={BoxIcon}
                            className="aspect-[4/3] max-w-full"
                        />
                    </Card>

                    <Card>
                        <CardHeader title="Informasi barang" />
                        <dl className="flex flex-col divide-y divide-ink-100 px-5 pb-3 text-sm">
                            {details.map((detail) => (
                                <div
                                    key={detail.label}
                                    className="flex justify-between gap-4 py-2.5"
                                >
                                    <dt className="text-ink-500">
                                        {detail.label}
                                    </dt>
                                    <dd className="text-right font-medium text-ink-900">
                                        {detail.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Card>

                    <Card className="flex flex-col gap-3 p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                <BellIcon className="size-[18px]" />
                            </span>
                            <div className="flex flex-1 flex-col gap-3">
                                <Switch
                                    id="notify-low-stock"
                                    label="Notifikasi stok rendah"
                                    checked={item.notify_low_stock}
                                    onChange={toggleNotification}
                                    disabled={isSavingNotification}
                                />
                                <p className="text-[13px] text-ink-500">
                                    {item.notify_low_stock
                                        ? `Lonceng akan menyala saat stok mencapai ${formatNumber(item.minimum_stock)} ${item.unit} atau kurang.`
                                        : 'Dimatikan. Barang tetap terlihat di daftar stok kritis, tapi tidak muncul di lonceng.'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <SummaryTile
                            label="Sisa stok"
                            value={`${formatNumber(item.current_stock)} ${item.unit}`}
                            hint={`minimum ${formatNumber(item.minimum_stock)} ${item.unit}`}
                            emphasis={item.status.value !== 'aman'}
                        />
                        <SummaryTile
                            label="Harga rata-rata"
                            value={formatRupiah(item.average_price)}
                            hint={`per ${item.unit}`}
                        />
                        <SummaryTile
                            label="Nilai stok"
                            value={formatRupiah(item.stock_value)}
                            hint="sisa stok × harga rata-rata"
                        />
                        <SummaryTile
                            label="Keluar bulan ini"
                            value={`${formatNumber(monthSummary.outgoing)} ${item.unit}`}
                            hint={`${monthSummary.outgoing_transactions} transaksi · masuk ${formatNumber(monthSummary.incoming)}`}
                        />
                    </div>

                    <Card>
                        <CardHeader
                            title="Kartu stok"
                            description="Semua pergerakan barang ini beserta saldo berjalan"
                            action={
                                <label className="flex items-center gap-2 text-[13px] text-ink-500">
                                    <span className="hidden sm:inline">
                                        Jenis
                                    </span>
                                    <Select
                                        id="stock-card-filter"
                                        aria-label="Jenis transaksi"
                                        value={cardFilter}
                                        onChange={(value) =>
                                            setCardFilter(value as CardFilter)
                                        }
                                        className="h-9 w-40 rounded-lg text-[13px] font-medium"
                                        options={[
                                            { value: 'all', label: 'Semua' },
                                            { value: 'masuk', label: 'Masuk' },
                                            {
                                                value: 'keluar',
                                                label: 'Keluar',
                                            },
                                            {
                                                value: 'penyesuaian',
                                                label: 'Penyesuaian',
                                            },
                                        ]}
                                    />
                                </label>
                            }
                        />
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="border-y border-ink-100 bg-ink-50 text-left text-xs text-ink-500">
                                        <th className="py-2.5 pr-3 pl-5 font-medium">
                                            Tanggal
                                        </th>
                                        <th className="px-3 py-2.5 font-medium">
                                            No. Transaksi
                                        </th>
                                        <th className="px-3 py-2.5 font-medium">
                                            Keterangan
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-medium">
                                            Masuk
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-medium">
                                            Keluar
                                        </th>
                                        <th className="px-3 py-2.5 text-right font-medium">
                                            Harga
                                        </th>
                                        <th className="py-2.5 pr-5 pl-3 text-right font-medium">
                                            Saldo
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-100">
                                    {visibleEntries.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-5 py-8 text-center text-ink-500"
                                            >
                                                Belum ada transaksi jenis ini.
                                            </td>
                                        </tr>
                                    )}
                                    {visibleEntries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className={cn(
                                                entry.is_cancelled &&
                                                    'bg-ink-50/60 text-ink-400',
                                            )}
                                        >
                                            <td className="py-3 pr-3 pl-5 whitespace-nowrap text-ink-700">
                                                {formatDate(
                                                    entry.transacted_on,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span
                                                        className={cn(
                                                            'font-medium',
                                                            entry.is_cancelled
                                                                ? 'line-through'
                                                                : 'text-ink-900',
                                                        )}
                                                    >
                                                        {entry.number}
                                                    </span>
                                                    {entry.is_cancelled ? (
                                                        <Badge
                                                            tone="gray"
                                                            variant="soft"
                                                        >
                                                            Dibatalkan
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            tone={
                                                                transactionTone[
                                                                    entry.type
                                                                        .value
                                                                ]
                                                            }
                                                            variant="soft"
                                                        >
                                                            {entry.type.label}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={cn(
                                                        entry.is_cancelled
                                                            ? 'line-through'
                                                            : 'text-ink-700',
                                                    )}
                                                >
                                                    {entry.description}
                                                </span>
                                                {entry.cancellation_reason && (
                                                    <span className="mt-1 block text-xs text-ink-500 no-underline">
                                                        Alasan batal:{' '}
                                                        {
                                                            entry.cancellation_reason
                                                        }
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-ok tabular-nums">
                                                {entry.quantity_in !== null &&
                                                    !entry.is_cancelled &&
                                                    `+${formatNumber(entry.quantity_in)}`}
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-3 py-3 text-right font-semibold tabular-nums',
                                                    entry.is_cancelled
                                                        ? 'line-through'
                                                        : 'text-ink-900',
                                                )}
                                            >
                                                {entry.quantity_out !== null &&
                                                    `−${formatNumber(entry.quantity_out)}`}
                                                {entry.is_cancelled &&
                                                    entry.quantity_in !==
                                                        null &&
                                                    `+${formatNumber(entry.quantity_in)}`}
                                            </td>
                                            <td className="px-3 py-3 text-right text-ink-500 tabular-nums">
                                                {entry.is_cancelled
                                                    ? '—'
                                                    : formatRupiah(
                                                          entry.unit_price,
                                                      )}
                                            </td>
                                            <td className="py-3 pr-5 pl-3 text-right font-semibold text-ink-900 tabular-nums">
                                                {entry.balance_after === null
                                                    ? '—'
                                                    : formatNumber(
                                                          entry.balance_after,
                                                      )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="border-t border-ink-100 px-5 py-3 text-xs text-ink-500">
                            Transaksi yang salah tidak diedit, melainkan
                            dibatalkan dengan alasan. Baris yang dibatalkan
                            dicoret dan tidak mengubah saldo.
                        </p>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

type SummaryTileProps = {
    label: string;
    value: string;
    hint: string;
    emphasis?: boolean;
};

function SummaryTile({ label, value, hint, emphasis }: SummaryTileProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-1.5 rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(18,24,38,0.04)]',
                emphasis ? 'border-low/30' : 'border-white',
            )}
        >
            <span className="text-[13px] font-medium text-ink-500">
                {label}
            </span>
            <span
                className={cn(
                    'text-xl font-semibold tracking-[-0.01em] tabular-nums',
                    emphasis ? 'text-low' : 'text-ink-900',
                )}
            >
                {value}
            </span>
            <span className="text-xs text-ink-500">{hint}</span>
        </div>
    );
}
