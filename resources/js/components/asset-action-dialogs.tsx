import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BanIcon,
    DoorIcon,
    PackageCheckIcon,
    UserIcon,
    WrenchIcon,
} from '@/components/icons';
import type {
    EmployeeChoice,
    EmployeeOption,
} from '@/components/employee-picker';
import { EmployeePicker } from '@/components/employee-picker';
import { DialogNotes } from '@/components/form-notes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import {
    assign as assignRoute,
    dispose as disposeRoute,
    returnMethod as returnRoute,
    service as serviceRoute,
} from '@/routes/assets';
import { complete as completeRoute } from '@/routes/assets/service';
import type { Asset } from '@/types';
import { Select } from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';

export type AssetAction =
    | 'assign'
    | 'return'
    | 'service'
    | 'complete'
    | 'dispose';

type AssetActionDialogsProps = {
    action: AssetAction | null;
    onClose: () => void;
    asset: Asset;
    today: string;
    minDate: string | null;
    employees: EmployeeOption[];
    divisions: { id: number; name: string }[];
    rooms: { id: number; name: string; floor: string | null }[];
    vendors: string[];
};

const textareaClasses =
    'w-full rounded-xl border border-ink-200 px-3.5 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100';

/**
 * The dialogs behind the action buttons on an asset's detail page: hand over,
 * return, send to service, finish service and dispose.
 */
export function AssetActionDialogs({
    action,
    onClose,
    asset,
    today,
    minDate,
    employees,
    divisions,
    rooms,
    vendors,
}: AssetActionDialogsProps) {
    const isMove = asset.status.value === 'dipakai';

    return (
        <>
            <Dialog
                open={action === 'assign'}
                onClose={onClose}
                size="lg"
                title={
                    isMove
                        ? `Pindahkan ${asset.code}`
                        : `Serahkan ${asset.code}`
                }
                description={
                    isMove
                        ? `Saat ini dipegang ${asset.holder?.name}. Aset otomatis tercatat dikembalikan oleh pemegang lama lalu diserahkan ke pemegang baru.`
                        : 'Pilih karyawan atau ruangan yang akan memegang aset ini.'
                }
                icon={<DialogIcon tone="brand" icon={<ArrowUpTrayIcon />} />}
            >
                <AssignForm
                    asset={asset}
                    today={today}
                    minDate={minDate}
                    employees={employees}
                    divisions={divisions}
                    rooms={rooms}
                    onClose={onClose}
                />
            </Dialog>

            <Dialog
                open={action === 'return'}
                onClose={onClose}
                title={`Kembalikan ${asset.code}`}
                description={`Dari ${asset.holder?.name ?? 'pemegang saat ini'}. Pilih kondisi aset saat diterima kembali.`}
                icon={<DialogIcon tone="green" icon={<ArrowDownTrayIcon />} />}
            >
                <Form
                    {...returnRoute.form(asset.code)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <DialogNotes
                                dos={[
                                    'Cek kelengkapannya (charger, tas, kabel) dan tulis di catatan kalau ada yang kurang.',
                                ]}
                                donts={[]}
                            />
                            <ConditionChoice
                                name="condition"
                                options={[
                                    {
                                        value: 'Baik',
                                        label: 'Baik',
                                        hint: 'Kembali ke gudang, siap dipakai lagi',
                                    },
                                    {
                                        value: 'Perlu servis',
                                        label: 'Perlu servis',
                                        hint: 'Masih bisa dipakai, tapi perlu dicek',
                                    },
                                    {
                                        value: 'Rusak',
                                        label: 'Rusak',
                                        hint: 'Status aset menjadi Rusak',
                                    },
                                ]}
                                defaultValue="Baik"
                                error={errors.condition}
                            />
                            <DateField
                                today={today}
                                minDate={minDate}
                                error={errors.occurred_on}
                            />
                            <Field
                                label="Catatan"
                                htmlFor="return-notes"
                                hint="Opsional"
                                error={errors.notes}
                            >
                                <textarea
                                    id="return-notes"
                                    name="notes"
                                    rows={2}
                                    placeholder="Contoh: keyboard aus, charger lengkap"
                                    className={textareaClasses}
                                />
                            </Field>
                            <StatusError message={errors.status} />
                            <Actions
                                onClose={onClose}
                                processing={processing}
                                label="Simpan pengembalian"
                            />
                        </>
                    )}
                </Form>
            </Dialog>

            <Dialog
                open={action === 'service'}
                onClose={onClose}
                title={`Kirim ${asset.code} ke servis`}
                description="Status aset menjadi Diperbaiki sampai servisnya dicatat selesai."
                icon={<DialogIcon tone="amber" icon={<WrenchIcon />} />}
            >
                <Form
                    {...serviceRoute.form(asset.code)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <DialogNotes
                                dos={[
                                    'Simpan nota servis untuk mengisi biaya saat servis selesai.',
                                ]}
                                donts={[]}
                            />
                            <Field
                                label="Tempat servis"
                                htmlFor="service-vendor"
                                hint="Ketik bebas"
                                error={errors.vendor}
                            >
                                <Autocomplete
                                    id="service-vendor"
                                    name="vendor"
                                    options={vendors}
                                    required
                                    autoFocus
                                    placeholder="Contoh: Mitra Komputer"
                                    invalid={Boolean(errors.vendor)}
                                />
                            </Field>
                            <Field
                                label="Keluhan / kerusakan"
                                htmlFor="service-issue"
                                error={errors.issue}
                            >
                                <textarea
                                    id="service-issue"
                                    name="issue"
                                    rows={3}
                                    required
                                    placeholder="Contoh: hasil cetak bergaris"
                                    aria-invalid={Boolean(errors.issue)}
                                    className={textareaClasses}
                                />
                            </Field>
                            <DateField
                                today={today}
                                minDate={minDate}
                                error={errors.occurred_on}
                            />
                            <StatusError message={errors.status} />
                            <Actions
                                onClose={onClose}
                                processing={processing}
                                label="Kirim servis"
                            />
                        </>
                    )}
                </Form>
            </Dialog>

            <Dialog
                open={action === 'complete'}
                onClose={onClose}
                title={`Servis ${asset.code} selesai`}
                description="Catat biaya dan hasil servisnya."
                icon={<DialogIcon tone="green" icon={<PackageCheckIcon />} />}
            >
                <Form
                    {...completeRoute.form(asset.code)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <DialogNotes
                                dos={[
                                    'Isi biaya sesuai nota servis, dan isi 0 kalau gratis atau masih garansi.',
                                ]}
                                donts={[]}
                            />
                            <ConditionChoice
                                name="condition"
                                options={[
                                    {
                                        value: 'Baik',
                                        label: 'Berhasil diperbaiki',
                                        hint: 'Aset kembali Tersedia',
                                    },
                                    {
                                        value: 'Rusak',
                                        label: 'Tidak bisa diperbaiki',
                                        hint: 'Status aset menjadi Rusak',
                                    },
                                ]}
                                defaultValue="Baik"
                                error={errors.condition}
                            />
                            <Field
                                label="Biaya servis (Rp)"
                                htmlFor="service-cost"
                                hint="Isi 0 jika gratis"
                                error={errors.cost}
                            >
                                <input
                                    id="service-cost"
                                    name="cost"
                                    type="number"
                                    min={0}
                                    defaultValue={0}
                                    required
                                    aria-invalid={Boolean(errors.cost)}
                                    className={`${inputClasses} tabular-nums`}
                                />
                            </Field>
                            <DateField
                                today={today}
                                minDate={minDate}
                                error={errors.occurred_on}
                            />
                            <Field
                                label="Catatan"
                                htmlFor="complete-notes"
                                hint="Opsional"
                                error={errors.notes}
                            >
                                <textarea
                                    id="complete-notes"
                                    name="notes"
                                    rows={2}
                                    placeholder="Contoh: head printer diganti"
                                    className={textareaClasses}
                                />
                            </Field>
                            <StatusError message={errors.status} />
                            <Actions
                                onClose={onClose}
                                processing={processing}
                                label="Simpan hasil servis"
                            />
                        </>
                    )}
                </Form>
            </Dialog>

            <Dialog
                open={action === 'dispose'}
                onClose={onClose}
                title={`Hapuskan ${asset.code}?`}
                description="Aset tidak dipakai lagi (dijual, dibuang, atau hilang). Datanya tetap tersimpan dengan status Dihapuskan."
                icon={<DialogIcon tone="red" icon={<BanIcon />} />}
            >
                <Form
                    {...disposeRoute.form(asset.code)}
                    options={{ preserveScroll: true }}
                    onSuccess={onClose}
                    className="flex flex-col gap-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <DialogNotes
                                dos={[]}
                                donts={[
                                    'Menghapuskan aset yang masih bisa dipakai. Penghapusan tidak bisa dibatalkan.',
                                ]}
                            />
                            <Field
                                label="Alasan"
                                htmlFor="dispose-reason"
                                error={errors.reason}
                            >
                                <textarea
                                    id="dispose-reason"
                                    name="reason"
                                    rows={3}
                                    required
                                    autoFocus
                                    placeholder="Contoh: layar rusak total, biaya perbaikan melebihi harga baru"
                                    aria-invalid={Boolean(errors.reason)}
                                    className={textareaClasses}
                                />
                            </Field>
                            <DateField
                                today={today}
                                minDate={minDate}
                                error={errors.occurred_on}
                            />
                            <StatusError message={errors.status} />
                            <DialogFooter>
                                <Button variant="ghost" onClick={onClose}>
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-low shadow-none hover:bg-[#c52c32]"
                                >
                                    {processing
                                        ? 'Menyimpan…'
                                        : 'Ya, hapuskan aset'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </Dialog>
        </>
    );
}

type AssignFormProps = {
    asset: Asset;
    today: string;
    minDate: string | null;
    employees: AssetActionDialogsProps['employees'];
    divisions: AssetActionDialogsProps['divisions'];
    rooms: AssetActionDialogsProps['rooms'];
    onClose: () => void;
};

function AssignForm({
    asset,
    today,
    minDate,
    employees,
    divisions,
    rooms,
    onClose,
}: AssignFormProps) {
    const [holderType, setHolderType] = useState<'employee' | 'room'>(
        asset.holder?.type === 'room' ? 'room' : 'employee',
    );
    const [employee, setEmployee] = useState<EmployeeChoice | null>(null);

    return (
        <Form
            {...assignRoute.form(asset.code)}
            options={{ preserveScroll: true }}
            onSuccess={onClose}
            className="flex flex-col gap-4"
        >
            {({ errors, processing }) => (
                <>
                    <DialogNotes
                        dos={[
                            'Periksa kondisi dan kelengkapan aset bersama penerima sebelum diserahkan.',
                        ]}
                        donts={['Menyerahkan aset tanpa dicatat di sini.']}
                    />
                    <input
                        type="hidden"
                        name="holder_type"
                        value={holderType}
                    />
                    <div
                        role="radiogroup"
                        aria-label="Jenis pemegang"
                        className="grid grid-cols-2 gap-3"
                    >
                        {(
                            [
                                {
                                    value: 'employee',
                                    label: 'Karyawan',
                                    hint: 'Contoh: laptop untuk staf',
                                    icon: UserIcon,
                                },
                                {
                                    value: 'room',
                                    label: 'Ruangan',
                                    hint: 'Contoh: printer bersama',
                                    icon: DoorIcon,
                                },
                            ] as const
                        ).map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={holderType === option.value}
                                onClick={() => setHolderType(option.value)}
                                className={cn(
                                    'flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                                    holderType === option.value
                                        ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                                        : 'border-ink-200 hover:border-ink-400',
                                )}
                            >
                                <option.icon
                                    className={cn(
                                        'mt-0.5 size-5',
                                        holderType === option.value
                                            ? 'text-brand-700'
                                            : 'text-ink-500',
                                    )}
                                />
                                <span className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-ink-900">
                                        {option.label}
                                    </span>
                                    <span className="text-xs text-ink-500">
                                        {option.hint}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>

                    {holderType === 'room' ? (
                        <Field
                            label="Ruangan"
                            htmlFor="holder-id"
                            error={errors.holder_id}
                        >
                            <Select
                                id="holder-id"
                                name="holder_id"
                                invalid={Boolean(errors.holder_id)}
                                placeholder="Pilih ruangan"
                                options={rooms.map((room) => ({
                                    value: String(room.id),
                                    label: room.name,
                                    description: room.floor ?? undefined,
                                }))}
                            />
                        </Field>
                    ) : (
                        <Field
                            label="Karyawan"
                            htmlFor="holder-employee"
                            hint="Belum terdaftar? Ketik namanya"
                        >
                            <EmployeePicker
                                id="holder-employee"
                                employees={employees}
                                divisions={divisions}
                                value={employee}
                                onChange={setEmployee}
                                idFieldName="holder_id"
                                error={
                                    errors.holder_id ?? errors.new_employee_name
                                }
                            />
                        </Field>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field
                            label="Kondisi saat diserahkan"
                            htmlFor="assign-condition"
                            error={errors.condition}
                        >
                            <Autocomplete
                                id="assign-condition"
                                name="condition"
                                defaultValue={asset.condition ?? 'Baik'}
                                options={[
                                    'Baik',
                                    'Baik, ada goresan',
                                    'Baik, tanpa charger',
                                ]}
                                required
                            />
                        </Field>
                        <DateField
                            today={today}
                            minDate={minDate}
                            error={errors.occurred_on}
                        />
                    </div>

                    <Field
                        label="Catatan"
                        htmlFor="assign-notes"
                        hint="Opsional"
                        error={errors.notes}
                    >
                        <textarea
                            id="assign-notes"
                            name="notes"
                            rows={2}
                            placeholder="Contoh: termasuk charger dan tas"
                            className={textareaClasses}
                        />
                    </Field>

                    <StatusError message={errors.status} />
                    <Actions
                        onClose={onClose}
                        processing={processing}
                        label={
                            asset.status.value === 'dipakai'
                                ? 'Pindahkan aset'
                                : 'Serahkan aset'
                        }
                    />
                </>
            )}
        </Form>
    );
}

function DateField({
    today,
    minDate,
    error,
}: {
    today: string;
    minDate: string | null;
    error?: string;
}) {
    return (
        <Field label="Tanggal" htmlFor="occurred_on" error={error}>
            <input
                id="occurred_on"
                name="occurred_on"
                type="date"
                max={today}
                min={minDate ?? undefined}
                defaultValue={today}
                required
                aria-invalid={Boolean(error)}
                className={inputClasses}
            />
        </Field>
    );
}

type ConditionChoiceProps = {
    name: string;
    options: { value: string; label: string; hint: string }[];
    defaultValue: string;
    error?: string;
};

function ConditionChoice({
    name,
    options,
    defaultValue,
    error,
}: ConditionChoiceProps) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-ink-700">
                Kondisi
            </legend>
            {options.map((option) => (
                <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3 has-checked:border-brand-600 has-checked:bg-brand-50"
                >
                    <input
                        type="radio"
                        name={name}
                        value={option.value}
                        defaultChecked={option.value === defaultValue}
                        className="mt-0.5 size-4 accent-brand-700"
                    />
                    <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-ink-900">
                            {option.label}
                        </span>
                        <span className="text-xs text-ink-500">
                            {option.hint}
                        </span>
                    </span>
                </label>
            ))}
            {error && <p className="text-sm text-[#c52c32]">{error}</p>}
        </fieldset>
    );
}

function Actions({
    onClose,
    processing,
    label,
}: {
    onClose: () => void;
    processing: boolean;
    label: string;
}) {
    return (
        <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
                Batal
            </Button>
            <Button type="submit" disabled={processing}>
                {processing ? 'Menyimpan…' : label}
            </Button>
        </DialogFooter>
    );
}

function StatusError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p className="rounded-xl bg-low/10 px-3.5 py-3 text-sm text-[#a8262c]">
            {message}
        </p>
    );
}

function DialogIcon({
    tone,
    icon,
}: {
    tone: 'brand' | 'green' | 'amber' | 'red';
    icon: ReactNode;
}) {
    const tones = {
        brand: 'bg-brand-50 text-brand-700',
        green: 'bg-ok/10 text-ok',
        amber: 'bg-service/10 text-service',
        red: 'bg-low/10 text-low',
    };

    return (
        <span
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-2xl [&_svg]:size-5',
                tones[tone],
            )}
        >
            {icon}
        </span>
    );
}
