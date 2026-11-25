import { Form, Link } from '@inertiajs/react';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { BoxIcon, ImageIcon, TrashIcon, XIcon } from '@/components/icons';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, inputClasses } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import {
    destroy as itemDestroy,
    index as itemsIndex,
    show as itemShow,
    store as itemStore,
    update as itemUpdate,
} from '@/routes/items';
import type { Item } from '@/types';
import { Select } from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';
import { FormNotes } from '@/components/form-notes';

type EditableItem = Item & { category_id: number; has_transactions: boolean };

type ItemFormProps = {
    item: EditableItem | null;
    /** Whether the delete button is shown; only relevant when editing. */
    canDelete?: boolean;
    categories: {
        id: number;
        code: string;
        name: string;
        parent_id: number | null;
        next_code: string | null;
    }[];
    units: string[];
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function ItemForm({
    item,
    categories,
    units,
    canDelete = false,
}: ItemFormProps) {
    const isEditing = item !== null;
    const fileInput = useRef<HTMLInputElement>(null);
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const initialCategory = categories.find(
        (category) => category.id === item?.category_id,
    );
    const [mainCategoryId, setMainCategoryId] = useState(
        initialCategory
            ? String(initialCategory.parent_id ?? initialCategory.id)
            : '',
    );
    const [subcategoryId, setSubcategoryId] = useState(
        initialCategory?.parent_id ? String(initialCategory.id) : '',
    );
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        if (!newPhoto) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(newPhoto);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [newPhoto]);

    function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setPhotoError('Foto harus JPG, PNG, atau WEBP.');
            event.target.value = '';

            return;
        }

        if (file.size > MAX_PHOTO_BYTES) {
            setPhotoError('Ukuran foto maksimal 5 MB.');
            event.target.value = '';

            return;
        }

        setPhotoError(null);
        setRemovePhoto(false);
        setNewPhoto(file);
    }

    function clearPhoto() {
        setNewPhoto(null);

        if (fileInput.current) {
            fileInput.current.value = '';
        }

        if (item?.image_url) {
            setRemovePhoto(true);
        }
    }

    const mainCategories = categories.filter((category) => !category.parent_id);
    const itemTypes = categories.filter(
        (category) => String(category.parent_id) === mainCategoryId,
    );
    const nextCode = categories.find(
        (category) => String(category.id) === subcategoryId,
    )?.next_code;
    const shownPhoto = preview ?? (removePhoto ? null : item?.image_url);
    const title = isEditing ? `Edit ${item.name}` : 'Tambah Perlengkapan';
    const formDefinition = isEditing
        ? itemUpdate.form(item.code)
        : itemStore.form();

    return (
        <AppLayout
            title={title}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Perlengkapan Kantor', href: itemsIndex.url() },
                ...(isEditing
                    ? [{ title: item.name, href: itemShow.url(item.code) }]
                    : []),
                { title: isEditing ? 'Edit' : 'Tambah' },
            ]}
        >
            <PageHeader
                eyebrow={
                    <span className="text-sm text-ink-500">
                        {isEditing
                            ? item.code
                            : nextCode
                              ? `Kode otomatis: ${nextCode}`
                              : 'Kode dibuat otomatis setelah jenis barang dipilih'}
                    </span>
                }
                title={title}
                description={
                    isEditing
                        ? 'Ubah data perlengkapan. Stok tidak diubah di sini, melainkan lewat barang masuk, keluar, atau cek stok.'
                        : 'Daftarkan perlengkapan kantor baru dengan stok 0. Stoknya diisi lewat Barang Masuk.'
                }
                actions={
                    isEditing &&
                    canDelete && (
                        <Button
                            variant="ghost"
                            icon={<TrashIcon className="size-4" />}
                            onClick={() => setConfirmingDelete(true)}
                            disabled={item.has_transactions}
                            title={
                                item.has_transactions
                                    ? 'Perlengkapan yang sudah punya transaksi tidak bisa dihapus'
                                    : undefined
                            }
                            className="text-low-ink hover:bg-low/10"
                        >
                            Hapus perlengkapan
                        </Button>
                    )
                }
            />

            <FormNotes
                id="item-form"
                dos={[
                    'Gunakan nama yang mudah dicari, dan isi perbedaan seperti warna atau ukuran di kolom Varian.',
                    'Isi stok minimum agar lonceng mengingatkan sebelum barang habis.',
                ]}
                donts={[
                    'Membuat perlengkapan yang sama dua kali. Cari dulu di daftar Perlengkapan Kantor.',
                    'Mengisi stok di sini. Stok diisi lewat Barang Masuk.',
                ]}
            />

            <Form
                {...formDefinition}
                className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"
            >
                {({ errors, processing }) => (
                    <>
                        <Card className="flex flex-col gap-4 p-4">
                            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-media">
                                {shownPhoto ? (
                                    <img
                                        src={shownPhoto}
                                        alt="Foto barang"
                                        className="size-full object-contain p-3"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-brand-300">
                                        <BoxIcon
                                            className="size-12"
                                            strokeWidth={1.25}
                                        />
                                        <span className="text-xs font-medium text-ink-400">
                                            Belum ada foto
                                        </span>
                                    </div>
                                )}
                                {shownPhoto && (
                                    <button
                                        type="button"
                                        onClick={clearPhoto}
                                        aria-label="Hapus foto"
                                        className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow hover:text-low"
                                    >
                                        <XIcon className="size-4" />
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInput}
                                id="photo"
                                name="photo"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePhoto}
                                className="sr-only"
                            />
                            <input
                                type="hidden"
                                name="remove_photo"
                                value={removePhoto ? '1' : '0'}
                            />
                            <label
                                htmlFor="photo"
                                className={buttonClasses(
                                    'soft',
                                    'md',
                                    'w-full cursor-pointer',
                                )}
                            >
                                <ImageIcon className="size-[18px]" />
                                {shownPhoto
                                    ? 'Ganti foto'
                                    : 'Unggah atau ambil foto'}
                            </label>
                            <p className="text-center text-xs text-ink-500">
                                Opsional · JPG, PNG, WEBP · maks. 5 MB
                            </p>
                            {(photoError ?? errors.photo) && (
                                <p className="text-sm text-low-ink">
                                    {photoError ?? errors.photo}
                                </p>
                            )}
                        </Card>

                        <Card>
                            <CardHeader title="Data perlengkapan" />
                            <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
                                <Field
                                    label="Nama barang"
                                    htmlFor="name"
                                    error={errors.name}
                                >
                                    <input
                                        id="name"
                                        name="name"
                                        defaultValue={item?.name}
                                        required
                                        placeholder="Contoh: Kalender Meja 2028"
                                        aria-invalid={Boolean(errors.name)}
                                        className={inputClasses}
                                    />
                                </Field>
                                <Field
                                    label="Varian"
                                    htmlFor="variant"
                                    hint="Opsional"
                                    error={errors.variant}
                                >
                                    <input
                                        id="variant"
                                        name="variant"
                                        defaultValue={item?.variant ?? ''}
                                        placeholder="Contoh: Akrilik, Biru, A4"
                                        className={inputClasses}
                                    />
                                </Field>
                                <Field
                                    label="Kategori"
                                    htmlFor="main_category"
                                    error={
                                        mainCategoryId
                                            ? undefined
                                            : errors.category_id
                                    }
                                >
                                    <Select
                                        id="main_category"
                                        value={mainCategoryId}
                                        onChange={(value) => {
                                            setMainCategoryId(value);
                                            setSubcategoryId('');
                                        }}
                                        placeholder="Pilih kategori"
                                        options={mainCategories.map(
                                            (category) => ({
                                                value: String(category.id),
                                                label: category.name,
                                                description: category.code,
                                            }),
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Jenis barang"
                                    htmlFor="subcategory"
                                    hint={
                                        mainCategoryId && itemTypes.length === 0
                                            ? 'Kategori ini belum punya jenis barang. Tambahkan di Master Data → Kategori.'
                                            : 'Kode barang dibuat otomatis dari kategori dan jenis ini.'
                                    }
                                    error={
                                        mainCategoryId
                                            ? errors.category_id
                                            : undefined
                                    }
                                >
                                    <Select
                                        id="subcategory"
                                        value={subcategoryId}
                                        onChange={setSubcategoryId}
                                        disabled={!mainCategoryId}
                                        invalid={Boolean(errors.category_id)}
                                        placeholder={
                                            mainCategoryId
                                                ? 'Pilih jenis barang'
                                                : 'Pilih kategori dulu'
                                        }
                                        options={itemTypes.map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                            description: category.code,
                                        }))}
                                    />
                                </Field>
                                <input
                                    type="hidden"
                                    name="category_id"
                                    value={subcategoryId}
                                />
                                <Field
                                    label="Satuan"
                                    htmlFor="unit"
                                    error={errors.unit}
                                >
                                    <Autocomplete
                                        id="unit"
                                        name="unit"
                                        defaultValue={item?.unit ?? 'pcs'}
                                        options={units}
                                        required
                                        invalid={Boolean(errors.unit)}
                                    />
                                </Field>
                                <Field
                                    label="Lokasi rak"
                                    htmlFor="location"
                                    hint="Opsional"
                                    error={errors.location}
                                >
                                    <input
                                        id="location"
                                        name="location"
                                        defaultValue={item?.location ?? ''}
                                        placeholder="Contoh: Rak A5"
                                        className={inputClasses}
                                    />
                                </Field>
                                <Field
                                    label="Stok minimum"
                                    htmlFor="minimum_stock"
                                    hint="Batas notifikasi stok rendah"
                                    error={errors.minimum_stock}
                                >
                                    <input
                                        id="minimum_stock"
                                        name="minimum_stock"
                                        type="number"
                                        min={0}
                                        defaultValue={item?.minimum_stock ?? 0}
                                        required
                                        aria-invalid={Boolean(
                                            errors.minimum_stock,
                                        )}
                                        className={`${inputClasses} tabular-nums`}
                                    />
                                </Field>
                                <div className="md:col-span-2">
                                    <Field
                                        label="Keterangan"
                                        htmlFor="description"
                                        hint="Opsional"
                                        error={errors.description}
                                    >
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={3}
                                            defaultValue={
                                                item?.description ?? ''
                                            }
                                            className="w-full rounded-xl border border-ink-200 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
                                        />
                                    </Field>
                                </div>
                                <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-3.5 md:col-span-2">
                                    <input
                                        type="hidden"
                                        name="notify_low_stock"
                                        value="0"
                                    />
                                    <input
                                        type="checkbox"
                                        name="notify_low_stock"
                                        value="1"
                                        defaultChecked={
                                            item?.notify_low_stock ?? true
                                        }
                                        className="mt-0.5 size-[18px] accent-brand-700"
                                    />
                                    <span className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium text-ink-900">
                                            Terima notifikasi stok rendah
                                        </span>
                                        <span className="text-xs text-ink-500">
                                            Lonceng menyala saat stok mencapai
                                            batas minimum.
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 border-t border-ink-100 px-5 py-4">
                                <Link
                                    href={
                                        isEditing
                                            ? itemShow.url(item.code)
                                            : itemsIndex.url()
                                    }
                                    className={buttonClasses('ghost')}
                                >
                                    Batal
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Menyimpan…'
                                        : isEditing
                                          ? 'Simpan perubahan'
                                          : 'Tambah perlengkapan'}
                                </Button>
                            </div>
                        </Card>
                    </>
                )}
            </Form>

            {isEditing && (
                <ConfirmDeleteDialog
                    open={confirmingDelete}
                    onClose={() => setConfirmingDelete(false)}
                    title={`Hapus ${item.name}?`}
                    description="Perlengkapan ini belum punya transaksi, jadi bisa dihapus permanen."
                    url={itemDestroy.url(item.code)}
                />
            )}
        </AppLayout>
    );
}
