import { Form, Link } from '@inertiajs/react';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ImageIcon, LaptopIcon, XIcon } from '@/components/icons';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, inputClasses } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import AppLayout from '@/layouts/app-layout';
import { formatRupiah } from '@/lib/format';
import { dashboard } from '@/routes';
import {
    index as assetsIndex,
    show as assetShow,
    store as assetStore,
    update as assetUpdate,
} from '@/routes/assets';
import type { Asset } from '@/types';
import { Select } from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';
import { FormNotes } from '@/components/form-notes';

type EditableAsset = Asset & {
    category_id: number;
    useful_life_months: number | null;
    residual_value: number | null;
};

type AssetFormProps = {
    asset: EditableAsset | null;
    categories: {
        id: number;
        code: string;
        name: string;
        parent_id: number | null;
        code_path: string;
        next_sequence: number;
    }[];
    suppliers: string[];
    today: string;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function AssetForm({
    asset,
    categories,
    suppliers,
    today,
}: AssetFormProps) {
    const isEditing = asset !== null;
    const fileInput = useRef<HTMLInputElement>(null);
    const initialCategory = categories.find(
        (category) => category.id === asset?.category_id,
    );
    const [mainCategoryId, setMainCategoryId] = useState(
        initialCategory
            ? String(initialCategory.parent_id ?? initialCategory.id)
            : '',
    );
    const [categoryId, setCategoryId] = useState(
        initialCategory?.parent_id ? String(initialCategory.id) : '',
    );
    const [purchasedOn, setPurchasedOn] = useState(
        asset?.purchased_on ?? today,
    );
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [categoryCode, setCategoryCode] = useState('');
    const [isDepreciated, setIsDepreciated] = useState(
        asset?.is_depreciated ?? false,
    );
    const [price, setPrice] = useState(
        asset ? String(asset.purchase_price) : '',
    );
    const [lifeMonths, setLifeMonths] = useState(
        asset?.useful_life_months ? String(asset.useful_life_months) : '48',
    );
    const [residual, setResidual] = useState(
        asset?.residual_value !== null && asset?.residual_value !== undefined
            ? String(asset.residual_value)
            : '0',
    );
    const [newPhoto, setNewPhoto] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

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

        if (asset?.image_url) {
            setRemovePhoto(true);
        }
    }

    const purchaseYear = purchasedOn.slice(0, 4) || today.slice(0, 4);
    const codeFor = (codePath: string, sequence: number) =>
        `INVESTA-PRL-${purchaseYear}-${codePath}-${String(sequence).padStart(3, '0')}`;
    const mainCategories = categories.filter((category) => !category.parent_id);
    const mainCategory = mainCategories.find(
        (category) => String(category.id) === mainCategoryId,
    );
    const itemTypes = categories.filter(
        (category) => String(category.parent_id) === mainCategoryId,
    );
    const selectedCategory = itemTypes.find(
        (category) => String(category.id) === categoryId,
    );
    const shownPhoto = preview ?? (removePhoto ? null : asset?.image_url);
    const monthly =
        isDepreciated && Number(lifeMonths) > 0
            ? Math.max(0, (Number(price) || 0) - (Number(residual) || 0)) /
              Number(lifeMonths)
            : 0;
    const title = isEditing ? `Edit ${asset.name}` : 'Tambah Peralatan';

    return (
        <AppLayout
            title={title}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Peralatan Kantor', href: assetsIndex.url() },
                ...(isEditing
                    ? [{ title: asset.code, href: assetShow.url(asset.code) }]
                    : []),
                { title: isEditing ? 'Edit' : 'Tambah' },
            ]}
        >
            <PageHeader
                eyebrow={
                    <span className="text-sm text-ink-500">
                        {isEditing
                            ? asset.code
                            : selectedCategory && !isNewCategory
                              ? `Kode otomatis: ${codeFor(selectedCategory.code_path, selectedCategory.next_sequence)}`
                              : isNewCategory && mainCategory && categoryCode
                                ? `Kode otomatis: ${codeFor(`${mainCategory.code}-${categoryCode}`, 1)}`
                                : 'Kode dibuat otomatis setelah jenis barang dipilih'}
                    </span>
                }
                title={title}
                description={
                    isEditing
                        ? 'Ubah data peralatan. Pemegang dan status diubah lewat tombol Serahkan, Kembalikan, atau Servis di halaman detail.'
                        : 'Daftarkan peralatan kantor baru. Setelah disimpan statusnya Tersedia, lalu bisa diserahkan ke karyawan atau ruangan.'
                }
            />

            <FormNotes
                id="asset-form"
                dos={[
                    'Isi nomor seri supaya peralatan mudah dilacak dan tidak tertukar.',
                    'Isi harga dan tanggal beli sesuai nota pembelian.',
                ]}
                donts={[
                    'Mendaftarkan peralatan yang sama dua kali.',
                    'Mencatat barang habis pakai (ATK, tisu, kalender) sebagai peralatan. Gunakan menu Perlengkapan Kantor.',
                ]}
            />

            <Form
                {...(isEditing
                    ? assetUpdate.form(asset.code)
                    : assetStore.form())}
                className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"
            >
                {({ errors, processing }) => (
                    <>
                        <Card className="flex flex-col gap-4 p-4">
                            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-media">
                                {shownPhoto ? (
                                    <img
                                        src={shownPhoto}
                                        alt="Foto peralatan"
                                        className="size-full object-contain p-3"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-brand-300">
                                        <LaptopIcon
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

                        <div className="flex min-w-0 flex-col gap-4">
                            <Card>
                                <CardHeader title="Data peralatan" />
                                <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
                                    <Field
                                        label="Kategori"
                                        htmlFor="main_category"
                                        error={errors.category_parent_id}
                                    >
                                        <Select
                                            id="main_category"
                                            name={
                                                isNewCategory
                                                    ? 'category_parent_id'
                                                    : undefined
                                            }
                                            value={mainCategoryId}
                                            onChange={(value) => {
                                                setMainCategoryId(value);
                                                setCategoryId('');
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
                                    {isNewCategory ? (
                                        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                                            <Field
                                                label="Jenis barang baru"
                                                htmlFor="category_name"
                                                error={errors.category_name}
                                            >
                                                <input
                                                    id="category_name"
                                                    name="category_name"
                                                    className={inputClasses}
                                                    placeholder="Contoh: Laptop"
                                                />
                                            </Field>
                                            <Field
                                                label="Kode"
                                                htmlFor="category_code"
                                                error={errors.category_code}
                                            >
                                                <input
                                                    id="category_code"
                                                    name="category_code"
                                                    value={categoryCode}
                                                    onChange={(event) =>
                                                        setCategoryCode(
                                                            event.target.value.toUpperCase(),
                                                        )
                                                    }
                                                    className={inputClasses}
                                                    maxLength={5}
                                                    placeholder="LPT"
                                                />
                                            </Field>
                                        </div>
                                    ) : (
                                        <Field
                                            label="Jenis barang"
                                            htmlFor="category_id"
                                            hint={
                                                mainCategoryId &&
                                                itemTypes.length === 0
                                                    ? 'Kategori ini belum punya jenis barang. Centang "Tambah jenis barang baru".'
                                                    : undefined
                                            }
                                            error={errors.category_id}
                                        >
                                            <Select
                                                id="category_id"
                                                name="category_id"
                                                value={categoryId}
                                                onChange={setCategoryId}
                                                disabled={!mainCategoryId}
                                                invalid={Boolean(
                                                    errors.category_id,
                                                )}
                                                placeholder={
                                                    mainCategoryId
                                                        ? 'Pilih jenis barang'
                                                        : 'Pilih kategori dulu'
                                                }
                                                options={itemTypes.map(
                                                    (category) => ({
                                                        value: String(
                                                            category.id,
                                                        ),
                                                        label: category.name,
                                                        description: `Kode berikutnya ${codeFor(category.code_path, category.next_sequence)}`,
                                                    }),
                                                )}
                                            />
                                        </Field>
                                    )}
                                    {!isEditing && (
                                        <label className="flex items-center gap-2 text-sm text-ink-700 md:col-span-2">
                                            <input
                                                type="checkbox"
                                                name="new_category"
                                                value="1"
                                                checked={isNewCategory}
                                                onChange={(event) => {
                                                    setIsNewCategory(
                                                        event.target.checked,
                                                    );
                                                    setCategoryId('');
                                                    setCategoryCode('');
                                                }}
                                            />
                                            Tambah jenis barang baru di kategori
                                            ini
                                        </label>
                                    )}
                                    <Field
                                        label="Nama peralatan"
                                        htmlFor="name"
                                        error={errors.name}
                                    >
                                        <input
                                            id="name"
                                            name="name"
                                            defaultValue={asset?.name}
                                            required
                                            placeholder="Contoh: Laptop Lenovo ThinkPad E14"
                                            aria-invalid={Boolean(errors.name)}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <Field
                                        label="Merek"
                                        htmlFor="brand"
                                        hint="Opsional"
                                        error={errors.brand}
                                    >
                                        <input
                                            id="brand"
                                            name="brand"
                                            defaultValue={asset?.brand ?? ''}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <Field
                                        label="Model / tipe"
                                        htmlFor="model"
                                        hint="Opsional"
                                        error={errors.model}
                                    >
                                        <input
                                            id="model"
                                            name="model"
                                            defaultValue={asset?.model ?? ''}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <Field
                                        label="Nomor seri"
                                        htmlFor="serial_number"
                                        hint="Opsional"
                                        error={errors.serial_number}
                                    >
                                        <input
                                            id="serial_number"
                                            name="serial_number"
                                            defaultValue={
                                                asset?.serial_number ?? ''
                                            }
                                            aria-invalid={Boolean(
                                                errors.serial_number,
                                            )}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <Field
                                        label="Supplier / toko"
                                        htmlFor="supplier_name"
                                        hint="Opsional, ketik bebas"
                                        error={errors.supplier_name}
                                    >
                                        <Autocomplete
                                            id="supplier_name"
                                            name="supplier_name"
                                            defaultValue={asset?.supplier ?? ''}
                                            options={suppliers}
                                            placeholder="Contoh: Mitra Komputer"
                                        />
                                    </Field>
                                    <div className="md:col-span-2">
                                        <Field
                                            label="Spesifikasi"
                                            htmlFor="specification"
                                            hint="Opsional"
                                            error={errors.specification}
                                        >
                                            <textarea
                                                id="specification"
                                                name="specification"
                                                rows={2}
                                                defaultValue={
                                                    asset?.specification ?? ''
                                                }
                                                placeholder="Contoh: Core i5 · 16 GB RAM · 512 GB SSD"
                                                className="w-full rounded-xl border border-ink-200 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <CardHeader
                                    title="Pembelian & nilai"
                                    description="Penyusutan opsional, memakai metode garis lurus."
                                />
                                <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
                                    <Field
                                        label="Tanggal beli"
                                        hint={
                                            isEditing
                                                ? undefined
                                                : 'Tahunnya menjadi Tahun Pembelian di kode.'
                                        }
                                        htmlFor="purchased_on"
                                        error={errors.purchased_on}
                                    >
                                        <input
                                            id="purchased_on"
                                            name="purchased_on"
                                            type="date"
                                            max={today}
                                            value={purchasedOn}
                                            onChange={(event) =>
                                                setPurchasedOn(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            aria-invalid={Boolean(
                                                errors.purchased_on,
                                            )}
                                            className={inputClasses}
                                        />
                                    </Field>
                                    <Field
                                        label="Harga perolehan (Rp)"
                                        htmlFor="purchase_price"
                                        error={errors.purchase_price}
                                    >
                                        <input
                                            id="purchase_price"
                                            name="purchase_price"
                                            type="number"
                                            min={0}
                                            value={price}
                                            onChange={(event) =>
                                                setPrice(event.target.value)
                                            }
                                            required
                                            aria-invalid={Boolean(
                                                errors.purchase_price,
                                            )}
                                            className={`${inputClasses} tabular-nums`}
                                        />
                                    </Field>
                                    <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-3.5 md:col-span-2">
                                        <input
                                            type="hidden"
                                            name="is_depreciated"
                                            value="0"
                                        />
                                        <input
                                            type="checkbox"
                                            name="is_depreciated"
                                            value="1"
                                            checked={isDepreciated}
                                            onChange={(event) =>
                                                setIsDepreciated(
                                                    event.target.checked,
                                                )
                                            }
                                            className="mt-0.5 size-[18px] accent-brand-700"
                                        />
                                        <span className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-ink-900">
                                                Hitung penyusutan
                                            </span>
                                            <span className="text-xs text-ink-500">
                                                Nilai buku peralatan berkurang
                                                tiap bulan sampai masa
                                                manfaatnya habis.
                                            </span>
                                        </span>
                                    </label>
                                    {isDepreciated && (
                                        <>
                                            <Field
                                                label="Masa manfaat (bulan)"
                                                htmlFor="useful_life_months"
                                                hint="Laptop umumnya 48 bulan"
                                                error={
                                                    errors.useful_life_months
                                                }
                                            >
                                                <input
                                                    id="useful_life_months"
                                                    name="useful_life_months"
                                                    type="number"
                                                    min={1}
                                                    value={lifeMonths}
                                                    onChange={(event) =>
                                                        setLifeMonths(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={`${inputClasses} tabular-nums`}
                                                />
                                            </Field>
                                            <Field
                                                label="Nilai sisa (Rp)"
                                                htmlFor="residual_value"
                                                hint="Perkiraan nilai di akhir masa manfaat"
                                                error={errors.residual_value}
                                            >
                                                <input
                                                    id="residual_value"
                                                    name="residual_value"
                                                    type="number"
                                                    min={0}
                                                    value={residual}
                                                    onChange={(event) =>
                                                        setResidual(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={`${inputClasses} tabular-nums`}
                                                />
                                            </Field>
                                            <p className="rounded-xl bg-brand-50/60 px-3.5 py-2.5 text-[13px] text-ink-700 md:col-span-2">
                                                Penyusutan sekitar{' '}
                                                <strong className="font-semibold text-ink-900">
                                                    {formatRupiah(monthly)}
                                                </strong>{' '}
                                                per bulan.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 border-t border-ink-100 px-5 py-4">
                                    <Link
                                        href={
                                            isEditing
                                                ? assetShow.url(asset.code)
                                                : assetsIndex.url()
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
                                              : 'Tambah peralatan'}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </>
                )}
            </Form>
        </AppLayout>
    );
}
