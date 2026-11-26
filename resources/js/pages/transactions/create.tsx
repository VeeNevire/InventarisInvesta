import { Link, useForm } from '@inertiajs/react';
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    AlertIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BoxIcon,
    ImageIcon,
    PlusIcon,
    RefreshIcon,
    SearchIcon,
    TrashIcon,
    XIcon,
} from '@/components/icons';
import type {
    EmployeeChoice,
    EmployeeOption,
} from '@/components/employee-picker';
import { EmployeePicker } from '@/components/employee-picker';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import AppLayout from '@/layouts/app-layout';
import { formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as transactionsIndex } from '@/routes/transactions';
import { store as incomingStore } from '@/routes/transactions/incoming';
import { store as outgoingStore } from '@/routes/transactions/outgoing';
import type { FormItemOption } from '@/types';
import { Select } from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';
import { FormNotes } from '@/components/form-notes';

type TransactionCreateProps = {
    type: 'masuk' | 'keluar';
    today: string;
    items: FormItemOption[];
    preselectedItem: string | null;
    suppliers: string[];
    pics: string[];
    employees: EmployeeOption[];
    divisions: { id: number; name: string }[];
    categories: { id: number; code: string; name: string }[];
    units: string[];
};

type NewItemInput = {
    name: string;
    variant: string;
    category_id: string;
    unit: string;
    location: string;
    minimum_stock: string;
};

type LineInput = {
    key: string;
    item_id: number | null;
    new_item: NewItemInput | null;
    quantity: string;
    unit_price: string;
    /** Typed subtotal from the receipt; empty means quantity × unit price. */
    subtotal: string;
    /** Optional photo of the item, only used when it has none yet. */
    photo: File | null;
};

type FormData = {
    transacted_on: string;
    purchased_on: string;
    supplier_name: string;
    pic_name: string;
    receipt: File | null;
    employee: EmployeeChoice | null;
    purpose: string;
    notes: string;
    lines: LineInput[];
};

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const inputClasses =
    'h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-invalid:border-low';

let lineCounter = 0;

function nextKey(): string {
    lineCounter += 1;

    return `line-${lineCounter}`;
}

export default function TransactionCreate({
    type,
    today,
    items,
    preselectedItem,
    suppliers,
    employees,
    pics,
    divisions,
    categories,
    units,
}: TransactionCreateProps) {
    const isIncoming = type === 'masuk';
    const itemsById = useMemo(
        () => new Map(items.map((item) => [item.id, item])),
        [items],
    );

    const initialItem = items.find((item) => item.code === preselectedItem);

    const form = useForm<FormData>({
        transacted_on: today,
        purchased_on: today,
        supplier_name: '',
        pic_name: '',
        receipt: null,
        employee: null,
        purpose: '',
        notes: '',
        lines: initialItem ? [existingLine(initialItem, isIncoming)] : [],
    });

    const errors = form.errors as Record<string, string | undefined>;

    function addExistingItem(item: FormItemOption) {
        form.setData('lines', [
            ...form.data.lines,
            existingLine(item, isIncoming),
        ]);
    }

    function addNewItem(name: string) {
        form.setData('lines', [
            ...form.data.lines,
            {
                key: nextKey(),
                item_id: null,
                new_item: {
                    name,
                    variant: '',
                    category_id:
                        categories.length === 1 ? String(categories[0].id) : '',
                    unit: 'pcs',
                    location: '',
                    minimum_stock: '',
                },
                quantity: '',
                unit_price: '',
                subtotal: '',
                photo: null,
            },
        ]);
    }

    function updateLine(index: number, changes: Partial<LineInput>) {
        form.setData(
            'lines',
            form.data.lines.map((line, lineIndex) =>
                lineIndex === index ? { ...line, ...changes } : line,
            ),
        );
    }

    function removeLine(index: number) {
        form.setData(
            'lines',
            form.data.lines.filter((_, lineIndex) => lineIndex !== index),
        );
    }

    const summary = form.data.lines.reduce(
        (totals, line) => {
            const item = line.item_id ? itemsById.get(line.item_id) : null;
            const quantity = Number(line.quantity) || 0;
            const value = isIncoming
                ? lineSubtotal(line)
                : quantity * (item?.average_price ?? 0);

            return {
                quantity: totals.quantity + quantity,
                value: totals.value + value,
            };
        },
        { quantity: 0, value: 0 },
    );

    const overdrawnLines = isIncoming
        ? []
        : form.data.lines.filter((line) => {
              const item = line.item_id ? itemsById.get(line.item_id) : null;

              return item ? Number(line.quantity) > item.current_stock : false;
          });

    const belowMinimumAfter = isIncoming
        ? []
        : form.data.lines
              .map((line) => ({
                  line,
                  item: line.item_id ? itemsById.get(line.item_id) : undefined,
              }))
              .filter(
                  ({ line, item }) =>
                      item &&
                      item.minimum_stock > 0 &&
                      item.current_stock - (Number(line.quantity) || 0) <=
                          item.minimum_stock &&
                      Number(line.quantity) <= item.current_stock,
              );

    const newItemCount = form.data.lines.filter((line) => line.new_item).length;

    function submit(event: FormEvent) {
        event.preventDefault();

        form.transform((data) => ({
            transacted_on: data.transacted_on,
            notes: data.notes,
            pic_name: data.pic_name,
            ...(isIncoming
                ? {
                      purchased_on: data.purchased_on,
                      supplier_name: data.supplier_name,
                      receipt: data.receipt,
                  }
                : {
                      purpose: data.purpose,
                      employee_id:
                          data.employee?.kind === 'existing'
                              ? data.employee.id
                              : null,
                      new_employee_name:
                          data.employee?.kind === 'new'
                              ? data.employee.name
                              : null,
                      new_employee_division_id:
                          data.employee?.kind === 'new'
                              ? data.employee.divisionId || null
                              : null,
                  }),
            lines: data.lines.map((line) => ({
                quantity: line.quantity,
                ...(line.item_id
                    ? { item_id: line.item_id }
                    : { new_item: line.new_item }),
                ...(isIncoming ? { unit_price: effectiveUnitPrice(line) } : {}),
                ...(isIncoming && line.photo ? { photo: line.photo } : {}),
            })),
        }));

        form.post(isIncoming ? incomingStore.url() : outgoingStore.url(), {
            preserveScroll: true,
        });
    }

    const title = isIncoming ? 'Catat Barang Masuk' : 'Catat Barang Keluar';

    return (
        <AppLayout
            title={title}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Transaksi', href: transactionsIndex.url() },
                { title: isIncoming ? 'Barang masuk' : 'Barang keluar' },
            ]}
        >
            <PageHeader
                eyebrow={
                    <span
                        className={cn(
                            'inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
                            isIncoming
                                ? 'bg-ok/10 text-ok'
                                : 'bg-brand-50 text-brand-700',
                        )}
                    >
                        {isIncoming ? (
                            <ArrowDownTrayIcon className="size-3.5" />
                        ) : (
                            <ArrowUpTrayIcon className="size-3.5" />
                        )}
                        {isIncoming ? 'Menambah stok' : 'Mengurangi stok'}
                    </span>
                }
                title={title}
                description={
                    isIncoming
                        ? 'Catat barang yang datang ke gudang beserta foto notanya. Barang yang belum terdaftar bisa langsung ditambahkan di sini.'
                        : 'Catat barang yang diambil dari gudang, siapa penerimanya, dan untuk apa.'
                }
            />

            {isIncoming ? (
                <FormNotes
                    id="incoming"
                    dos={[
                        'Hitung barang yang datang dan catat jumlah yang benar-benar diterima.',
                        'Foto notanya dan lampirkan, supaya bisa dicek lagi nanti.',
                        'Cari dulu barangnya di daftar sebelum menambah barang baru.',
                    ]}
                    donts={[
                        'Menggabungkan nota dari toko berbeda dalam satu transaksi. Catat satu nota per transaksi.',
                        'Mencatat barang yang baru dipesan tapi belum datang.',
                    ]}
                />
            ) : (
                <FormNotes
                    id="outgoing"
                    dos={[
                        'Catat saat barang diambil, jangan ditunda.',
                        'Tulis keperluan yang jelas, misalnya nama klien atau acara.',
                        'Pastikan nama penerima sesuai orang yang mengambil barang.',
                    ]}
                    donts={[
                        'Ada barang yang keluar tanpa dicatat, karena stok jadi tidak cocok saat cek stok.',
                        'Mengambil melebihi kebutuhan. Sisa yang tidak terpakai kembalikan lewat Barang Masuk.',
                    ]}
                />
            )}

            <form
                onSubmit={submit}
                className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
                noValidate
            >
                <div className="flex min-w-0 flex-col gap-4">
                    <Card>
                        <CardHeader title="Detail transaksi" />
                        <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
                            <Field
                                label="Tanggal terima barang"
                                htmlFor="transacted_on"
                                error={errors.transacted_on}
                            >
                                <input
                                    id="transacted_on"
                                    type="date"
                                    max={today}
                                    value={form.data.transacted_on}
                                    onChange={(event) =>
                                        form.setData(
                                            'transacted_on',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(errors.transacted_on)}
                                    className={inputClasses}
                                />
                            </Field>

                            {isIncoming ? (
                                <>
                                    <Field
                                        label="Tanggal pembelian"
                                        htmlFor="purchased_on"
                                        error={errors.purchased_on}
                                    >
                                        <input
                                            id="purchased_on"
                                            type="date"
                                            max={form.data.transacted_on}
                                            value={form.data.purchased_on}
                                            onChange={(event) =>
                                                form.setData(
                                                    'purchased_on',
                                                    event.target.value,
                                                )
                                            }
                                            aria-invalid={Boolean(
                                                errors.purchased_on,
                                            )}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <Field
                                        label="Supplier / sumber barang"
                                        htmlFor="supplier_name"
                                        hint="Ketik bebas"
                                        error={errors.supplier_name}
                                    >
                                        <Autocomplete
                                            id="supplier_name"
                                            value={form.data.supplier_name}
                                            onChange={(supplier) =>
                                                form.setData(
                                                    'supplier_name',
                                                    supplier,
                                                )
                                            }
                                            options={suppliers}
                                            placeholder="Contoh: CV Cetak Prima"
                                            invalid={Boolean(
                                                errors.supplier_name,
                                            )}
                                        />
                                    </Field>
                                    <Field
                                        label="PIC / yang menerima barang"
                                        htmlFor="pic_name"
                                        hint="Pilih dari karyawan atau pengguna"
                                        error={errors.pic_name}
                                    >
                                        <Select
                                            id="pic_name"
                                            value={form.data.pic_name}
                                            onChange={(pic) =>
                                                form.setData('pic_name', pic)
                                            }
                                            invalid={Boolean(errors.pic_name)}
                                            placeholder="Pilih PIC"
                                            options={pics.map((pic) => ({
                                                value: pic,
                                                label: pic,
                                            }))}
                                        />
                                    </Field>
                                </>
                            ) : (
                                <>
                                    <Field
                                        label="PIC / yang mengeluarkan barang"
                                        htmlFor="pic_name"
                                        hint="Pilih dari karyawan atau pengguna"
                                        error={errors.pic_name}
                                    >
                                        <Select
                                            id="pic_name"
                                            value={form.data.pic_name}
                                            onChange={(pic) =>
                                                form.setData('pic_name', pic)
                                            }
                                            invalid={Boolean(errors.pic_name)}
                                            placeholder="Pilih PIC"
                                            options={pics.map((pic) => ({
                                                value: pic,
                                                label: pic,
                                            }))}
                                        />
                                    </Field>
                                    <Field
                                        label="Penerima"
                                        htmlFor="employee-picker"
                                        hint="Belum ada? Ketik namanya"
                                    >
                                        <EmployeePicker
                                            id="employee-picker"
                                            employees={employees}
                                            divisions={divisions}
                                            value={form.data.employee}
                                            onChange={(employee) =>
                                                form.setData(
                                                    'employee',
                                                    employee,
                                                )
                                            }
                                            error={
                                                errors.employee_id ??
                                                errors.new_employee_name
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Keperluan"
                                        htmlFor="purpose"
                                        error={errors.purpose}
                                    >
                                        <input
                                            id="purpose"
                                            value={form.data.purpose}
                                            onChange={(event) =>
                                                form.setData(
                                                    'purpose',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Contoh: Hampers klien PT Andalas"
                                            aria-invalid={Boolean(
                                                errors.purpose,
                                            )}
                                            className={inputClasses}
                                        />
                                    </Field>
                                </>
                            )}

                            <Field
                                label="Catatan"
                                htmlFor="notes"
                                hint="Opsional"
                                error={errors.notes}
                            >
                                <input
                                    id="notes"
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                    className={inputClasses}
                                />
                            </Field>

                            {isIncoming && (
                                <div className="md:col-span-2">
                                    <ReceiptUpload
                                        file={form.data.receipt}
                                        error={errors.receipt}
                                        onChange={(file) =>
                                            form.setData('receipt', file)
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Daftar barang"
                            description={
                                isIncoming
                                    ? 'Cari barang yang sudah terdaftar. Kalau belum ada, ketik namanya lalu pilih “Tambah barang baru”.'
                                    : 'Cari barang lalu isi jumlah yang diambil. Sisa stok ditampilkan agar tidak melebihi.'
                            }
                        />
                        <div className="flex flex-col gap-4 px-5 pb-5">
                            <ItemPicker
                                items={items}
                                excludedIds={form.data.lines.flatMap((line) =>
                                    line.item_id ? [line.item_id] : [],
                                )}
                                onPick={addExistingItem}
                                onCreate={isIncoming ? addNewItem : undefined}
                            />

                            {errors.lines && (
                                <p className="text-sm text-low-ink">
                                    {errors.lines}
                                </p>
                            )}

                            {form.data.lines.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 px-6 py-10 text-center">
                                    <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                                        <BoxIcon />
                                    </span>
                                    <p className="text-sm font-medium text-ink-900">
                                        Belum ada barang
                                    </p>
                                    <p className="text-[13px] text-ink-500">
                                        Ketik nama atau kode barang di kolom
                                        pencarian di atas.
                                    </p>
                                    {isIncoming && (
                                        <Button
                                            variant="soft"
                                            size="sm"
                                            icon={
                                                <PlusIcon className="size-4" />
                                            }
                                            onClick={() => addNewItem('')}
                                            className="mt-1"
                                        >
                                            Tambah barang baru
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-3">
                                    {form.data.lines.map((line, index) => (
                                        <LineRow
                                            key={line.key}
                                            index={index}
                                            item={
                                                line.item_id
                                                    ? (itemsById.get(
                                                          line.item_id,
                                                      ) ?? null)
                                                    : null
                                            }
                                            line={line}
                                            isIncoming={isIncoming}
                                            categories={categories}
                                            units={units}
                                            errorFor={(field) =>
                                                errors[
                                                    `lines.${index}.${field}`
                                                ]
                                            }
                                            onChange={(changes) =>
                                                updateLine(index, changes)
                                            }
                                            onRemove={() => removeLine(index)}
                                        />
                                    ))}
                                </ul>
                            )}

                            {isIncoming && form.data.lines.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => addNewItem('')}
                                    className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                                >
                                    <PlusIcon className="size-4" />
                                    Barang belum terdaftar? Tambah barang baru
                                </button>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-4 xl:sticky xl:top-4">
                    <Card className="flex flex-col gap-4 p-5">
                        <h2 className="text-base font-semibold text-ink-900">
                            Ringkasan
                        </h2>
                        <dl className="flex flex-col divide-y divide-ink-100 text-sm">
                            <div className="flex justify-between py-2.5">
                                <dt className="text-ink-500">Jenis barang</dt>
                                <dd className="font-semibold text-ink-900 tabular-nums">
                                    {form.data.lines.length}
                                    {newItemCount > 0 && (
                                        <span className="font-normal text-ink-500">
                                            {' '}
                                            ({newItemCount} baru)
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between py-2.5">
                                <dt className="text-ink-500">Total jumlah</dt>
                                <dd className="font-semibold text-ink-900 tabular-nums">
                                    {formatNumber(summary.quantity)}
                                </dd>
                            </div>
                            <div className="flex justify-between py-2.5">
                                <dt className="text-ink-500">
                                    {isIncoming
                                        ? 'Total nilai'
                                        : 'Perkiraan nilai'}
                                </dt>
                                <dd className="font-semibold text-ink-900 tabular-nums">
                                    {formatRupiah(summary.value)}
                                </dd>
                            </div>
                            {isIncoming && (
                                <div className="flex justify-between py-2.5">
                                    <dt className="text-ink-500">Foto nota</dt>
                                    <dd
                                        className={cn(
                                            'font-semibold',
                                            form.data.receipt
                                                ? 'text-ok'
                                                : 'text-ink-400',
                                        )}
                                    >
                                        {form.data.receipt
                                            ? 'Terlampir'
                                            : 'Belum ada'}
                                    </dd>
                                </div>
                            )}
                        </dl>

                        {overdrawnLines.length > 0 && (
                            <Notice tone="red">
                                {overdrawnLines.length} barang melebihi sisa
                                stok. Kurangi jumlahnya sebelum menyimpan.
                            </Notice>
                        )}

                        {belowMinimumAfter.length > 0 && (
                            <Notice tone="amber">
                                Setelah disimpan,{' '}
                                {belowMinimumAfter
                                    .map(({ item }) => item?.name)
                                    .join(', ')}{' '}
                                akan berada di bawah stok minimum.
                            </Notice>
                        )}

                        <Button
                            type="submit"
                            disabled={
                                form.processing ||
                                form.data.lines.length === 0 ||
                                overdrawnLines.length > 0
                            }
                            className="h-12 w-full"
                        >
                            {form.processing
                                ? 'Menyimpan…'
                                : isIncoming
                                  ? 'Simpan barang masuk'
                                  : 'Simpan barang keluar'}
                        </Button>
                        {form.progress && (
                            <progress
                                value={form.progress.percentage}
                                max={100}
                                className="h-1.5 w-full overflow-hidden rounded-full accent-brand-600"
                            >
                                {form.progress.percentage}%
                            </progress>
                        )}
                        <Link
                            href={transactionsIndex.url()}
                            className={buttonClasses('ghost', 'md', 'w-full')}
                        >
                            Batal
                        </Link>
                    </Card>
                </div>
            </form>
        </AppLayout>
    );
}

/**
 * Subtotal of an incoming line: the typed value when given, otherwise
 * quantity × unit price.
 */
function lineSubtotal(line: LineInput): number {
    if (line.subtotal !== '') {
        return Number(line.subtotal) || 0;
    }

    return (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
}

/**
 * Unit price sent to the server. A typed subtotal wins, so the stock value
 * matches the receipt exactly.
 */
function effectiveUnitPrice(line: LineInput): string {
    const quantity = Number(line.quantity) || 0;

    if (line.subtotal !== '' && quantity > 0) {
        return (Number(line.subtotal) / quantity).toFixed(2);
    }

    return line.unit_price;
}

function existingLine(item: FormItemOption, isIncoming: boolean): LineInput {
    return {
        key: nextKey(),
        item_id: item.id,
        new_item: null,
        quantity: '',
        subtotal: '',
        photo: null,
        unit_price:
            isIncoming && item.average_price > 0
                ? String(Math.round(item.average_price))
                : '',
    };
}

function itemLabel(item: FormItemOption): string {
    return item.variant ? `${item.name} · ${item.variant}` : item.name;
}

type FieldProps = {
    label: string;
    htmlFor: string;
    hint?: string;
    error?: string;
    children: ReactNode;
};

function Field({ label, htmlFor, hint, error, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <label
                htmlFor={htmlFor}
                className="text-sm font-medium text-ink-700"
            >
                {label}
            </label>
            {children}
            {error ? (
                <p className="text-sm text-low-ink">{error}</p>
            ) : (
                hint && <p className="text-xs text-ink-500">{hint}</p>
            )}
        </div>
    );
}

function Notice({
    tone,
    children,
}: {
    tone: 'red' | 'amber';
    children: ReactNode;
}) {
    return (
        <p
            className={cn(
                'flex gap-2.5 rounded-xl px-3.5 py-3 text-[13px]',
                tone === 'red'
                    ? 'bg-low/10 text-low-ink'
                    : 'bg-service/10 text-[#92400e]',
            )}
        >
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>{children}</span>
        </p>
    );
}

type ReceiptUploadProps = {
    file: File | null;
    error?: string;
    onChange: (file: File | null) => void;
};

/**
 * Photo of the supplier's receipt (nota). Accepts a click or a dropped image
 * and shows a preview before the form is sent.
 */
function ReceiptUpload({ file, error, onChange }: ReceiptUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!file) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    function accept(candidate: File | undefined) {
        if (!candidate) {
            return;
        }

        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)
        ) {
            setLocalError('Foto nota harus JPG, PNG, atau WEBP.');

            return;
        }

        if (candidate.size > MAX_RECEIPT_BYTES) {
            setLocalError('Ukuran foto nota maksimal 5 MB.');

            return;
        }

        setLocalError(null);
        onChange(candidate);
    }

    function handleInput(event: ChangeEvent<HTMLInputElement>) {
        accept(event.target.files?.[0]);
        event.target.value = '';
    }

    const message = localError ?? error;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink-700">
                    Foto nota / bukti terima
                </span>
                <span className="text-xs text-ink-500">
                    JPG, PNG, WEBP · maks. 5 MB
                </span>
            </div>

            <input
                ref={inputRef}
                id="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInput}
                className="sr-only"
            />

            {file && preview ? (
                <div className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-3">
                    <img
                        src={preview}
                        alt="Pratinjau foto nota"
                        className="size-24 shrink-0 rounded-xl bg-ink-50 object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm font-medium text-ink-900">
                            {file.name}
                        </span>
                        <span className="text-xs text-ink-500">
                            {(file.size / 1024 / 1024).toLocaleString('id-ID', {
                                maximumFractionDigits: 1,
                            })}{' '}
                            MB
                        </span>
                        <div className="mt-1 flex gap-2">
                            <Button
                                variant="soft"
                                size="sm"
                                onClick={() => inputRef.current?.click()}
                            >
                                Ganti foto
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onChange(null)}
                                icon={<XIcon className="size-3.5" />}
                            >
                                Hapus
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <label
                    htmlFor="receipt"
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        accept(event.dataTransfer.files[0]);
                    }}
                    className={cn(
                        'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors',
                        isDragging
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-ink-200 bg-ink-50/60 hover:border-brand-300 hover:bg-brand-50/40',
                        message && 'border-low/50',
                    )}
                >
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
                        <ImageIcon />
                    </span>
                    <span className="text-sm font-semibold text-ink-900">
                        Unggah atau foto nota
                    </span>
                    <span className="text-xs text-ink-500">
                        Klik untuk memilih file, atau tarik foto ke sini. Di HP
                        bisa langsung memotret.
                    </span>
                </label>
            )}

            {message && <p className="text-sm text-low-ink">{message}</p>}
        </div>
    );
}

type ItemPickerProps = {
    items: FormItemOption[];
    excludedIds: number[];
    onPick: (item: FormItemOption) => void;
    onCreate?: (name: string) => void;
};

type PickerOption =
    { kind: 'item'; item: FormItemOption } | { kind: 'create'; name: string };

/**
 * Searchable list of items. Type to filter, use the arrow keys and Enter to
 * add an item, or click it. On incoming goods, the last option creates a new
 * item with the typed name.
 */
function ItemPicker({ items, excludedIds, onPick, onCreate }: ItemPickerProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const listId = useId();

    const normalized = query.trim().toLowerCase();
    const matches = items
        .filter((item) => !excludedIds.includes(item.id))
        .filter(
            (item) =>
                !normalized ||
                [item.name, item.variant ?? '', item.code, item.category]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalized),
        )
        .slice(0, 8);

    const options: PickerOption[] = [
        ...matches.map((item) => ({ kind: 'item' as const, item })),
        ...(onCreate && normalized
            ? [{ kind: 'create' as const, name: query.trim() }]
            : []),
    ];

    function choose(option: PickerOption) {
        if (option.kind === 'item') {
            onPick(option.item);
        } else {
            onCreate?.(option.name);
        }

        setQuery('');
        setHighlighted(0);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
            setHighlighted((current) =>
                Math.min(current + 1, options.length - 1),
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (options[highlighted]) {
                choose(options[highlighted]);
            }
        } else if (event.key === 'Escape') {
            setIsOpen(false);
        }
    }

    return (
        <div className="relative">
            <label htmlFor="item-picker" className="sr-only">
                Tambah barang
            </label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-3.5 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-brand-100">
                <SearchIcon className="size-[18px] text-ink-500" />
                <input
                    id="item-picker"
                    role="combobox"
                    aria-expanded={isOpen && options.length > 0}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    autoComplete="off"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                        setHighlighted(0);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setIsOpen(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik nama atau kode barang untuk menambahkan…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
            </div>

            {isOpen && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute inset-x-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-ink-200 bg-white p-1.5 shadow-xl"
                >
                    {options.length === 0 && (
                        <li className="px-3 py-4 text-center text-sm text-ink-500">
                            {excludedIds.length === items.length
                                ? 'Semua barang sudah ditambahkan.'
                                : 'Barang tidak ditemukan.'}
                        </li>
                    )}
                    {options.map((option, index) => (
                        <li
                            key={
                                option.kind === 'item'
                                    ? option.item.id
                                    : 'create'
                            }
                            role="option"
                            aria-selected={index === highlighted}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(option);
                            }}
                            onMouseEnter={() => setHighlighted(index)}
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
                                index === highlighted && 'bg-brand-50',
                                option.kind === 'create' &&
                                    'mt-1 border-t border-ink-100',
                            )}
                        >
                            {option.kind === 'item' ? (
                                <>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-media text-brand-500">
                                        <BoxIcon className="size-4" />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-sm font-medium text-ink-900">
                                            {itemLabel(option.item)}
                                        </span>
                                        <span className="text-xs text-ink-500">
                                            {option.item.code} ·{' '}
                                            {option.item.category}
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            'text-xs font-semibold tabular-nums',
                                            option.item.current_stock <= 0
                                                ? 'text-ink-400'
                                                : option.item.current_stock <=
                                                    option.item.minimum_stock
                                                  ? 'text-low'
                                                  : 'text-ink-700',
                                        )}
                                    >
                                        Sisa{' '}
                                        {formatNumber(
                                            option.item.current_stock,
                                        )}{' '}
                                        {option.item.unit}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white">
                                        <PlusIcon className="size-4" />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-sm font-semibold text-brand-700">
                                            Tambah barang baru “{option.name}”
                                        </span>
                                        <span className="text-xs text-ink-500">
                                            Barang belum terdaftar, akan dibuat
                                            saat transaksi disimpan
                                        </span>
                                    </span>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

type LineRowProps = {
    index: number;
    item: FormItemOption | null;
    line: LineInput;
    isIncoming: boolean;
    categories: { id: number; code: string; name: string }[];
    units: string[];
    errorFor: (field: string) => string | undefined;
    onChange: (changes: Partial<LineInput>) => void;
    onRemove: () => void;
};

function LineRow({
    index,
    item,
    line,
    isIncoming,
    categories,
    units,
    errorFor,
    onChange,
    onRemove,
}: LineRowProps) {
    const quantity = Number(line.quantity) || 0;
    const currentStock = item?.current_stock ?? 0;
    const stockAfter = isIncoming
        ? currentStock + quantity
        : currentStock - quantity;
    const isOverdrawn = !isIncoming && item !== null && quantity > currentStock;
    const price = isIncoming
        ? Number(line.unit_price) || 0
        : (item?.average_price ?? 0);
    const unit = item?.unit ?? (line.new_item?.unit || 'unit');
    const isManualSubtotal = isIncoming && line.subtotal !== '';
    const manualDiffers =
        isManualSubtotal &&
        quantity > 0 &&
        Math.abs(Number(line.subtotal) - quantity * price) >= 1;
    const newItem = line.new_item;
    const category = categories.find(
        (option) => String(option.id) === newItem?.category_id,
    );

    function updateNewItem(changes: Partial<NewItemInput>) {
        if (newItem) {
            onChange({ new_item: { ...newItem, ...changes } });
        }
    }

    const lineErrors = [
        errorFor('photo'),
        errorFor('item_id'),
        errorFor('quantity'),
        errorFor('unit_price'),
    ].filter(Boolean);

    return (
        <li
            className={cn(
                'flex flex-col gap-4 rounded-2xl border p-4',
                isOverdrawn
                    ? 'border-low/40 bg-low/[0.03]'
                    : newItem
                      ? 'border-brand-200 bg-brand-50/40'
                      : 'border-ink-200',
            )}
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        <PhotoSlot
                            id={`line-${index}-photo`}
                            existingUrl={item?.image_url ?? null}
                            file={line.photo}
                            canUpload={isIncoming}
                            onChange={(photo) => onChange({ photo })}
                        />
                        <div className="flex min-w-0 flex-col gap-1">
                            {item ? (
                                <>
                                    <span className="truncate font-semibold text-ink-900">
                                        {itemLabel(item)}
                                    </span>
                                    <span className="text-xs text-ink-500">
                                        {item.code} · sisa{' '}
                                        {formatNumber(item.current_stock)}{' '}
                                        {item.unit}
                                        {quantity > 0 && (
                                            <>
                                                {' '}
                                                →{' '}
                                                <strong
                                                    className={cn(
                                                        'font-semibold',
                                                        isOverdrawn
                                                            ? 'text-low'
                                                            : stockAfter <=
                                                                    item.minimum_stock &&
                                                                !isIncoming
                                                              ? 'text-service'
                                                              : 'text-ink-900',
                                                    )}
                                                >
                                                    {formatNumber(stockAfter)}{' '}
                                                    {item.unit}
                                                </strong>
                                            </>
                                        )}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="flex items-center gap-2">
                                        <span className="truncate font-semibold text-ink-900">
                                            {newItem?.name || 'Barang baru'}
                                            {newItem?.variant &&
                                                ` · ${newItem.variant}`}
                                        </span>
                                        <span className="rounded-md bg-brand-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                            Baru
                                        </span>
                                    </span>
                                    <span className="text-xs text-ink-500">
                                        Kode dibuat otomatis
                                        {category
                                            ? ` (INVESTA-PLK-…-${category.code}-…)`
                                            : ' setelah jenis barang dipilih'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label={`Hapus ${item ? itemLabel(item) : newItem?.name || 'barang baru'} dari daftar`}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-500 hover:bg-low/10 hover:text-low"
                    >
                        <TrashIcon className="size-[18px]" />
                    </button>
                </div>

                <div
                    className={cn(
                        'grid grid-cols-1 gap-3',
                        isIncoming ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
                    )}
                >
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor={`line-${index}-quantity`}
                            className="text-xs font-medium text-ink-500"
                        >
                            Jumlah ({unit})
                        </label>
                        <input
                            id={`line-${index}-quantity`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={
                                isIncoming || !item
                                    ? undefined
                                    : item.current_stock
                            }
                            value={line.quantity}
                            onChange={(event) =>
                                onChange({ quantity: event.target.value })
                            }
                            aria-invalid={
                                Boolean(errorFor('quantity')) || isOverdrawn
                            }
                            className={cn(inputClasses, 'tabular-nums')}
                        />
                    </div>
                    {isIncoming && (
                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor={`line-${index}-price`}
                                className="text-xs font-medium text-ink-500"
                            >
                                Harga satuan (Rp)
                            </label>
                            <input
                                id={`line-${index}-price`}
                                type="number"
                                inputMode="decimal"
                                min={0}
                                value={line.unit_price}
                                onChange={(event) =>
                                    onChange({ unit_price: event.target.value })
                                }
                                aria-invalid={Boolean(errorFor('unit_price'))}
                                className={cn(inputClasses, 'tabular-nums')}
                            />
                        </div>
                    )}
                    {isIncoming ? (
                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor={`line-${index}-subtotal`}
                                className="flex items-center justify-between text-xs font-medium text-ink-500"
                            >
                                Subtotal (Rp)
                                {isManualSubtotal && (
                                    <span className="rounded bg-brand-50 px-1 text-[10px] font-semibold text-brand-700">
                                        Manual
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <input
                                    id={`line-${index}-subtotal`}
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    value={
                                        isManualSubtotal
                                            ? line.subtotal
                                            : quantity * price > 0
                                              ? String(quantity * price)
                                              : ''
                                    }
                                    onChange={(event) =>
                                        onChange({
                                            subtotal: event.target.value,
                                        })
                                    }
                                    placeholder="Otomatis"
                                    className={cn(
                                        inputClasses,
                                        'font-semibold tabular-nums',
                                        isManualSubtotal &&
                                            'border-brand-300 bg-brand-50/50 pr-11',
                                    )}
                                />
                                {isManualSubtotal && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange({ subtotal: '' })
                                        }
                                        aria-label="Hitung subtotal otomatis dari jumlah × harga"
                                        title="Hitung otomatis (jumlah × harga)"
                                        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-100"
                                    >
                                        <RefreshIcon className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-ink-500">
                                Subtotal
                            </span>
                            <span className="flex h-11 min-w-28 items-center text-sm font-semibold text-ink-900 tabular-nums">
                                {formatRupiah(quantity * price)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {isManualSubtotal && (
                <p className="rounded-xl bg-brand-50/60 px-3.5 py-2.5 text-[13px] text-ink-700">
                    {quantity > 0
                        ? manualDiffers
                            ? `Subtotal diketik manual, jadi harga per ${unit} tercatat ${formatRupiah(Number(line.subtotal) / quantity)}.`
                            : 'Subtotal diketik manual dan sesuai dengan jumlah × harga.'
                        : 'Isi jumlahnya agar harga per unit bisa dihitung.'}
                </p>
            )}

            {newItem && (
                <div className="grid grid-cols-1 gap-3 border-t border-brand-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    <MiniField
                        id={`line-${index}-new-name`}
                        label="Nama barang"
                        error={errorFor('new_item.name')}
                    >
                        <input
                            id={`line-${index}-new-name`}
                            value={newItem.name}
                            onChange={(event) =>
                                updateNewItem({ name: event.target.value })
                            }
                            placeholder="Contoh: Kalender Meja 2028"
                            aria-invalid={Boolean(errorFor('new_item.name'))}
                            className={inputClasses}
                        />
                    </MiniField>
                    <MiniField
                        id={`line-${index}-new-variant`}
                        label="Varian"
                        hint="Opsional"
                        error={errorFor('new_item.variant')}
                    >
                        <input
                            id={`line-${index}-new-variant`}
                            value={newItem.variant}
                            onChange={(event) =>
                                updateNewItem({ variant: event.target.value })
                            }
                            placeholder="Contoh: Akrilik, Biru, A4"
                            className={inputClasses}
                        />
                    </MiniField>
                    <MiniField
                        id={`line-${index}-new-category`}
                        label="Jenis barang"
                        error={errorFor('new_item.category_id')}
                    >
                        <Select
                            id={`line-${index}-new-category`}
                            value={newItem.category_id}
                            onChange={(categoryId) =>
                                updateNewItem({ category_id: categoryId })
                            }
                            invalid={Boolean(errorFor('new_item.category_id'))}
                            placeholder="Pilih jenis barang"
                            options={categories.map((option) => ({
                                value: String(option.id),
                                label: option.name,
                            }))}
                        />
                    </MiniField>
                    <MiniField
                        id={`line-${index}-new-unit`}
                        label="Satuan"
                        error={errorFor('new_item.unit')}
                    >
                        <Autocomplete
                            id={`line-${index}-new-unit`}
                            value={newItem.unit}
                            onChange={(unit) => updateNewItem({ unit })}
                            options={units}
                            placeholder="pcs, box, rim…"
                            invalid={Boolean(errorFor('new_item.unit'))}
                        />
                    </MiniField>
                    <MiniField
                        id={`line-${index}-new-location`}
                        label="Lokasi rak"
                        hint="Opsional"
                        error={errorFor('new_item.location')}
                    >
                        <input
                            id={`line-${index}-new-location`}
                            value={newItem.location}
                            onChange={(event) =>
                                updateNewItem({ location: event.target.value })
                            }
                            placeholder="Contoh: Rak A5"
                            className={inputClasses}
                        />
                    </MiniField>
                    <MiniField
                        id={`line-${index}-new-minimum`}
                        label="Stok minimum"
                        hint="Untuk notifikasi"
                        error={errorFor('new_item.minimum_stock')}
                    >
                        <input
                            id={`line-${index}-new-minimum`}
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={newItem.minimum_stock}
                            onChange={(event) =>
                                updateNewItem({
                                    minimum_stock: event.target.value,
                                })
                            }
                            placeholder="0"
                            className={cn(inputClasses, 'tabular-nums')}
                        />
                    </MiniField>
                </div>
            )}

            {(lineErrors.length > 0 || isOverdrawn) && (
                <p className="text-sm text-low-ink">
                    {lineErrors[0] ??
                        `Melebihi sisa stok (${formatNumber(currentStock)} ${unit}).`}
                </p>
            )}
        </li>
    );
}

type MiniFieldProps = {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
};

function MiniField({ id, label, hint, error, children }: MiniFieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <label
                    htmlFor={id}
                    className="text-xs font-medium text-ink-700"
                >
                    {label}
                </label>
                {hint && (
                    <span className="text-[11px] text-ink-400">{hint}</span>
                )}
            </div>
            {children}
            {error && <p className="text-xs text-low-ink">{error}</p>}
        </div>
    );
}

type PhotoSlotProps = {
    id: string;
    existingUrl: string | null;
    file: File | null;
    canUpload: boolean;
    onChange: (file: File | null) => void;
};

/**
 * Square thumbnail at the start of a line. Shows the item's photo, or lets
 * the user upload or take one when the item has no photo yet.
 */
function PhotoSlot({
    id,
    existingUrl,
    file,
    canUpload,
    onChange,
}: PhotoSlotProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    function handleInput(event: ChangeEvent<HTMLInputElement>) {
        const candidate = event.target.files?.[0];
        event.target.value = '';

        if (!candidate) {
            return;
        }

        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)
        ) {
            setError('Harus JPG, PNG, atau WEBP');

            return;
        }

        if (candidate.size > MAX_RECEIPT_BYTES) {
            setError('Maksimal 5 MB');

            return;
        }

        setError(null);
        onChange(candidate);
    }

    if (existingUrl) {
        return (
            <img
                src={existingUrl}
                alt=""
                className="size-16 shrink-0 rounded-xl bg-media object-contain p-1"
            />
        );
    }

    if (!canUpload) {
        return (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-media text-brand-500">
                <BoxIcon className="size-6" />
            </span>
        );
    }

    return (
        <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="relative">
                <label
                    htmlFor={id}
                    title="Unggah atau foto barang (opsional)"
                    className={cn(
                        'flex size-16 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border-2 border-dashed text-brand-600 transition-colors',
                        preview
                            ? 'border-transparent'
                            : 'border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50',
                    )}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt="Pratinjau foto barang"
                            className="size-full object-cover"
                        />
                    ) : (
                        <>
                            <ImageIcon className="size-5" />
                            <span className="text-[10px] font-semibold">
                                Foto
                            </span>
                        </>
                    )}
                </label>
                <input
                    id={id}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleInput}
                    className="sr-only"
                />
                {file && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        aria-label="Hapus foto barang"
                        className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-ink-900 text-white shadow"
                    >
                        <XIcon className="size-3" />
                    </button>
                )}
            </div>
            {error && (
                <span className="max-w-16 text-center text-[10px] leading-tight text-low-ink">
                    {error}
                </span>
            )}
        </div>
    );
}
