import { Form, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    ArrowsIcon,
    BanIcon,
    ChevronDownIcon,
    ImageIcon,
    XIcon,
} from '@/components/icons';
import { DialogNotes } from '@/components/form-notes';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Badge, transactionTone } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    cancel as cancelTransaction,
    index as transactionsIndex,
} from '@/routes/transactions';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';
import type {
    Pagination,
    TransactionHistoryEntry,
    TransactionType,
} from '@/types';

type TransactionsIndexProps = {
    transactions: TransactionHistoryEntry[];
    pagination: Pagination;
    filters: { search: string; type: string; status: string };
    typeCounts: Record<TransactionType, number>;
    canCancel: boolean;
};

export default function TransactionsIndex({
    transactions,
    pagination,
    filters,
    typeCounts,
    canCancel,
}: TransactionsIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [cancelling, setCancelling] =
        useState<TransactionHistoryEntry | null>(null);
    const isFirstRender = useRef(true);
    const hasFilters = Object.values(filters).some((value) => value !== '');

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

    function applyFilters(changes: Partial<TransactionsIndexProps['filters']>) {
        const next = { ...filters, search, ...changes };

        router.get(
            transactionsIndex.url(),
            Object.fromEntries(
                Object.entries(next).filter(([, value]) => value !== ''),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    const allCount =
        typeCounts.masuk + typeCounts.keluar + typeCounts.penyesuaian;

    return (
        <AppLayout
            title="Riwayat Transaksi"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Transaksi' },
            ]}
        >
            <PageHeader
                title="Riwayat Transaksi"
                description="Semua barang masuk, keluar, dan penyesuaian stok. Transaksi yang salah dibatalkan, bukan diedit."
                actions={
                    <>
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
                <SearchInput
                    id="transaction-search"
                    label="Cari transaksi"
                    value={search}
                    onChange={setSearch}
                    placeholder="Cari nomor, barang, penerima, atau supplier"
                    className="sm:w-96"
                />
                <div className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 lg:flex-row lg:items-center lg:justify-between">
                    <SegmentedControl
                        label="Jenis transaksi"
                        value={filters.type}
                        onChange={(type) => applyFilters({ type })}
                        segments={[
                            {
                                value: '',
                                label: 'Semua jenis',
                                count: allCount,
                            },
                            {
                                value: 'masuk',
                                label: 'Masuk',
                                count: typeCounts.masuk,
                            },
                            {
                                value: 'keluar',
                                label: 'Keluar',
                                count: typeCounts.keluar,
                            },
                            {
                                value: 'penyesuaian',
                                label: 'Penyesuaian',
                                count: typeCounts.penyesuaian,
                            },
                        ]}
                    />
                    <SegmentedControl
                        label="Status transaksi"
                        value={filters.status}
                        onChange={(status) => applyFilters({ status })}
                        segments={[
                            { value: '', label: 'Semua status' },
                            { value: 'aktif', label: 'Aktif' },
                            { value: 'dibatalkan', label: 'Dibatalkan' },
                        ]}
                    />
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="rounded-2xl bg-white">
                    {hasFilters ? (
                        <EmptyState
                            icon={ArrowsIcon}
                            title="Tidak ada transaksi yang cocok"
                            description="Ubah kata kunci atau filter, atau catat transaksi baru."
                            action={
                                <ButtonLink
                                    href={transactionsIndex.url()}
                                    variant="soft"
                                    size="sm"
                                >
                                    Hapus semua filter
                                </ButtonLink>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={ArrowsIcon}
                            title="Belum ada transaksi"
                            description="Catat Barang Masuk saat barang datang, dan Barang Keluar saat ada yang mengambil. Semua riwayatnya akan tampil di sini."
                            action={
                                <div className="flex flex-wrap justify-center gap-2">
                                    <ButtonLink
                                        href={incomingCreate.url()}
                                        variant="outline"
                                        size="sm"
                                        icon={
                                            <ArrowDownTrayIcon className="size-4" />
                                        }
                                    >
                                        Barang Masuk
                                    </ButtonLink>
                                    <ButtonLink
                                        href={outgoingCreate.url()}
                                        size="sm"
                                        icon={
                                            <ArrowUpTrayIcon className="size-4" />
                                        }
                                    >
                                        Barang Keluar
                                    </ButtonLink>
                                </div>
                            }
                        />
                    )}
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
                    <ul className="divide-y divide-ink-100">
                        {transactions.map((transaction) => (
                            <TransactionRow
                                key={transaction.id}
                                transaction={transaction}
                                isExpanded={expanded === transaction.id}
                                onToggle={() =>
                                    setExpanded((current) =>
                                        current === transaction.id
                                            ? null
                                            : transaction.id,
                                    )
                                }
                                onCancel={() => setCancelling(transaction)}
                            />
                        ))}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3 text-sm text-ink-500">
                        <span>
                            Menampilkan {pagination.from}–{pagination.to} dari{' '}
                            {pagination.total} transaksi
                        </span>
                        <div className="flex gap-2">
                            <PageLink
                                href={pagination.prev_url}
                                label="Sebelumnya"
                            />
                            <PageLink
                                href={pagination.next_url}
                                label="Berikutnya"
                            />
                        </div>
                    </div>
                </div>
            )}

            {!canCancel && (
                <p className="text-[13px] text-ink-500">
                    Anda belum diberi akses membatalkan transaksi. Minta Admin
                    membatalkannya, atau minta akses tersebut.
                </p>
            )}

            {cancelling && (
                <CancelDialog
                    transaction={cancelling}
                    onClose={() => setCancelling(null)}
                />
            )}
        </AppLayout>
    );
}

function PageLink({ href, label }: { href: string | null; label: string }) {
    if (!href) {
        return (
            <span className="inline-flex h-9 items-center rounded-lg border border-ink-100 px-3 text-ink-400">
                {label}
            </span>
        );
    }

    return (
        <Link
            href={href}
            preserveScroll
            className="inline-flex h-9 items-center rounded-lg border border-ink-200 bg-white px-3 font-medium text-ink-700 hover:border-ink-400"
        >
            {label}
        </Link>
    );
}

type TransactionRowProps = {
    transaction: TransactionHistoryEntry;
    isExpanded: boolean;
    onToggle: () => void;
    onCancel: () => void;
};

function TransactionRow({
    transaction,
    isExpanded,
    onToggle,
    onCancel,
}: TransactionRowProps) {
    const totalQuantity = transaction.lines.reduce(
        (total, line) => total + Math.abs(line.quantity),
        0,
    );
    const totalValue = transaction.lines.reduce(
        (total, line) => total + Math.abs(line.quantity) * line.unit_price,
        0,
    );
    const firstLine = transaction.lines[0];
    const panelId = `transaction-${transaction.id}`;

    return (
        <li className={cn(transaction.is_cancelled && 'bg-ink-50/60')}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-left hover:bg-brand-50/30 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_120px_24px]"
            >
                <span className="flex flex-col items-start gap-1.5">
                    <span
                        className={cn(
                            'text-sm font-semibold',
                            transaction.is_cancelled
                                ? 'text-ink-400 line-through'
                                : 'text-ink-900',
                        )}
                    >
                        {transaction.number}
                    </span>
                    {transaction.is_cancelled ? (
                        <Badge tone="gray" variant="soft">
                            Dibatalkan
                        </Badge>
                    ) : (
                        <Badge
                            tone={transactionTone[transaction.type.value]}
                            variant="soft"
                        >
                            {transaction.type.label}
                        </Badge>
                    )}
                </span>
                <span className="col-span-2 flex min-w-0 flex-col gap-0.5 md:col-span-1">
                    <span className="truncate text-sm font-medium text-ink-900">
                        {firstLine?.item_name}
                        {transaction.lines.length > 1 && (
                            <span className="text-ink-500">
                                {' '}
                                +{transaction.lines.length - 1} barang lain
                            </span>
                        )}
                    </span>
                    <span className="text-xs text-ink-500 tabular-nums">
                        {formatNumber(totalQuantity)} unit
                        {totalValue > 0 && ` · ${formatRupiah(totalValue)}`}
                    </span>
                </span>
                <span className="col-span-2 flex min-w-0 flex-col gap-0.5 md:col-span-1">
                    <span className="truncate text-sm text-ink-700">
                        {transaction.counterpart ?? 'Cek stok'}
                    </span>
                    {transaction.purpose && (
                        <span className="truncate text-xs text-ink-500">
                            {transaction.purpose}
                        </span>
                    )}
                </span>
                <span className="flex flex-col items-start gap-0.5 md:items-end md:text-right">
                    <span className="text-sm text-ink-700">
                        {formatDate(transaction.transacted_on)}
                    </span>
                    {transaction.purchased_on && (
                        <span className="text-xs text-ink-500">
                            Beli {formatDate(transaction.purchased_on)}
                        </span>
                    )}
                </span>
                <ChevronDownIcon
                    className={cn(
                        'hidden size-5 text-ink-400 transition-transform md:block',
                        isExpanded && 'rotate-180',
                    )}
                />
            </button>

            {isExpanded && (
                <div
                    id={panelId}
                    className="flex flex-col gap-4 border-t border-dashed border-ink-200 px-5 py-4"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-ink-500">
                                    <th className="pb-2 font-medium">Barang</th>
                                    <th className="pb-2 text-right font-medium">
                                        Jumlah
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Harga satuan
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Subtotal
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-100">
                                {transaction.lines.map((line) => (
                                    <tr key={line.item_code}>
                                        <td className="py-2 text-ink-900">
                                            {line.item_name}
                                            <span className="ml-2 text-xs text-ink-400">
                                                {line.item_code}
                                            </span>
                                        </td>
                                        <td
                                            className={cn(
                                                'py-2 text-right font-semibold tabular-nums',
                                                line.quantity > 0
                                                    ? 'text-ok'
                                                    : 'text-ink-900',
                                            )}
                                        >
                                            {line.quantity > 0 ? '+' : '−'}
                                            {formatNumber(
                                                Math.abs(line.quantity),
                                            )}{' '}
                                            {line.unit}
                                        </td>
                                        <td className="py-2 text-right text-ink-500 tabular-nums">
                                            {formatRupiah(line.unit_price)}
                                        </td>
                                        <td className="py-2 text-right font-medium text-ink-900 tabular-nums">
                                            {formatRupiah(
                                                Math.abs(line.quantity) *
                                                    line.unit_price,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {transaction.receipt_url && (
                        <a
                            href={transaction.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex w-fit items-center gap-3 rounded-2xl border border-ink-200 bg-white p-2 pr-4 hover:border-brand-300"
                        >
                            <img
                                src={transaction.receipt_url}
                                alt={`Foto nota ${transaction.number}`}
                                loading="lazy"
                                className="size-16 rounded-xl bg-ink-50 object-cover"
                            />
                            <span className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 group-hover:text-brand-700">
                                    <ImageIcon className="size-4" />
                                    Foto nota
                                </span>
                                <span className="text-xs text-ink-500">
                                    Klik untuk melihat ukuran penuh
                                </span>
                            </span>
                        </a>
                    )}

                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                            {transaction.reference && (
                                <Meta
                                    label="Referensi"
                                    value={transaction.reference}
                                />
                            )}
                            {transaction.notes &&
                                transaction.notes !== transaction.purpose && (
                                    <Meta
                                        label="Catatan"
                                        value={transaction.notes}
                                    />
                                )}
                            {transaction.purchased_on && (
                                <Meta
                                    label="Tanggal pembelian"
                                    value={formatDate(transaction.purchased_on)}
                                />
                            )}
                            <Meta
                                label="Tanggal terima"
                                value={formatDate(transaction.transacted_on)}
                            />
                            {transaction.pic_name && (
                                <Meta
                                    label="PIC"
                                    value={transaction.pic_name}
                                />
                            )}
                            <Meta
                                label="Akun pencatat"
                                value={transaction.recorded_by ?? '—'}
                            />
                            {transaction.is_cancelled && (
                                <Meta
                                    label="Dibatalkan oleh"
                                    value={`${transaction.cancelled_by ?? '—'} · ${transaction.cancellation_reason ?? ''}`}
                                />
                            )}
                        </dl>
                        {transaction.can_cancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCancel}
                                icon={<BanIcon className="size-4" />}
                                className="text-[#c52c32] hover:bg-low/10"
                            >
                                Batalkan transaksi
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-ink-500">{label}</dt>
            <dd className="font-medium text-ink-900">{value}</dd>
        </div>
    );
}

type CancelDialogProps = {
    transaction: TransactionHistoryEntry;
    onClose: () => void;
};

function CancelDialog({ transaction, onClose }: CancelDialogProps) {
    useEffect(() => {
        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Tutup"
                onClick={onClose}
                className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-title"
                className="relative flex w-full max-w-md flex-col gap-5 rounded-3xl bg-white p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-low/10 text-low">
                            <BanIcon />
                        </span>
                        <div className="flex flex-col gap-1">
                            <h2
                                id="cancel-title"
                                className="text-lg font-semibold text-ink-900"
                            >
                                Batalkan {transaction.number}?
                            </h2>
                            <p className="text-sm text-ink-500">
                                Stok semua barang di transaksi ini akan dihitung
                                ulang. Transaksi tetap terlihat di kartu stok
                                dalam keadaan dicoret.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
                    >
                        <XIcon className="size-4" />
                    </button>
                </div>

                <Form
                    {...cancelTransaction.form(transaction.number)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="flex flex-col gap-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <DialogNotes
                                dos={[
                                    'Setelah dibatalkan, catat ulang transaksi yang benar supaya stok kembali sesuai.',
                                ]}
                                donts={[
                                    'Membatalkan transaksi yang sudah benar. Pembatalan tidak bisa diurungkan.',
                                ]}
                            />
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="cancel-reason"
                                    className="text-sm font-medium text-ink-700"
                                >
                                    Alasan pembatalan
                                </label>
                                <textarea
                                    id="cancel-reason"
                                    name="reason"
                                    rows={3}
                                    autoFocus
                                    required
                                    placeholder="Contoh: jumlah salah, akan diinput ulang"
                                    className="rounded-xl border border-ink-200 px-3.5 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
                                />
                                {errors.reason && (
                                    <p className="text-sm text-[#c52c32]">
                                        {errors.reason}
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={onClose}>
                                    Kembali
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-low shadow-none hover:bg-[#c52c32]"
                                >
                                    {processing
                                        ? 'Membatalkan…'
                                        : 'Ya, batalkan transaksi'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </div>,
        document.body,
    );
}
