import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import { PlusIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { formatDate } from '@/lib/format';
import { destroy, store, update } from '@/routes/master/suppliers';

type Supplier = {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    transactions_count: number;
    last_transaction_on: string | null;
    can_delete: boolean;
};

export default function Suppliers({ suppliers }: { suppliers: Supplier[] }) {
    const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Supplier | null>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <MasterLayout
            title="Supplier"
            description="Toko atau sumber barang. Supplier baru juga otomatis tercatat saat diketik di form Barang Masuk."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => setEditing('new')}
                >
                    Tambah supplier
                </Button>
            }
        >
            <MasterTable minWidth="720px">
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">
                            Supplier
                        </th>
                        <th className="px-3 py-3.5 font-medium">Kontak</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Transaksi
                        </th>
                        <th className="px-3 py-3.5 font-medium">
                            Terakhir belanja
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {suppliers.map((supplier) => (
                        <tr key={supplier.id}>
                            <td className="py-3 pr-3 pl-5">
                                <span className="flex flex-col">
                                    <span className="font-semibold text-ink-900">
                                        {supplier.name}
                                    </span>
                                    {supplier.address && (
                                        <span className="max-w-xs truncate text-xs text-ink-500">
                                            {supplier.address}
                                        </span>
                                    )}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {supplier.phone ?? '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {supplier.transactions_count}
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {formatDate(supplier.last_transaction_on)}
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <RowActions
                                    onEdit={() => setEditing(supplier)}
                                    onDelete={() => setDeleting(supplier)}
                                    canDelete={supplier.can_delete}
                                    deleteHint="Sudah dipakai di transaksi atau aset."
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah supplier'}
            >
                <Form
                    key={current?.id ?? 'new'}
                    {...(current ? update.form(current.id) : store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setEditing(null)}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="Nama supplier"
                                htmlFor="supplier-name"
                                error={errors.name}
                            >
                                <input
                                    id="supplier-name"
                                    name="name"
                                    defaultValue={current?.name}
                                    required
                                    autoFocus
                                    aria-invalid={Boolean(errors.name)}
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="No. telepon / WhatsApp"
                                htmlFor="supplier-phone"
                                hint="Opsional"
                                error={errors.phone}
                            >
                                <input
                                    id="supplier-phone"
                                    name="phone"
                                    type="tel"
                                    defaultValue={current?.phone ?? ''}
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="Alamat"
                                htmlFor="supplier-address"
                                hint="Opsional"
                                error={errors.address}
                            >
                                <textarea
                                    id="supplier-address"
                                    name="address"
                                    rows={3}
                                    defaultValue={current?.address ?? ''}
                                    className="w-full rounded-xl border border-ink-200 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
                                />
                            </Field>
                            <DialogFooter>
                                <Button
                                    variant="ghost"
                                    onClick={() => setEditing(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Menyimpan…' : 'Simpan'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </Dialog>

            {deleting && (
                <ConfirmDeleteDialog
                    open
                    onClose={() => setDeleting(null)}
                    title={`Hapus ${deleting.name}?`}
                    description="Supplier ini belum pernah dipakai, jadi bisa dihapus permanen."
                    url={destroy.url(deleting.id)}
                />
            )}
        </MasterLayout>
    );
}
