import { Form } from '@inertiajs/react';
import { useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { PlusIcon, UserIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { Badge } from '@/components/ui/status-badge';
import { initials } from '@/lib/format';
import { destroy, store, update } from '@/routes/master/users';
import { Select } from '@/components/ui/select';

type Account = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'sekretaris';
    is_current: boolean;
    can_delete: boolean;
};

export default function Users({ users }: { users: Account[] }) {
    const [editing, setEditing] = useState<Account | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Account | null>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <MasterLayout
            title="Pengguna"
            description="Akun yang bisa masuk ke aplikasi. Admin mengelola master data dan bisa membatalkan transaksi; Sekretaris mencatat transaksi."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => setEditing('new')}
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
                    {users.map((account) => (
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
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditing(account)}
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
                                        className="text-[#c52c32] hover:bg-low/10"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah pengguna'}
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
                                    defaultValue={current?.role ?? 'sekretaris'}
                                    options={[
                                        {
                                            value: 'sekretaris',
                                            label: 'Sekretaris',
                                            description:
                                                'Mencatat transaksi dan aset',
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
