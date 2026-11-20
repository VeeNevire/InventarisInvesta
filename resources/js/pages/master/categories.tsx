import { Form } from '@inertiajs/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import { BoxIcon, LaptopIcon, PlusIcon, TagIcon } from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputClasses } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { destroy, store, update } from '@/routes/master/categories';

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

/** What the dialog is doing: a new main category, a new subcategory, or an edit. */
type Editing =
    | { mode: 'new'; type: CategoryType }
    | { mode: 'new-sub'; parent: Category }
    | { mode: 'edit'; category: Category };

const typeInfo: Record<
    CategoryType,
    { label: string; hint: string; codeExample: (code: string) => string }
> = {
    persediaan: {
        label: 'Barang persediaan',
        hint: 'Barang habis pakai yang dihitung jumlahnya, seperti ATK atau merchandise. Bisa punya subkategori.',
        codeExample: (code) => `${code}-001`,
    },
    aset: {
        label: 'Aset',
        hint: 'Barang yang dipakai dan dicatat per unit, seperti laptop atau printer.',
        codeExample: (code) => `INV-${code}-001`,
    },
};

export default function Categories({ categories }: { categories: Category[] }) {
    const [type, setType] = useState<CategoryType>('persediaan');
    const [editing, setEditing] = useState<Editing | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);

    const ofType = categories.filter((category) => category.type === type);
    const mainCategories = ofType.filter((category) => !category.parent_id);
    const rows = mainCategories.flatMap((main) => [
        main,
        ...ofType.filter((category) => category.parent_id === main.id),
    ]);

    return (
        <MasterLayout
            title="Kategori"
            description="Kelompok barang dan aset. Setiap kategori punya kode singkat yang menjadi awalan kode barangnya."
            actions={
                <Button
                    icon={<PlusIcon className="size-[18px]" />}
                    onClick={() => setEditing({ mode: 'new', type })}
                >
                    Tambah kategori
                </Button>
            }
        >
            <div className="flex flex-col gap-3 rounded-2xl bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <SegmentedControl<CategoryType>
                    label="Jenis kategori"
                    value={type}
                    onChange={setType}
                    segments={(['persediaan', 'aset'] as const).map(
                        (value) => ({
                            value,
                            label: (
                                <>
                                    {value === 'aset' ? (
                                        <LaptopIcon className="size-4" />
                                    ) : (
                                        <BoxIcon className="size-4" />
                                    )}
                                    {typeInfo[value].label}
                                </>
                            ),
                            count: categories.filter(
                                (category) => category.type === value,
                            ).length,
                        }),
                    )}
                />
                <p className="max-w-md text-[13px] text-ink-500 sm:text-right">
                    {typeInfo[type].hint}
                </p>
            </div>

            <MasterTable
                minWidth="620px"
                empty={
                    rows.length === 0 && (
                        <EmptyState
                            icon={TagIcon}
                            title={`Belum ada kategori ${typeInfo[type].label.toLowerCase()}`}
                            description={
                                type === 'aset'
                                    ? 'Contoh: Laptop (kode LPT), Printer (kode PRN). Kategori aset juga bisa dibuat langsung saat menambah aset.'
                                    : 'Contoh: Alat Tulis Kantor (kode ATK), Merchandise (kode MRC).'
                            }
                            action={
                                <Button
                                    size="sm"
                                    icon={<PlusIcon className="size-4" />}
                                    onClick={() =>
                                        setEditing({ mode: 'new', type })
                                    }
                                >
                                    Tambah kategori pertama
                                </Button>
                            }
                        />
                    )
                }
            >
                <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                        <th className="py-3.5 pr-3 pl-5 font-medium">Nama</th>
                        <th className="px-3 py-3.5 font-medium">Kode</th>
                        <th className="px-3 py-3.5 font-medium">
                            Kode {type === 'aset' ? 'aset' : 'barang'} jadi
                            seperti
                        </th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            {type === 'aset' ? 'Jumlah aset' : 'Jumlah barang'}
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    {rows.map((category) => {
                        const isSub = Boolean(category.parent_id);

                        return (
                            <tr
                                key={category.id}
                                className={isSub ? 'bg-ink-50/40' : undefined}
                            >
                                <td
                                    className={cn(
                                        'py-3 pr-3',
                                        isSub ? 'pl-12' : 'pl-5',
                                    )}
                                >
                                    <span className="flex flex-col">
                                        <span
                                            className={cn(
                                                'flex items-center gap-2',
                                                isSub
                                                    ? 'text-ink-700'
                                                    : 'font-semibold text-ink-900',
                                            )}
                                        >
                                            {isSub && (
                                                <span
                                                    aria-hidden="true"
                                                    className="text-ink-300"
                                                >
                                                    └
                                                </span>
                                            )}
                                            {category.name}
                                        </span>
                                        {isSub ? (
                                            <span className="sr-only">
                                                Subkategori dari{' '}
                                                {category.parent_name}
                                            </span>
                                        ) : (
                                            category.children_count > 0 && (
                                                <span className="text-xs text-ink-500">
                                                    {category.children_count}{' '}
                                                    subkategori
                                                </span>
                                            )
                                        )}
                                    </span>
                                </td>
                                <td className="px-3 py-3">
                                    <span className="rounded-md bg-ink-100 px-2 py-1 font-mono text-xs font-semibold text-ink-900">
                                        {category.code}
                                    </span>
                                </td>
                                <td className="px-3 py-3 font-mono text-xs text-ink-500">
                                    {typeInfo[category.type].codeExample(
                                        category.code,
                                    )}
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
                                            !isSub ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={
                                                        <PlusIcon className="size-4" />
                                                    }
                                                    onClick={() =>
                                                        setEditing({
                                                            mode: 'new-sub',
                                                            parent: category,
                                                        })
                                                    }
                                                >
                                                    Subkategori
                                                </Button>
                                            ) : undefined
                                        }
                                        onEdit={() =>
                                            setEditing({
                                                mode: 'edit',
                                                category,
                                            })
                                        }
                                        onDelete={() => setDeleting(category)}
                                        canDelete={!category.is_used}
                                        deleteHint={
                                            category.children_count > 0
                                                ? 'Masih punya subkategori.'
                                                : 'Masih dipakai oleh barang atau aset.'
                                        }
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </MasterTable>

            {editing && (
                <CategoryDialog
                    editing={editing}
                    mainCategories={categories.filter(
                        (category) =>
                            category.type === 'persediaan' &&
                            !category.parent_id,
                    )}
                    onClose={() => setEditing(null)}
                />
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

/**
 * One form for every case: new category, new subcategory, or edit. Choosing a
 * main category turns it into a subcategory; choosing none makes it a main one.
 */
function CategoryDialog({
    editing,
    mainCategories,
    onClose,
}: {
    editing: Editing;
    mainCategories: Category[];
    onClose: () => void;
}) {
    const current = editing.mode === 'edit' ? editing.category : null;
    const initialType: CategoryType =
        editing.mode === 'new'
            ? editing.type
            : editing.mode === 'new-sub'
              ? editing.parent.type
              : editing.category.type;
    const initialParent =
        editing.mode === 'new-sub'
            ? String(editing.parent.id)
            : current?.parent_id
              ? String(current.parent_id)
              : '';

    const [type, setType] = useState<CategoryType>(initialType);
    const [parentId, setParentId] = useState(initialParent);
    const [code, setCode] = useState(current?.code ?? '');

    const isCodeLocked = current?.is_used ?? false;
    const canChooseParent =
        type === 'persediaan' && (current?.children_count ?? 0) === 0;
    const parentOptions = mainCategories.filter(
        (category) => category.id !== current?.id,
    );
    const title =
        editing.mode === 'edit'
            ? `Ubah ${editing.category.name}`
            : editing.mode === 'new-sub'
              ? `Tambah subkategori ${editing.parent.name}`
              : 'Tambah kategori';
    const previewCode = code.trim().toUpperCase() || 'KODE';

    return (
        <Dialog open onClose={onClose} title={title}>
            <Form
                {...(current ? update.form(current.id) : store.form())}
                options={{ preserveScroll: true }}
                onSuccess={onClose}
                className="flex flex-col gap-4"
            >
                {({ errors, processing }) => (
                    <>
                        {editing.mode === 'new-sub' ? (
                            <input type="hidden" name="type" value={type} />
                        ) : (
                            <Field
                                label="Jenis"
                                htmlFor="category-type"
                                hint={
                                    current?.is_used
                                        ? 'Terkunci karena sudah dipakai'
                                        : undefined
                                }
                                error={errors.type}
                            >
                                <Select
                                    id="category-type"
                                    name="type"
                                    value={type}
                                    onChange={(value) => {
                                        setType(value as CategoryType);
                                        setParentId('');
                                    }}
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
                        )}

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
                                autoFocus
                                placeholder={
                                    type === 'aset'
                                        ? 'Contoh: Laptop'
                                        : 'Contoh: Alat Tulis Kantor'
                                }
                                aria-invalid={Boolean(errors.name)}
                                className={inputClasses}
                            />
                        </Field>

                        <Field
                            label="Kode singkat"
                            htmlFor="category-code"
                            hint={
                                isCodeLocked
                                    ? 'Terkunci karena sudah dipakai'
                                    : '2–5 huruf'
                            }
                            error={errors.code}
                        >
                            <input
                                id="category-code"
                                name="code"
                                value={code}
                                onChange={(event) =>
                                    setCode(
                                        event.target.value
                                            .replace(/[^a-z]/gi, '')
                                            .toUpperCase(),
                                    )
                                }
                                readOnly={isCodeLocked}
                                required
                                maxLength={5}
                                placeholder={type === 'aset' ? 'LPT' : 'ATK'}
                                aria-invalid={Boolean(errors.code)}
                                aria-describedby="category-code-preview"
                                className={`${inputClasses} font-mono uppercase read-only:bg-ink-50 read-only:text-ink-500`}
                            />
                            <p
                                id="category-code-preview"
                                className="text-xs text-ink-500"
                            >
                                {type === 'aset' ? 'Aset' : 'Barang'} di
                                kategori ini akan berkode{' '}
                                <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono font-semibold text-ink-900">
                                    {typeInfo[type].codeExample(previewCode)}
                                </span>
                                ,{' '}
                                <span className="font-mono">
                                    {typeInfo[type]
                                        .codeExample(previewCode)
                                        .replace(/001$/, '002')}
                                </span>
                                , dan seterusnya.
                            </p>
                        </Field>

                        {editing.mode === 'new-sub' ? (
                            <input
                                type="hidden"
                                name="parent_id"
                                value={parentId}
                            />
                        ) : canChooseParent && parentOptions.length > 0 ? (
                            <Field
                                label="Masuk ke kategori utama"
                                htmlFor="category-parent"
                                hint="Opsional"
                                error={errors.parent_id}
                            >
                                <Select
                                    id="category-parent"
                                    name="parent_id"
                                    value={parentId}
                                    onChange={setParentId}
                                    options={[
                                        {
                                            value: '',
                                            label: 'Tidak, ini kategori utama',
                                        },
                                        ...parentOptions.map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                            description: `Jadikan subkategori ${category.name}`,
                                        })),
                                    ]}
                                />
                            </Field>
                        ) : (
                            <input type="hidden" name="parent_id" value="" />
                        )}

                        {errors.parent_id && editing.mode === 'new-sub' && (
                            <p className="text-sm text-[#c52c32]">
                                {errors.parent_id}
                            </p>
                        )}

                        <DialogFooter>
                            <Button variant="ghost" onClick={onClose}>
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
    );
}
