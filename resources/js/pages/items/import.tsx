import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    AlertIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    CheckIcon,
} from '@/components/icons';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, inputClasses } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { formatNumber, formatRupiah } from '@/lib/format';
import { dashboard } from '@/routes';
import {
    create as importCreate,
    store as importStore,
    template as importTemplate,
    upload as importUpload,
} from '@/routes/items/import';
import { index as itemsIndex } from '@/routes/items';

type RowStatus = 'valid' | 'duplicate' | 'error';

type ImportRow = {
    row: number;
    status: RowStatus;
    messages: string[];
    values: {
        name: string | null;
        variant: string | null;
        category: string | null;
        unit: string | null;
        location: string | null;
        minimum_stock: string | null;
        notify_low_stock: string | null;
        description: string | null;
        opening_stock: string | null;
        unit_price: string | null;
    };
};

type Preview = {
    token: string;
    rows: ImportRow[];
    counts: Record<RowStatus, number>;
    has_opening_stock: boolean;
};

type ItemImportProps = {
    preview: Preview | null;
    maxRows: number;
    today?: string;
};

const statusLabel: Record<RowStatus, string> = {
    valid: 'Siap diimpor',
    duplicate: 'Sudah ada',
    error: 'Perlu diperbaiki',
};

const statusTone = {
    valid: 'green',
    duplicate: 'gray',
    error: 'red',
} as const;

export default function ItemImport({
    preview,
    maxRows,
    today,
}: ItemImportProps) {
    return (
        <AppLayout
            title="Import Perlengkapan"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Perlengkapan Kantor', href: itemsIndex.url() },
                { title: 'Import Excel' },
            ]}
        >
            <PageHeader
                title="Import Perlengkapan dari Excel"
                description="Tambahkan banyak perlengkapan kantor sekaligus: unduh template, isi di Excel, lalu unggah kembali."
                actions={
                    <a
                        href={importTemplate.url()}
                        className={buttonClasses('outline')}
                    >
                        <ArrowDownTrayIcon className="size-[18px]" />
                        Unduh template
                    </a>
                }
            />

            {preview ? (
                <PreviewStep preview={preview} today={today ?? ''} />
            ) : (
                <UploadStep maxRows={maxRows} />
            )}
        </AppLayout>
    );
}

function UploadStep({ maxRows }: { maxRows: number }) {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <Card>
                <CardHeader
                    title="Unggah file"
                    description="File .xlsx dari template, maksimal 5 MB."
                />
                <Form
                    {...importUpload.form()}
                    className="flex flex-col gap-4 px-5 pb-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="File Excel"
                                htmlFor="file"
                                error={errors.file}
                            >
                                <input
                                    id="file"
                                    name="file"
                                    type="file"
                                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    aria-invalid={Boolean(errors.file)}
                                    className={`${inputClasses} h-auto py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-brand-700`}
                                />
                            </Field>
                            <div>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    icon={
                                        <ArrowUpTrayIcon className="size-[18px]" />
                                    }
                                >
                                    {processing
                                        ? 'Memeriksa file…'
                                        : 'Periksa file'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Card>

            <Card>
                <CardHeader title="Cara mengisi" />
                <ol className="flex list-decimal flex-col gap-2 px-5 pb-5 pl-10 text-sm text-ink-700">
                    <li>
                        Unduh template. Sheet <b>Daftar Kategori</b> berisi kode
                        jenis barang yang bisa dipakai (mis. HVS, TSU).
                    </li>
                    <li>
                        Isi satu barang per baris di sheet <b>Barang</b>. Kolom
                        bertanda * wajib diisi.
                    </li>
                    <li>
                        Kode barang dibuat otomatis, mis.
                        INVESTA-PLK-2025-ATK-HVS-001. Isi <b>Stok Awal</b> dan{' '}
                        <b>Harga Satuan</b> bila barang sudah ada di gudang.
                    </li>
                    <li>
                        Unggah file. Anda akan melihat pratinjau sebelum data
                        disimpan. Maksimal {formatNumber(maxRows)} baris.
                    </li>
                </ol>
            </Card>
        </div>
    );
}

function PreviewStep({ preview, today }: { preview: Preview; today: string }) {
    const [filter, setFilter] = useState<RowStatus | 'all'>(
        preview.counts.error > 0 ? 'error' : 'all',
    );
    const shownRows =
        filter === 'all'
            ? preview.rows
            : preview.rows.filter((row) => row.status === filter);
    const skipped = preview.counts.duplicate + preview.counts.error;

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryButton
                    label="Siap diimpor"
                    count={preview.counts.valid}
                    tone="text-ok"
                    active={filter === 'valid'}
                    onClick={() =>
                        setFilter(filter === 'valid' ? 'all' : 'valid')
                    }
                />
                <SummaryButton
                    label="Sudah ada (dilewati)"
                    count={preview.counts.duplicate}
                    tone="text-ink-700"
                    active={filter === 'duplicate'}
                    onClick={() =>
                        setFilter(filter === 'duplicate' ? 'all' : 'duplicate')
                    }
                />
                <SummaryButton
                    label="Perlu diperbaiki (dilewati)"
                    count={preview.counts.error}
                    tone="text-low-ink"
                    active={filter === 'error'}
                    onClick={() =>
                        setFilter(filter === 'error' ? 'all' : 'error')
                    }
                />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
                <table className="w-full min-w-[920px] text-sm">
                    <thead>
                        <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                            <th className="py-3.5 pr-3 pl-5 font-medium">
                                Baris
                            </th>
                            <th className="px-3 py-3.5 font-medium">Barang</th>
                            <th className="px-3 py-3.5 font-medium">
                                Jenis Barang
                            </th>
                            <th className="px-3 py-3.5 font-medium">Satuan</th>
                            <th className="px-3 py-3.5 text-right font-medium">
                                Stok Awal
                            </th>
                            <th className="px-3 py-3.5 text-right font-medium">
                                Harga Satuan
                            </th>
                            <th className="py-3.5 pr-5 pl-3 font-medium">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                        {shownRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-5 py-8 text-center text-ink-500"
                                >
                                    {preview.rows.length === 0
                                        ? 'File tidak berisi baris barang. Isi sheet "Barang" di bawah judul kolom.'
                                        : 'Tidak ada baris dengan status ini.'}
                                </td>
                            </tr>
                        )}
                        {shownRows.map((row) => (
                            <tr key={row.row} className="align-top">
                                <td className="py-3 pr-3 pl-5 text-ink-500 tabular-nums">
                                    {row.row}
                                </td>
                                <td className="px-3 py-3">
                                    <div className="font-semibold text-ink-900">
                                        {row.values.name ?? (
                                            <span className="font-normal text-ink-400 italic">
                                                (tanpa nama)
                                            </span>
                                        )}
                                        {row.values.variant && (
                                            <span className="font-normal text-ink-500">
                                                {' '}
                                                · {row.values.variant}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-ink-400">
                                        Kode otomatis
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-ink-700">
                                    {row.values.category ?? '—'}
                                </td>
                                <td className="px-3 py-3 text-ink-700">
                                    {row.values.unit ?? '—'}
                                </td>
                                <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                    {row.values.opening_stock ?? '—'}
                                </td>
                                <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                    {formatPrice(row.values.unit_price)}
                                </td>
                                <td className="py-3 pr-5 pl-3">
                                    <div className="flex flex-col items-start gap-1.5">
                                        <Badge
                                            tone={statusTone[row.status]}
                                            variant="soft"
                                        >
                                            {row.status === 'valid' ? (
                                                <CheckIcon className="size-3.5" />
                                            ) : (
                                                row.status === 'error' && (
                                                    <AlertIcon className="size-3.5" />
                                                )
                                            )}
                                            {statusLabel[row.status]}
                                        </Badge>
                                        {row.messages.length > 0 && (
                                            <ul className="flex flex-col gap-0.5 text-xs text-ink-500">
                                                {row.messages.map((message) => (
                                                    <li key={message}>
                                                        {message}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Card>
                <Form
                    {...importStore.form(preview.token)}
                    className="flex flex-wrap items-end justify-between gap-4 p-5"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="flex flex-col gap-3">
                                <p className="text-sm text-ink-700">
                                    {preview.counts.valid > 0 ? (
                                        <>
                                            <b>
                                                {formatNumber(
                                                    preview.counts.valid,
                                                )}{' '}
                                                barang
                                            </b>{' '}
                                            akan ditambahkan
                                            {skipped > 0 &&
                                                `, ${formatNumber(skipped)} baris dilewati`}
                                            . Perbaiki baris yang bermasalah di
                                            Excel lalu unggah ulang bila ingin
                                            ikut diimpor.
                                        </>
                                    ) : (
                                        'Belum ada baris yang bisa diimpor. Perbaiki file di Excel lalu unggah ulang.'
                                    )}
                                </p>
                                {preview.has_opening_stock && (
                                    <div className="max-w-xs">
                                        <Field
                                            label="Tanggal stok awal"
                                            htmlFor="transacted_on"
                                            hint="dicatat sebagai Barang Masuk"
                                            error={errors.transacted_on}
                                        >
                                            <input
                                                id="transacted_on"
                                                name="transacted_on"
                                                type="date"
                                                max={today}
                                                defaultValue={today}
                                                aria-invalid={Boolean(
                                                    errors.transacted_on,
                                                )}
                                                className={inputClasses}
                                            />
                                        </Field>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <ButtonLink
                                    href={importCreate.url()}
                                    variant="ghost"
                                >
                                    Ganti file
                                </ButtonLink>
                                <Button
                                    type="submit"
                                    disabled={
                                        processing || preview.counts.valid === 0
                                    }
                                    icon={<CheckIcon className="size-[18px]" />}
                                >
                                    {processing
                                        ? 'Menyimpan…'
                                        : `Simpan ${formatNumber(preview.counts.valid)} barang`}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </Card>
        </div>
    );
}

function SummaryButton({
    label,
    count,
    tone,
    active,
    onClick,
}: {
    label: string;
    count: number;
    tone: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex flex-col items-start gap-1 rounded-2xl border bg-white px-5 py-4 text-left transition-colors hover:border-brand-200 ${active ? 'border-brand-500 ring-3 ring-brand-100' : 'border-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]'}`}
        >
            <span className="text-[13px] text-ink-500">{label}</span>
            <span className={`text-2xl font-semibold tabular-nums ${tone}`}>
                {formatNumber(count)}
            </span>
        </button>
    );
}

function formatPrice(value: string | null): string {
    if (value === null) {
        return '—';
    }

    const number = Number(value);

    return Number.isFinite(number) ? formatRupiah(number) : value;
}
