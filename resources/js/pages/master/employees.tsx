import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import { PlusIcon, UserIcon, UsersIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputClasses } from '@/components/ui/field';
import { ListPagination, usePaginatedRows } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/status-badge';
import { initials } from '@/lib/format';
import { destroy, store, update } from '@/routes/master/employees';
import { Select } from '@/components/ui/select';

type Employee = {
    id: number;
    name: string;
    division_id: number | null;
    division: string | null;
    position: string | null;
    is_active: boolean;
    transactions_count: number;
    held_assets_count: number;
    can_delete: boolean;
};

type EmployeesProps = {
    employees: Employee[];
    divisions: { id: number; name: string }[];
};

export default function Employees({ employees, divisions }: EmployeesProps) {
    const paginated = usePaginatedRows(employees, 'master.employees');
    const [editing, setEditing] = useState<Employee | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Employee | null>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <MasterLayout
            title="Karyawan"
            description="Penerima barang keluar dan pemegang aset. Karyawan tidak perlu login."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => setEditing('new')}
                >
                    Tambah karyawan
                </Button>
            }
        >
            <MasterTable
                minWidth="720px"
                empty={
                    employees.length === 0 && (
                        <EmptyState
                            icon={UsersIcon}
                            title="Belum ada karyawan"
                            description="Daftarkan orang yang biasa mengambil barang atau memegang aset. Karyawan juga bisa ditambah langsung saat mencatat Barang Keluar."
                            action={
                                <Button
                                    size="sm"
                                    icon={<PlusIcon className="size-4" />}
                                    onClick={() => setEditing('new')}
                                >
                                    Tambah karyawan pertama
                                </Button>
                            }
                        />
                    )
                }
            >
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">Nama</th>
                        <th className="px-3 py-3.5 font-medium">Divisi</th>
                        <th className="px-3 py-3.5 font-medium">Status</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Transaksi
                        </th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Peralatan Dipegang
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {paginated.rows.map((employee) => (
                        <tr
                            key={employee.id}
                            className={employee.is_active ? '' : 'bg-ink-50/60'}
                        >
                            <td className="py-3 pr-3 pl-5">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                                        {initials(employee.name)}
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="font-semibold text-ink-900">
                                            {employee.name}
                                        </span>
                                        <span className="text-xs text-ink-500">
                                            {employee.position ?? '—'}
                                        </span>
                                    </span>
                                </div>
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {employee.division ?? (
                                    <Badge tone="amber" variant="soft">
                                        Belum diisi
                                    </Badge>
                                )}
                            </td>
                            <td className="px-3 py-3">
                                {employee.is_active ? (
                                    <Badge tone="green" variant="soft">
                                        Aktif
                                    </Badge>
                                ) : (
                                    <Badge tone="gray" variant="soft">
                                        Nonaktif
                                    </Badge>
                                )}
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {employee.transactions_count}
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {employee.held_assets_count}
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <RowActions
                                    onEdit={() => setEditing(employee)}
                                    onDelete={() => setDeleting(employee)}
                                    canDelete={employee.can_delete}
                                    deleteHint="Sudah tercatat di transaksi atau aset. Nonaktifkan saja."
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>
            <ListPagination paginated={paginated} noun="karyawan" />

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah karyawan'}
                icon={
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                        <UserIcon />
                    </span>
                }
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
                                label="Nama lengkap"
                                htmlFor="employee-name"
                                error={errors.name}
                            >
                                <input
                                    id="employee-name"
                                    name="name"
                                    defaultValue={current?.name}
                                    required
                                    autoFocus
                                    aria-invalid={Boolean(errors.name)}
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="Divisi"
                                hint="Opsional"
                                htmlFor="employee-division"
                                error={errors.division_id}
                            >
                                <Select
                                    id="employee-division"
                                    name="division_id"
                                    defaultValue={
                                        current?.division_id
                                            ? String(current.division_id)
                                            : ''
                                    }
                                    invalid={Boolean(errors.division_id)}
                                    options={[
                                        { value: '', label: 'Tanpa divisi' },
                                        ...divisions.map((division) => ({
                                            value: String(division.id),
                                            label: division.name,
                                        })),
                                    ]}
                                />
                            </Field>
                            <Field
                                label="Jabatan"
                                htmlFor="employee-position"
                                hint="Opsional"
                                error={errors.position}
                            >
                                <input
                                    id="employee-position"
                                    name="position"
                                    defaultValue={current?.position ?? ''}
                                    className={inputClasses}
                                />
                            </Field>
                            <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-3.5">
                                <input
                                    type="hidden"
                                    name="is_active"
                                    value="0"
                                />
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    value="1"
                                    defaultChecked={current?.is_active ?? true}
                                    className="mt-0.5 size-[18px] accent-brand-700"
                                />
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium text-ink-900">
                                        Masih aktif bekerja
                                    </span>
                                    <span className="text-xs text-ink-500">
                                        Karyawan nonaktif tidak muncul di
                                        pilihan penerima, tapi riwayatnya tetap
                                        ada.
                                    </span>
                                </span>
                            </label>
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
                    description="Karyawan ini belum punya riwayat, jadi bisa dihapus permanen."
                    url={destroy.url(deleting.id)}
                />
            )}
        </MasterLayout>
    );
}
