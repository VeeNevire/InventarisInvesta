import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import { DoorIcon, PlusIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputClasses } from '@/components/ui/field';
import { ListPagination, usePaginatedRows } from '@/components/ui/pagination';
import { destroy, store, update } from '@/routes/master/rooms';

type Room = {
    id: number;
    name: string;
    floor: string | null;
    held_assets_count: number;
    can_delete: boolean;
};

export default function Rooms({ rooms }: { rooms: Room[] }) {
    const paginated = usePaginatedRows(rooms, 'master.rooms');
    const [editing, setEditing] = useState<Room | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Room | null>(null);
    const current = editing === 'new' ? null : editing;

    return (
        <MasterLayout
            title="Ruangan"
            description="Tempat peralatan bersama ditaruh, misalnya printer di Ruang Keuangan atau proyektor di Ruang Rapat."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => setEditing('new')}
                >
                    Tambah ruangan
                </Button>
            }
        >
            <MasterTable
                minWidth="520px"
                empty={
                    rooms.length === 0 && (
                        <EmptyState
                            icon={DoorIcon}
                            title="Belum ada ruangan"
                            description="Tambahkan ruangan untuk peralatan yang dipakai bersama, misalnya printer di Ruang Keuangan atau proyektor di Ruang Rapat."
                            action={
                                <Button
                                    size="sm"
                                    icon={<PlusIcon className="size-4" />}
                                    onClick={() => setEditing('new')}
                                >
                                    Tambah ruangan pertama
                                </Button>
                            }
                        />
                    )
                }
            >
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">
                            Ruangan
                        </th>
                        <th className="px-3 py-3.5 font-medium">Lantai</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            Peralatan di Ruangan
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {paginated.rows.map((room) => (
                        <tr key={room.id}>
                            <td className="py-3 pr-3 pl-5">
                                <span className="flex items-center gap-3 font-semibold text-ink-900">
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-[#f1ecfb] text-[#6d3fc4]">
                                        <DoorIcon className="size-[18px]" />
                                    </span>
                                    {room.name}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-ink-700">
                                {room.floor ?? '—'}
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {room.held_assets_count}
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <RowActions
                                    onEdit={() => setEditing(room)}
                                    onDelete={() => setDeleting(room)}
                                    canDelete={room.can_delete}
                                    deleteHint="Sudah tercatat di riwayat aset."
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>
            <ListPagination paginated={paginated} noun="ruangan" />

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah ruangan'}
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
                                label="Nama ruangan"
                                htmlFor="room-name"
                                error={errors.name}
                            >
                                <input
                                    id="room-name"
                                    name="name"
                                    defaultValue={current?.name}
                                    required
                                    autoFocus
                                    placeholder="Contoh: Ruang Rapat Utama"
                                    aria-invalid={Boolean(errors.name)}
                                    className={inputClasses}
                                />
                            </Field>
                            <Field
                                label="Lantai / lokasi"
                                htmlFor="room-floor"
                                hint="Opsional"
                                error={errors.floor}
                            >
                                <input
                                    id="room-floor"
                                    name="floor"
                                    defaultValue={current?.floor ?? ''}
                                    placeholder="Contoh: Lantai 2"
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
                    title={`Hapus ${deleting.name}?`}
                    description="Ruangan ini belum pernah memegang peralatan, jadi bisa dihapus permanen."
                    url={destroy.url(deleting.id)}
                />
            )}
        </MasterLayout>
    );
}
