import { Form } from '@inertiajs/react';
import { useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { PlusIcon, UserIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { ListPagination, usePaginatedRows } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/status-badge';
import { initials } from '@/lib/format';
import { destroy, store, update } from '@/routes/master/users';
import { Select } from '@/components/ui/select';
import type { Permission } from '@/types';

type Account = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'sekretaris';
    permissions: Permission[];
    is_current: boolean;
    can_delete: boolean;
};

type PermissionOption = {
    value: Permission;
    label: string;
    description: string;
    group: string;
};

type UsersProps = {
    users: Account[];
    permissionOptions: PermissionOption[];
};

export default function Users({ users, permissionOptions }: UsersProps) {
    const paginated = usePaginatedRows(users, 'master.users');
    const [editing, setEditing] = useState<Account | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Account | null>(null);
    const [role, setRole] = useState<Account['role']>('sekretaris');
    const current = editing === 'new' ? null : editing;

    function openEditor(account: Account | 'new') {
        setRole(account === 'new' ? 'sekretaris' : account.role);
        setEditing(account);
    }

    return (
        <MasterLayout
            title="Pengguna"
            description="Akun yang bisa masuk ke aplikasi. Admin bisa melakukan semuanya; Sekretaris mencatat transaksi dan bisa diberi akses tambahan sesuai kepercayaan."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => openEditor('new')}
                >
                    Tambah pengguna
                </Button>
            }
        >
            <MasterTable minWidth="600px">
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">Nama</th>
                        <th className="px-3 py-3.5 font-medium">Email</th>
                        <th className="px-3 py-3.5 font-medium">Peran</th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {paginated.rows.map((account) => (
                        <tr key={account.id}>
                            <td className="py-3 pr-3 pl-5">
                                <span className="flex items-center gap-3">
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-xs font-bold text-brand-800">
                                        {initials(account.name)}
                                    </span>
                                    <span className="font-semibold text-ink-900">
                                        {account.name}
                                        {account.is_current && (
                                            <span className="ml-2 text-xs font-normal text-ink-500">
                                                (Anda)
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {account.email}
                            </td>
                            <td className="px-3 py-3">
                                <Badge
                                    tone={
                                        account.role === 'admin'
                                            ? 'blue'
                                            : 'slate'
                                    }
                                    variant="soft"
                                >
                                    {account.role === 'admin'
                                        ? 'Admin'
                                        : 'Sekretaris'}
                                </Badge>
                                {account.role === 'sekretaris' && (
                                    <span className="mt-1 block text-xs text-ink-500">
                                        {account.permissions.length === 0
                                            ? 'Akses dasar saja'
                                            : `+${account.permissions.length} akses tambahan`}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditor(account)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleting(account)}
                                        disabled={!account.can_delete}
                                        title={
                                            account.is_current
                                                ? 'Tidak bisa menghapus akun sendiri'
                                                : account.can_delete
                                                  ? 'Hapus'
                                                  : 'Harus ada minimal satu Admin'
                                        }
                                        className="text-low-ink hover:bg-low/10"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>
            <ListPagination paginated={paginated} noun="pengguna" />

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah pengguna'}
                size="lg"
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
                    resetOnError={['password', 'password_confirmation']}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <Field
                                label="Nama"
                                htmlFor="user-name"
                                error={errors.name}
                            >
                                <input
                                    id="user-name"
                                    name="name"
                                    defaultValue={current?.name}
                                    required
                                    autoFocus
                                    aria-invalid={Boolean(errors.name)}
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="Email"
                                htmlFor="user-email"
                                error={errors.email}
                            >
                                <input
                                    id="user-email"
                                    name="email"
                                    type="email"
                                    defaultValue={current?.email}
                                    required
                                    autoComplete="off"
                                    aria-invalid={Boolean(errors.email)}
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="Peran"
                                htmlFor="user-role"
                                error={errors.role}
                            >
                                <Select
                                    id="user-role"
                                    name="role"
                                    value={role}
                                    onChange={(value) =>
                                        setRole(value as Account['role'])
                                    }
                                    options={[
                                        {
                                            value: 'sekretaris',
                                            label: 'Sekretaris',
                                            description:
                                                'Mencatat transaksi dan peralatan',
                                        },
                                        {
                                            value: 'admin',
                                            label: 'Admin',
                                            description:
                                                'Akses penuh, termasuk master data',
                                        },
                                    ]}
                                />
                            </Field>
                            {role === 'sekretaris' ? (
                                <PermissionChecklist
                                    key={current?.id ?? 'new'}
                                    options={permissionOptions}
                                    granted={current?.permissions ?? []}
                                    error={errors.permissions}
                                />
                            ) : (
                                <p className="rounded-xl bg-brand-50 px-3.5 py-3 text-[13px] text-brand-800">
                                    Admin otomatis punya semua akses, termasuk
                                    mengelola akun pengguna.
                                </p>
                            )}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    label={
                                        current
                                            ? 'Kata sandi baru'
                                            : 'Kata sandi'
                                    }
                                    htmlFor="user-password"
                                    hint={
                                        current
                                            ? 'Kosongkan jika tidak diganti'
                                            : 'Minimal 8 karakter'
                                    }
                                    error={errors.password}
                                >
                                    <input
                                        id="user-password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required={!current}
                                        aria-invalid={Boolean(errors.password)}
                                        className={inputClasses}
                                    />
                                </Field>
                                <Field
                                    label="Ulangi kata sandi"
                                    htmlFor="user-password-confirmation"
                                >
                                    <input
                                        id="user-password-confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        autoComplete="new-password"
                                        required={!current}
                                        className={inputClasses}
                                    />
                                </Field>
                            </div>
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
                    title={`Hapus akun ${deleting.name}?`}
                    description="Akun ini tidak bisa login lagi. Transaksi yang pernah dicatatnya tetap ada, tapi nama pencatatnya tidak lagi ditampilkan."
                    url={destroy.url(deleting.id)}
                />
            )}
        </MasterLayout>
    );
}

/**
 * Checkboxes for the extra access a Sekretaris gets, grouped by menu.
 */
function PermissionChecklist({
    options,
    granted,
    error,
}: {
    options: PermissionOption[];
    granted: Permission[];
    error?: string;
}) {
    const groups = options.reduce<Record<string, PermissionOption[]>>(
        (result, option) => {
            (result[option.group] ??= []).push(option);

            return result;
        },
        {},
    );
    const [selected, setSelected] = useState<Permission[]>(granted);
    const isAllSelected = selected.length === options.length;
    const isPartlySelected = selected.length > 0 && !isAllSelected;

    function toggle(permission: Permission, checked: boolean) {
        setSelected((current) =>
            checked
                ? [...current, permission]
                : current.filter((value) => value !== permission),
        );
    }

    function toggleAll(checked: boolean) {
        setSelected(checked ? options.map((option) => option.value) : []);
    }

    return (
        <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-ink-700">
                Akses tambahan
            </legend>
            <p className="-mt-1 text-xs text-ink-500">
                Tanpa centang, Sekretaris tetap bisa mencatat barang masuk dan
                keluar, peralatan, cek stok, dan melihat laporan. Mengelola akun
                pengguna tetap khusus Admin.
            </p>
            <div className="flex max-h-[42vh] flex-col gap-4 overflow-y-auto rounded-xl border border-ink-100 p-3.5">
                <label className="-mx-1 flex cursor-pointer items-center justify-between gap-3 rounded-lg border-b border-ink-100 px-2 pt-1 pb-3 hover:bg-ink-50">
                    <span className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(element) => {
                                if (element) {
                                    element.indeterminate = isPartlySelected;
                                }
                            }}
                            onChange={(event) =>
                                toggleAll(event.target.checked)
                            }
                            aria-label="Pilih semua akses tambahan"
                            className="size-[18px] shrink-0 accent-brand-700"
                        />
                        <span className="text-sm font-semibold text-ink-900">
                            Pilih semua akses
                        </span>
                    </span>
                    <span className="text-xs text-ink-500 tabular-nums">
                        {selected.length} dari {options.length} dipilih
                    </span>
                </label>
                {Object.entries(groups).map(([group, groupOptions]) => (
                    <div key={group} className="flex flex-col gap-2">
                        <span className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                            {group}
                        </span>
                        {groupOptions.map((option) => (
                            <label
                                key={option.value}
                                className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 hover:bg-ink-50"
                            >
                                <input
                                    type="checkbox"
                                    name="permissions[]"
                                    value={option.value}
                                    checked={selected.includes(option.value)}
                                    onChange={(event) =>
                                        toggle(
                                            option.value,
                                            event.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-[18px] shrink-0 accent-brand-700"
                                />
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium text-ink-900">
                                        {option.label}
                                    </span>
                                    <span className="text-xs text-ink-500">
                                        {option.description}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                ))}
            </div>
            {error && <p className="text-sm text-low-ink">{error}</p>}
        </fieldset>
    );
}
