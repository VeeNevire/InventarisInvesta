import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import { BoxIcon, LaptopIcon, PlusIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, inputClasses } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { destroy, store, update } from '@/routes/master/categories';
import { Select } from '@/components/ui/select';

type CategoryType = 'persediaan' | 'aset';

type Category = {
    id: number;
    type: CategoryType;
    code: string;
    name: string;
    items_count: number;
    assets_count: number;
    is_used: boolean;
    parent_id: number | null;
    parent_name: string | null;
    children_count: number;
};

export default function Categories({ categories }: { categories: Category[] }) {
    const [type, setType] = useState<CategoryType>('persediaan');
    const [categoryLevel, setCategoryLevel] = useState<'all' | 'main' | 'sub'>(
        'all',
    );
    const [parentFilter, setParentFilter] = useState('');
    const [formType, setFormType] = useState<CategoryType>('persediaan');
    const [editing, setEditing] = useState<Category | 'new' | null>(null);
    const [parentCategory, setParentCategory] = useState<Category | null>(null);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [deleting, setDeleting] = useState<Category | null>(null);
    const current = editing === 'new' ? null : editing;
    const visible = categories.filter(
        (category) =>
            category.type === type &&
            (type !== 'persediaan' ||
                categoryLevel === 'all' ||
                (categoryLevel === 'main'
                    ? !category.parent_id
                    : Boolean(category.parent_id) &&
                      (!parentFilter ||
                          String(category.parent_id) === parentFilter))),
    );

    return (
        <MasterLayout
            title="Kategori"
            description="Pengelompokan barang dan aset. Kodenya menjadi awalan kode barang (MRC-001) dan kode aset (INV-LPT-001)."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => {
                        setFormType(type);
                        setEditing('new');
                    }}
                >
                    Tambah kategori
                </Button>
            }
        >
            <div className="w-fit rounded-2xl bg-white/70 p-1.5">
                <SegmentedControl<CategoryType>
                    label="Jenis kategori"
                    value={type}
                    onChange={setType}
                    segments={[
                        {
                            value: 'persediaan',
                            label: 'Barang persediaan',
                            count: categories.filter(
                                (category) => category.type === 'persediaan',
                            ).length,
                        },
                        {
                            value: 'aset',
                            label: 'Aset',
                            count: categories.filter(
                                (category) => category.type === 'aset',
                            ).length,
                        },
                    ]}
                />
            </div>

            {type === 'persediaan' && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 p-3">
                    <SegmentedControl
                        label="Filter kategori"
                        value={categoryLevel}
                        onChange={(level) => {
                            setCategoryLevel(level);
                            setParentFilter('');
                        }}
                        segments={[
                            { value: 'all', label: 'Semua' },
                            { value: 'main', label: 'Kategori utama' },
                            { value: 'sub', label: 'Subkategori' },
                        ]}
                    />
                    {categoryLevel === 'sub' && (
                        <div className="w-full sm:w-64">
                            <Select
                                id="parent-filter"
                                aria-label="Filter kategori utama"
                                value={parentFilter}
                                onChange={setParentFilter}
                                placeholder="Semua kategori utama"
                                options={[
                                    {
                                        value: '',
                                        label: 'Semua kategori utama',
                                    },
                                    ...categories
                                        .filter(
                                            (category) =>
                                                category.type ===
                                                    'persediaan' &&
                                                !category.parent_id,
                                        )
                                        .map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                        })),
                                ]}
                            />
                        </div>
                    )}
                </div>
            )}

            <MasterTable minWidth="560px">
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">Kode</th>
                        <th className="px-3 py-3.5 font-medium">Nama</th>
                        <th className="px-3 py-3.5 font-medium">Contoh kode</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            {type === 'aset' ? 'Jumlah aset' : 'Jumlah barang'}
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {visible.map((category) => (
                        <tr key={category.id}>
                            <td className="py-3 pr-3 pl-5">
                                <span className="rounded-md bg-ink-100 px-2 py-1 font-mono text-xs font-semibold text-ink-900">
                                    {category.code}
                                </span>
                            </td>
                            <td className="px-3 py-3">
                                <span className="flex items-center gap-2.5 font-semibold text-ink-900">
                                    {category.type === 'aset' ? (
                                        <LaptopIcon className="size-4 text-ink-400" />
                                    ) : (
                                        <BoxIcon className="size-4 text-ink-400" />
                                    )}
                                    <span className="flex flex-col items-start gap-1">
                                        {category.name}
                                        {category.parent_name && (
                                            <span
                                                className="rounded-md bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700"
                                                title={`Kategori utama: ${category.parent_name}`}
                                            >
                                                {category.parent_name}
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-ink-500">
                                {category.type === 'aset'
                                    ? `INV-${category.code}-001`
                                    : `${category.code}-001`}
                            </td>
                            <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                                {category.type === 'aset'
                                    ? category.assets_count
                                    : category.items_count}
                            </td>
                            <td className="py-3 pr-5 pl-3">
                                <RowActions
                                    extraAction={
                                        category.type === 'persediaan' &&
                                        !category.parent_id ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setParentCategory(category);
                                                    setSelectedChildId('');
                                                }}
                                            >
                                                Subkategori
                                            </Button>
                                        ) : undefined
                                    }
                                    onEdit={() => {
                                        setFormType(category.type);
                                        setEditing(category);
                                    }}
                                    onDelete={() => setDeleting(category)}
                                    canDelete={!category.is_used}
                                    deleteHint="Kategori ini masih dipakai."
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </MasterTable>

            <Dialog
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={current ? `Edit ${current.name}` : 'Tambah kategori'}
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
                                label="Jenis"
                                htmlFor="category-type"
                                error={errors.type}
                            >
                                <Select
                                    id="category-type"
                                    name="type"
                                    value={formType}
                                    onChange={(value) =>
                                        setFormType(value as CategoryType)
                                    }
                                    disabled={current?.is_used}
                                    options={[
                                        {
                                            value: 'persediaan',
                                            label: 'Barang persediaan',
                                            description:
                                                'Habis pakai, dihitung jumlahnya',
                                        },
                                        {
                                            value: 'aset',
                                            label: 'Aset',
                                            description:
                                                'Dipakai, dicatat per unit',
                                        },
                                    ]}
                                />
                            </Field>
                            {current?.parent_id && (
                                <input
                                    type="hidden"
                                    name="parent_id"
                                    value={current.parent_id}
                                />
                            )}
                            <Field
                                label="Kode"
                                htmlFor="category-code"
                                hint={
                                    current?.is_used
                                        ? 'Terkunci karena sudah dipakai'
                                        : '2–5 huruf, misalnya MRC atau LPT'
                                }
                                error={errors.code}
                            >
                                <input
                                    id="category-code"
                                    name="code"
                                    defaultValue={current?.code}
                                    readOnly={current?.is_used}
                                    required
                                    maxLength={5}
                                    autoFocus={!current}
                                    aria-invalid={Boolean(errors.code)}
                                    className={`${inputClasses} font-mono uppercase read-only:bg-ink-50 read-only:text-ink-500`}
                                />
                            </Field>
                            <Field
                                label="Nama kategori"
                                htmlFor="category-name"
                                error={errors.name}
                            >
                                <input
                                    id="category-name"
                                    name="name"
                                    defaultValue={current?.name}
                                    required
                                    autoFocus={Boolean(current)}
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

            {parentCategory && (
                <Dialog
                    open
                    onClose={() => setParentCategory(null)}
                    title="Kelola subkategori"
                    description={`Kategori utama: ${parentCategory.name}`}
                >
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2 text-sm text-ink-700">
                            <p className="font-semibold">
                                Subkategori saat ini
                            </p>
                            {categories.filter(
                                (category) =>
                                    category.parent_id === parentCategory.id,
                            ).length === 0 && <p>Belum ada subkategori.</p>}
                            {categories
                                .filter(
                                    (category) =>
                                        category.parent_id ===
                                        parentCategory.id,
                                )
                                .map((category) => (
                                    <Form
                                        key={category.id}
                                        {...update.form(category.id)}
                                        options={{ preserveScroll: true }}
                                        className="flex items-center justify-between gap-2 rounded-xl bg-ink-50 px-3"
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                <span>
                                                    {category.name} (
                                                    {category.code})
                                                </span>
                                                <input
                                                    type="hidden"
                                                    name="type"
                                                    value={category.type}
                                                />
                                                <input
                                                    type="hidden"
                                                    name="code"
                                                    value={category.code}
                                                />
                                                <input
                                                    type="hidden"
                                                    name="name"
                                                    value={category.name}
                                                />
                                                <input
                                                    type="hidden"
                                                    name="parent_id"
                                                    value=""
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={processing}
                                                >
                                                    Lepas
                                                </Button>
                                                {errors.parent_id && (
                                                    <span className="text-red-700">
                                                        {errors.parent_id}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Form>
                                ))}
                        </div>
                        <Form
                            {...store.form()}
                            onSuccess={() => setParentCategory(null)}
                            className="flex flex-col gap-3 border-t border-ink-100 pt-4"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <p className="font-semibold text-ink-900">
                                        Tambah subkategori baru
                                    </p>
                                    <input
                                        type="hidden"
                                        name="type"
                                        value={parentCategory.type}
                                    />
                                    <input
                                        type="hidden"
                                        name="parent_id"
                                        value={parentCategory.id}
                                    />
                                    <Field
                                        label="Nama subkategori"
                                        htmlFor="new-subcategory-name"
                                        error={errors.name}
                                    >
                                        <input
                                            id="new-subcategory-name"
                                            name="name"
                                            className={inputClasses}
                                            required
                                        />
                                    </Field>
                                    <Field
                                        label="Kode subkategori"
                                        htmlFor="new-subcategory-code"
                                        hint="2–5 huruf, misalnya ATK"
                                        error={errors.code}
                                    >
                                        <input
                                            id="new-subcategory-code"
                                            name="code"
                                            className={inputClasses}
                                            maxLength={5}
                                            required
                                        />
                                    </Field>
                                    <Button
                                        type="submit"
                                        variant="soft"
                                        disabled={processing}
                                    >
                                        Tambah subkategori
                                    </Button>
                                </>
                            )}
                        </Form>
                        {(() => {
                            const available = categories.filter(
                                (category) =>
                                    category.type === parentCategory.type &&
                                    !category.parent_id &&
                                    category.id !== parentCategory.id &&
                                    !category.children_count,
                            );
                            const selected = available.find(
                                (category) =>
                                    String(category.id) === selectedChildId,
                            );
                            return (
                                available.length > 0 && (
                                    <Form
                                        {...(selected
                                            ? update.form(selected.id)
                                            : update.form(parentCategory.id))}
                                        onSuccess={() =>
                                            setParentCategory(null)
                                        }
                                        className="flex flex-col gap-3 border-t border-ink-100 pt-4"
                                    >
                                        {({ errors, processing }) => (
                                            <>
                                                <p className="font-semibold text-ink-900">
                                                    Masukkan kategori yang sudah
                                                    ada
                                                </p>
                                                <Select
                                                    id="existing-subcategory"
                                                    value={selectedChildId}
                                                    onChange={
                                                        setSelectedChildId
                                                    }
                                                    placeholder="Pilih kategori"
                                                    options={available.map(
                                                        (category) => ({
                                                            value: String(
                                                                category.id,
                                                            ),
                                                            label: `${category.name} (${category.code})`,
                                                        }),
                                                    )}
                                                />
                                                {selected && (
                                                    <>
                                                        <input
                                                            type="hidden"
                                                            name="type"
                                                            value={
                                                                selected.type
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="code"
                                                            value={
                                                                selected.code
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="name"
                                                            value={
                                                                selected.name
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="parent_id"
                                                            value={
                                                                parentCategory.id
                                                            }
                                                        />
                                                    </>
                                                )}
                                                {errors.parent_id && (
                                                    <p className="text-sm text-red-700">
                                                        {errors.parent_id}
                                                    </p>
                                                )}
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    disabled={
                                                        !selected || processing
                                                    }
                                                >
                                                    Masukkan ke kategori ini
                                                </Button>
                                            </>
                                        )}
                                    </Form>
                                )
                            );
                        })()}
                        <DialogFooter>
                            <Button
                                variant="ghost"
                                onClick={() => setParentCategory(null)}
                            >
                                Tutup
                            </Button>
                        </DialogFooter>
                    </div>
                </Dialog>
            )}

            {deleting && (
                <ConfirmDeleteDialog
                    open
                    onClose={() => setDeleting(null)}
                    title={`Hapus kategori ${deleting.name}?`}
                    description="Kategori ini belum dipakai, jadi bisa dihapus permanen."
                    url={destroy.url(deleting.id)}
                />
            )}
        </MasterLayout>
    );
}
