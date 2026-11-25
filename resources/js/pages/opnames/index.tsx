import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ClipboardIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputClasses } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { ListPagination, usePaginatedRows } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    show as opnameShow,
    store as opnameStore,
} from '@/routes/stock-opnames';

type OpnameSummary = {
    number: string;
    counted_on: string;
    scope: string;
    status: { value: 'draf' | 'selesai'; label: string };
    created_by: string | null;
    adjustment_number: string | null;
    line_count: number;
    counted_count: number;
    difference_count: number;
    difference_value: number;
};

type OpnamesIndexProps = {
    opnames: OpnameSummary[];
    categories: { id: number; name: string; items_count: number }[];
    today: string;
};

export default function OpnamesIndex({
    opnames,
    categories,
    today,
}: OpnamesIndexProps) {
    const [isStarting, setIsStarting] = useState(false);
    const paginated = usePaginatedRows(opnames, 'opnames');
    const totalItems = categories.reduce(
        (total, category) => total + category.items_count,
        0,
    );

    return (
        <AppLayout
            title="Cek Stok"
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Cek Stok' },
            ]}
        >
            <PageHeader
                title="Cek Stok"
                description="Hitung fisik barang di gudang, lalu cocokkan dengan stok di sistem. Selisihnya dicatat otomatis sebagai penyesuaian."
                actions={
                    <Button
                        icon={<PlusIcon className="size-[18px]" />}
                        onClick={() => setIsStarting(true)}
                    >
                        Mulai cek stok
                    </Button>
                }
            />

            {opnames.length === 0 ? (
                <div className="rounded-2xl bg-white">
                    <EmptyState
                        title="Belum ada cek stok"
                        description="Mulai cek stok untuk membuat lembar hitung berisi semua barang atau satu kategori saja."
                        action={
                            <Button
                                variant="soft"
                                size="sm"
                                onClick={() => setIsStarting(true)}
                            >
                                Mulai cek stok pertama
                            </Button>
                        }
                    />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                        {paginated.rows.map((opname) => {
                            const progress =
                                opname.line_count > 0
                                    ? (opname.counted_count /
                                          opname.line_count) *
                                      100
                                    : 0;
                            const isDraft = opname.status.value === 'draf';

                            return (
                                <Link
                                    key={opname.number}
                                    href={opnameShow.url(opname.number)}
                                    className="group flex flex-col gap-4 rounded-2xl border border-white bg-white p-5 shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)] transition-shadow hover:shadow-[0_1px_2px_rgba(18,24,38,0.04),0_16px_32px_-16px_rgba(22,121,201,0.3)]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={cn(
                                                    'flex size-11 items-center justify-center rounded-xl',
                                                    isDraft
                                                        ? 'bg-service/10 text-service'
                                                        : 'bg-ok/10 text-ok',
                                                )}
                                            >
                                                <ClipboardIcon className="size-5" />
                                            </span>
                                            <span className="flex flex-col">
                                                <span className="font-semibold text-ink-900 group-hover:text-brand-700">
                                                    {opname.number}
                                                </span>
                                                <span className="text-xs text-ink-500">
                                                    {formatDate(
                                                        opname.counted_on,
                                                    )}{' '}
                                                    · {opname.scope}
                                                </span>
                                            </span>
                                        </div>
                                        <Badge
                                            tone={isDraft ? 'amber' : 'green'}
                                            variant="soft"
                                        >
                                            {isDraft
                                                ? 'Draf'
                                                : opname.status.label}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-xs text-ink-500">
                                            <span>Sudah dihitung</span>
                                            <span className="font-semibold text-ink-900 tabular-nums">
                                                {opname.counted_count} /{' '}
                                                {opname.line_count} barang
                                            </span>
                                        </div>
                                        <span className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                                            <span
                                                className={cn(
                                                    'block h-full rounded-full',
                                                    isDraft
                                                        ? 'bg-brand-600'
                                                        : 'bg-ok',
                                                )}
                                                style={{
                                                    width: `${progress}%`,
                                                }}
                                            />
                                        </span>
                                    </div>

                                    <dl className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 text-sm">
                                        <div className="flex flex-col gap-0.5">
                                            <dt className="text-xs text-ink-500">
                                                Barang selisih
                                            </dt>
                                            <dd className="font-semibold text-ink-900 tabular-nums">
                                                {opname.difference_count}
                                            </dd>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <dt className="text-xs text-ink-500">
                                                Nilai selisih
                                            </dt>
                                            <dd
                                                className={cn(
                                                    'font-semibold tabular-nums',
                                                    opname.difference_value < 0
                                                        ? 'text-low'
                                                        : opname.difference_value >
                                                            0
                                                          ? 'text-ok'
                                                          : 'text-ink-900',
                                                )}
                                            >
                                                {opname.difference_value > 0 &&
                                                    '+'}
                                                {formatRupiah(
                                                    opname.difference_value,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>

                                    {opname.adjustment_number && (
                                        <p className="text-xs text-ink-500">
                                            Penyesuaian:{' '}
                                            <span className="font-semibold text-ink-700">
                                                {opname.adjustment_number}
                                            </span>
                                        </p>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                    <ListPagination paginated={paginated} noun="cek stok" />
                </>
            )}

            <Dialog
                open={isStarting}
                onClose={() => setIsStarting(false)}
                title="Mulai cek stok"
                description="Sistem membuat lembar hitung berisi barang yang dipilih. Hasil hitung bisa disimpan bertahap sebagai draf."
                icon={
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                        <ClipboardIcon className="size-5" />
                    </span>
                }
            >
                <Form {...opnameStore.form()} className="flex flex-col gap-4">
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="Barang yang dihitung"
                                htmlFor="opname-category"
                                error={errors.category_id}
                            >
                                <Select
                                    id="opname-category"
                                    name="category_id"
                                    defaultValue=""
                                    options={[
                                        {
                                            value: '',
                                            label: 'Semua barang',
                                            description: `${totalItems} barang`,
                                        },
                                        ...categories.map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                            description: `${category.items_count} barang`,
                                        })),
                                    ]}
                                />
                            </Field>
                            <Field
                                label="Tanggal hitung"
                                htmlFor="opname-date"
                                error={errors.counted_on}
                            >
                                <input
                                    id="opname-date"
                                    name="counted_on"
                                    type="date"
                                    max={today}
                                    defaultValue={today}
                                    required
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="Catatan"
                                htmlFor="opname-notes"
                                hint="Opsional"
                                error={errors.notes}
                            >
                                <input
                                    id="opname-notes"
                                    name="notes"
                                    placeholder="Contoh: cek stok akhir bulan November"
                                    className={inputClasses}
                                />
                            </Field>
                            <DialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsStarting(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Membuat…'
                                        : 'Buat lembar hitung'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </Dialog>
        </AppLayout>
    );
}
