import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import { GridIcon, PlusIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputClasses } from '@/components/ui/field';
import { destroy, store, update } from '@/routes/master/divisions';

type Division = {
    id: number;
    name: string;
    employees_count: number;
    can_delete: boolean;
};

export default function Divisions({ divisions }: { divisions: Division[] }) {
    const [editing, setEditing] = useState<Division | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Division | null>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <MasterLayout
            title="Divisi"
            description="Bagian di perusahaan. Dipakai untuk mengelompokkan karyawan dan laporan pemakaian barang."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => setEditing('new')}
                >
                    Tambah divisi
                </Button>
            }
        >
            <MasterTable
                minWidth="480px"
                empty={
                    divisions.length === 0 && (
                        <EmptyState
                            icon={GridIcon}
                            title="Belum ada divisi"
                            description="Contoh: Marketing, Keuangan, IT. Divisi dipakai untuk mengelompokkan karyawan dan laporan pemakaian."
                            action={
                                <Button
                                    size="sm"
                                    icon={<PlusIcon className="size-4" />}
                                    onClick={() => setEditing('new')}
                                >
                                    Tambah divisi pertama
                                </Button>
                            }
                        />
                    )
                }
            >
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">Divisi</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Jumlah karyawan
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {divisions.map((division) => (
                        <tr key={division.id}>
                            <td className="py-3 pr-3 pl-5 font-semibold text-ink-900">
                                {division.name}
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {division.employees_count}
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <RowActions
                                    onEdit={() => setEditing(division)}
                                    onDelete={() => setDeleting(division)}
                                    canDelete={division.can_delete}
                                    deleteHint="Masih ada karyawan di divisi ini."
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah divisi'}
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
                                label="Nama divisi"
                                htmlFor="division-name"
                                error={errors.name}
                            >
                                <input
                                    id="division-name"
                                    name="name"
                                    defaultValue={current?.name}
                                    required
                                    autoFocus
                                    aria-invalid={Boolean(errors.name)}
                                    className={inputClasses}
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
                    title={`Hapus divisi ${deleting.name}?`}
                    description="Divisi ini tidak punya karyawan, jadi bisa dihapus permanen."
                    url={destroy.url(deleting.id)}
                />
            )}
        </MasterLayout>
    );
}
