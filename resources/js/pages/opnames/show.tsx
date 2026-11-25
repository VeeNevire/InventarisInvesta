import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import {
    AlertIcon,
    BoxIcon,
    ClipboardIcon,
    PackageCheckIcon,
    TrashIcon,
} from '@/components/icons';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Badge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    complete as opnameComplete,
    destroy as opnameDestroy,
    index as opnamesIndex,
    update as opnameUpdate,
} from '@/routes/stock-opnames';
import { index as transactionsIndex } from '@/routes/transactions';
import { FormNotes } from '@/components/form-notes';

type OpnameLine = {
    id: number;
    item_code: string;
    item_name: string;
    variant: string | null;
    unit: string;
    location: string | null;
    category: string;
    image_url: string | null;
    system_stock: number;
    unit_price: number;
    counted_stock: number | null;
    reason: string | null;
};

type OpnameShowProps = {
    opname: {
        number: string;
        counted_on: string;
        scope: string;
        status: { value: 'draf' | 'selesai'; label: string };
        notes: string | null;
        created_by: string | null;
        completed_by: string | null;
        completed_at: string | null;
        adjustment_number: string | null;
        line_count: number;
    };
    lines: OpnameLine[];
    reasons: string[];
};

type LineInput = { id: number; counted_stock: string; reason: string };

type View = 'all' | 'uncounted' | 'difference';

export default function OpnameShow({
    opname,
    lines,
    reasons,
}: OpnameShowProps) {
    const isDraft = opname.status.value === 'draf';
    const [view, setView] = useState<View>('all');
    const [search, setSearch] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<{ lines: LineInput[] }>({
        lines: lines.map((line) => ({
            id: line.id,
            counted_stock:
                line.counted_stock === null ? '' : String(line.counted_stock),
            reason: line.reason ?? '',
        })),
    });
    const errors = form.errors as Record<string, string | undefined>;

    function updateLine(index: number, changes: Partial<LineInput>) {
        form.setData(
            'lines',
            form.data.lines.map((line, lineIndex) =>
                lineIndex === index ? { ...line, ...changes } : line,
            ),
        );
    }

    const rows = lines.map((line, index) => {
        const input = form.data.lines[index];
        const counted =
            input.counted_stock === '' ? null : Number(input.counted_stock);
        const difference =
            counted === null ? null : counted - line.system_stock;

        return { line, input, index, counted, difference };
    });

    const countedRows = rows.filter((row) => row.counted !== null);
    const differenceRows = rows.filter(
        (row) => row.difference !== null && row.difference !== 0,
    );
    const differenceValue = differenceRows.reduce(
        (total, row) => total + (row.difference ?? 0) * row.line.unit_price,
        0,
    );
    const missingReasons = differenceRows.filter(
        (row) => !row.input.reason.trim(),
    ).length;

    const normalized = search.trim().toLowerCase();
    const visibleRows = rows.filter((row) => {
        if (view === 'uncounted' && row.counted !== null) {
            return false;
        }

        if (view === 'difference' && !row.difference) {
            return false;
        }

        return (
            !normalized ||
            [
                row.line.item_name,
                row.line.variant ?? '',
                row.line.item_code,
                row.line.location ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(normalized)
        );
    });

    function saveDraft() {
        form.put(opnameUpdate.url(opname.number), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }

    function complete() {
        form.post(opnameComplete.url(opname.number), {
            preserveScroll: true,
            onSuccess: () => setIsConfirming(false),
            onError: () => setIsConfirming(false),
        });
    }

    const progress =
        lines.length > 0 ? (countedRows.length / lines.length) * 100 : 0;

    return (
        <AppLayout
            title={`Cek stok ${opname.number}`}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Cek Stok', href: opnamesIndex.url() },
                { title: opname.number },
            ]}
        >
            <PageHeader
                eyebrow={
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-500">
                            {formatDate(opname.counted_on)} · {opname.scope}
                        </span>
                        <Badge tone={isDraft ? 'amber' : 'green'}>
                            {isDraft ? 'Draf' : 'Selesai'}
                        </Badge>
                    </div>
                }
                title={`Lembar hitung ${opname.number}`}
                description={
                    isDraft
                        ? 'Isi jumlah fisik tiap barang. Bisa disimpan sebagai draf dan dilanjutkan nanti.'
                        : `Diselesaikan oleh ${opname.completed_by ?? '—'}. Stok sistem sudah disesuaikan dengan hasil hitung.`
                }
                actions={
                    isDraft ? (
                        <Button
                            variant="ghost"
                            icon={<TrashIcon className="size-4" />}
                            onClick={() => setIsDeleting(true)}
                            className="text-low-ink hover:bg-low/10"
                        >
                            Hapus draf
                        </Button>
                    ) : opname.adjustment_number ? (
                        <ButtonLink
                            href={transactionsIndex.url({
                                query: { search: opname.adjustment_number },
                            })}
                            variant="soft"
                        >
                            Lihat penyesuaian {opname.adjustment_number}
                        </ButtonLink>
                    ) : undefined
                }
            />

            {isDraft && (
                <FormNotes
                    id="stock-check"
                    title="Perhatikan saat menghitung"
                    dos={[
                        'Hitung langsung di rak, jangan menyalin angka dari sistem.',
                        'Tulis alasan yang jelas untuk setiap selisih.',
                        'Simpan draf secara berkala kalau barangnya banyak.',
                    ]}
                    donts={[
                        'Mencatat barang masuk atau keluar selama cek stok berlangsung. Selesaikan dulu cek stoknya.',
                        'Menekan Cocok tanpa benar-benar menghitung barangnya.',
                    ]}
                />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-3 rounded-2xl border border-white bg-white p-5 shadow-[0_1px_2px_rgba(18,24,38,0.04)]">
                    <span className="text-[13px] font-medium text-ink-500">
                        Sudah dihitung
                    </span>
                    <span className="text-2xl font-semibold text-ink-900 tabular-nums">
                        {countedRows.length}
                        <span className="text-base font-medium text-ink-400">
                            {' '}
                            / {lines.length} barang
                        </span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <span
                            className="block h-full rounded-full bg-brand-600 transition-[width]"
                            style={{ width: `${progress}%` }}
                        />
                    </span>
                </div>
                <div className="flex flex-col gap-1.5 rounded-2xl border border-white bg-white p-5 shadow-[0_1px_2px_rgba(18,24,38,0.04)]">
                    <span className="text-[13px] font-medium text-ink-500">
                        Barang selisih
                    </span>
                    <span
                        className={cn(
                            'text-2xl font-semibold tabular-nums',
                            differenceRows.length > 0
                                ? 'text-service'
                                : 'text-ink-900',
                        )}
                    >
                        {differenceRows.length}
                    </span>
                    <span className="text-xs text-ink-500">
                        {missingReasons > 0 && isDraft
                            ? `${missingReasons} belum ada alasannya`
                            : 'dari barang yang sudah dihitung'}
                    </span>
                </div>
                <div className="flex flex-col gap-1.5 rounded-2xl border border-white bg-white p-5 shadow-[0_1px_2px_rgba(18,24,38,0.04)]">
                    <span className="text-[13px] font-medium text-ink-500">
                        Nilai selisih
                    </span>
                    <span
                        className={cn(
                            'text-2xl font-semibold tabular-nums',
                            differenceValue < 0
                                ? 'text-low'
                                : differenceValue > 0
                                  ? 'text-ok'
                                  : 'text-ink-900',
                        )}
                    >
                        {differenceValue > 0 && '+'}
                        {formatRupiah(differenceValue)}
                    </span>
                    <span className="text-xs text-ink-500">
                        dihitung dari harga rata-rata
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <SearchInput
                    id="opname-search"
                    label="Cari barang"
                    value={search}
                    onChange={setSearch}
                    placeholder="Cari nama, kode, atau rak"
                />
                <SegmentedControl<View>
                    label="Tampilkan"
                    value={view}
                    onChange={setView}
                    segments={[
                        { value: 'all', label: 'Semua', count: lines.length },
                        {
                            value: 'uncounted',
                            label: 'Belum dihitung',
                            count: lines.length - countedRows.length,
                        },
                        {
                            value: 'difference',
                            label: 'Ada selisih',
                            count: differenceRows.length,
                        },
                    ]}
                />
            </div>

            {errors.lines && (
                <p className="flex items-center gap-2 rounded-xl bg-low/10 px-4 py-3 text-sm text-low-ink">
                    <AlertIcon className="size-4" />
                    {errors.lines}
                </p>
            )}

            <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
                <table className="w-full min-w-[920px] text-sm">
                    <thead>
                        <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                            <th className="py-3.5 pr-3 pl-5 font-medium">
                                Barang
                            </th>
                            <th className="px-3 py-3.5 text-right font-medium">
                                Stok Sistem
                            </th>
                            <th className="px-3 py-3.5 font-medium">
                                Hitung Fisik
                            </th>
                            <th className="px-3 py-3.5 text-right font-medium">
                                Selisih
                            </th>
                            <th className="py-3.5 pr-5 pl-3 font-medium">
                                Alasan Selisih
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {visibleRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-5 py-10 text-center text-ink-500"
                                >
                                    Tidak ada barang untuk ditampilkan.
                                </td>
                            </tr>
                        )}
                        {visibleRows.map(
                            ({ line, input, index, counted, difference }) => {
                                const reasonError =
                                    errors[`lines.${index}.reason`];
                                const countError =
                                    errors[`lines.${index}.counted_stock`];
                                const needsReason =
                                    difference !== null &&
                                    difference !== 0 &&
                                    !input.reason.trim();

                                return (
                                    <tr
                                        key={line.id}
                                        className={cn(
                                            difference !== null &&
                                                difference !== 0 &&
                                                'bg-service/[0.04]',
                                        )}
                                    >
                                        <td className="py-3 pr-3 pl-5">
                                            <div className="flex items-center gap-3">
                                                {line.image_url ? (
                                                    <img
                                                        src={line.image_url}
                                                        alt=""
                                                        className="size-11 shrink-0 rounded-lg bg-media object-contain p-1"
                                                    />
                                                ) : (
                                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-media text-brand-300">
                                                        <BoxIcon className="size-5" />
                                                    </span>
                                                )}
                                                <span className="flex min-w-0 flex-col">
                                                    <span className="font-semibold text-ink-900">
                                                        {line.item_name}
                                                        {line.variant && (
                                                            <span className="font-normal text-ink-500">
                                                                {' '}
                                                                · {line.variant}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-ink-400">
                                                        {line.item_code}
                                                        {line.location &&
                                                            ` · ${line.location}`}
                                                    </span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right font-medium text-ink-700 tabular-nums">
                                            {formatNumber(line.system_stock)}{' '}
                                            <span className="text-ink-400">
                                                {line.unit}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            {isDraft ? (
                                                <div className="flex items-center gap-2">
                                                    <label
                                                        htmlFor={`count-${line.id}`}
                                                        className="sr-only"
                                                    >
                                                        Hitung fisik{' '}
                                                        {line.item_name}
                                                    </label>
                                                    <input
                                                        id={`count-${line.id}`}
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={0}
                                                        value={
                                                            input.counted_stock
                                                        }
                                                        onChange={(event) =>
                                                            updateLine(index, {
                                                                counted_stock:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="—"
                                                        aria-invalid={Boolean(
                                                            countError,
                                                        )}
                                                        className="placeholder:text-ink-300 h-10 w-24 rounded-xl border border-ink-200 bg-white px-3 text-right text-sm font-semibold text-ink-900 tabular-nums outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-invalid:border-low"
                                                    />
                                                    {counted === null && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateLine(
                                                                    index,
                                                                    {
                                                                        counted_stock:
                                                                            String(
                                                                                line.system_stock,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                            title="Isi sama dengan stok sistem"
                                                            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                                                        >
                                                            Cocok
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-ink-900 tabular-nums">
                                                    {counted === null
                                                        ? 'Tidak dihitung'
                                                        : `${formatNumber(counted)} ${line.unit}`}
                                                </span>
                                            )}
                                            {countError && (
                                                <p className="mt-1 text-xs text-low-ink">
                                                    {countError}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {difference === null ? (
                                                <span className="text-ink-300">
                                                    —
                                                </span>
                                            ) : difference === 0 ? (
                                                <Badge
                                                    tone="green"
                                                    variant="soft"
                                                >
                                                    Cocok
                                                </Badge>
                                            ) : (
                                                <span className="flex flex-col items-end">
                                                    <span
                                                        className={cn(
                                                            'font-semibold tabular-nums',
                                                            difference < 0
                                                                ? 'text-low'
                                                                : 'text-ok',
                                                        )}
                                                    >
                                                        {difference > 0 && '+'}
                                                        {formatNumber(
                                                            difference,
                                                        )}{' '}
                                                        {line.unit}
                                                    </span>
                                                    <span className="text-xs text-ink-500 tabular-nums">
                                                        {formatRupiah(
                                                            difference *
                                                                line.unit_price,
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-5 pl-3">
                                            {isDraft ? (
                                                difference !== null &&
                                                difference !== 0 ? (
                                                    <div className="flex w-56 flex-col gap-1">
                                                        <Autocomplete
                                                            id={`reason-${line.id}`}
                                                            value={input.reason}
                                                            onChange={(
                                                                reason,
                                                            ) =>
                                                                updateLine(
                                                                    index,
                                                                    { reason },
                                                                )
                                                            }
                                                            options={reasons}
                                                            placeholder="Contoh: rusak"
                                                            invalid={
                                                                Boolean(
                                                                    reasonError,
                                                                ) || needsReason
                                                            }
                                                            className="h-10"
                                                        />
                                                        {reasonError && (
                                                            <p className="text-xs text-low-ink">
                                                                {reasonError}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-ink-400">
                                                        Tidak perlu
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-ink-700">
                                                    {line.reason ?? '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            },
                        )}
                    </tbody>
                </table>
            </div>

            {isDraft && (
                <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white/95 p-3 pl-5 shadow-[0_16px_40px_-20px_rgba(18,24,38,0.4)] backdrop-blur">
                    <span className="text-sm text-ink-500">
                        {form.isDirty
                            ? 'Ada perubahan yang belum disimpan.'
                            : 'Semua perubahan sudah tersimpan.'}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={saveDraft}
                            disabled={form.processing}
                        >
                            Simpan draf
                        </Button>
                        <Button
                            icon={<PackageCheckIcon className="size-[18px]" />}
                            onClick={() => setIsConfirming(true)}
                            disabled={
                                form.processing || countedRows.length === 0
                            }
                        >
                            Selesaikan cek stok
                        </Button>
                    </div>
                </div>
            )}

            <Dialog
                open={isConfirming}
                onClose={() => setIsConfirming(false)}
                title={`Selesaikan ${opname.number}?`}
                description="Stok sistem akan diubah mengikuti hasil hitung. Setelah selesai, lembar hitung ini tidak bisa diubah lagi."
                icon={
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                        <ClipboardIcon className="size-5" />
                    </span>
                }
            >
                <div className="flex flex-col gap-4">
                    <dl className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
                        <div className="flex justify-between px-4 py-3">
                            <dt className="text-ink-500">Barang dihitung</dt>
                            <dd className="font-semibold text-ink-900 tabular-nums">
                                {countedRows.length} dari {lines.length}
                            </dd>
                        </div>
                        <div className="flex justify-between px-4 py-3">
                            <dt className="text-ink-500">Barang selisih</dt>
                            <dd className="font-semibold text-ink-900 tabular-nums">
                                {differenceRows.length}
                            </dd>
                        </div>
                        <div className="flex justify-between px-4 py-3">
                            <dt className="text-ink-500">Nilai selisih</dt>
                            <dd
                                className={cn(
                                    'font-semibold tabular-nums',
                                    differenceValue < 0
                                        ? 'text-low'
                                        : 'text-ink-900',
                                )}
                            >
                                {formatRupiah(differenceValue)}
                            </dd>
                        </div>
                    </dl>
                    {lines.length - countedRows.length > 0 && (
                        <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-[13px] text-ink-700">
                            {lines.length - countedRows.length} barang belum
                            dihitung. Stoknya tidak diubah.
                        </p>
                    )}
                    {missingReasons > 0 && (
                        <p className="rounded-xl bg-service/10 px-3.5 py-3 text-[13px] text-[#92400e]">
                            {missingReasons} barang selisih belum diisi
                            alasannya. Lengkapi dulu sebelum menyelesaikan.
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsConfirming(false)}
                        >
                            Kembali
                        </Button>
                        <Button
                            onClick={complete}
                            disabled={form.processing || missingReasons > 0}
                        >
                            {form.processing ? 'Menyimpan…' : 'Ya, selesaikan'}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            {isDraft && (
                <ConfirmDeleteDialog
                    open={isDeleting}
                    onClose={() => setIsDeleting(false)}
                    title={`Hapus draf ${opname.number}?`}
                    description="Hasil hitung yang sudah diisi ikut terhapus. Stok tidak berubah."
                    url={opnameDestroy.url(opname.number)}
                />
            )}
        </AppLayout>
    );
}
