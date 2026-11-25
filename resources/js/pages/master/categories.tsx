import { Form } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
    ConfirmDeleteDialog,
    RowActions,
} from '@/components/confirm-delete-dialog';
import {
    BoxIcon,
    ChevronRightIcon,
    LaptopIcon,
    PlusIcon,
    TagIcon,
} from '@/components/icons';
import { MasterLayout, MasterTable } from '@/components/master-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputClasses } from '@/components/ui/field';
import { ListPagination, usePaginatedRows } from '@/components/ui/pagination';
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
    parent_code: string | null;
    children_count: number;
};

/** What the dialog is doing: a new main category, a new item type, or an edit. */
type Editing =
    | { mode: 'new'; type: CategoryType }
    | { mode: 'new-sub'; parent: Category }
    | { mode: 'edit'; category: Category };

const typeInfo: Record<
    CategoryType,
    { label: string; hint: string; module: string }
> = {
    persediaan: {
        label: 'Perlengkapan Kantor',
        hint: 'Barang habis pakai yang dihitung jumlahnya, seperti ATK atau tisu. Setiap kategori berisi jenis barang (mis. ATK → Kertas HVS).',
        module: 'PLK',
    },
    aset: {
        label: 'Peralatan Kantor',
        hint: 'Barang yang dipakai dan dicatat per unit. Setiap kategori berisi jenis barang (mis. Perangkat IT → Laptop).',
        module: 'PRL',
    },
};

const currentYear = new Date().getFullYear();

/**
 * Example code for a category row: a main category shows where its types go,
 * an item type shows the full code, e.g. INVESTA-PRL-2025-ITE-LPT-001.
 */
function codeExample(
    type: CategoryType,
    code: string,
    parentCode: string | null,
    sequence = 1,
): string {
    const typePath = parentCode ? `${parentCode}-${code}` : `${code}-JENIS`;

    return `INVESTA-${typeInfo[type].module}-${currentYear}-${typePath}-${String(sequence).padStart(3, '0')}`;
}

export default function Categories({ categories }: { categories: Category[] }) {
    const [type, setType] = useState<CategoryType>('persediaan');
    const [editing, setEditing] = useState<Editing | null>(null);
    const [deleting, setDeleting] = useState<Category | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<number[]>([]);
    const [toggledId, setToggledId] = useState<number | null>(null);

    const ofType = categories.filter((category) => category.type === type);
    const mainCategories = ofType.filter((category) => !category.parent_id);
    // Paginate whole groups so an item type always shows under its category.
    const groups = mainCategories.map((main) => [
        main,
        ...ofType.filter((category) => category.parent_id === main.id),
    ]);
    const paginated = usePaginatedRows(groups, 'master.categories', type);
    const rows = paginated.rows.flatMap(([main, ...children]) =>
        collapsedIds.includes(main.id)
            ? [
                  {
                      category: main,
                      isLastChild: false,
                      childIndex: -1,
                      childCount: children.length,
                  },
              ]
            : [main, ...children].map((category, index) => ({
                  category,
                  isLastChild: index === children.length,
                  childIndex: index - 1,
                  childCount: children.length,
              })),
    );

    function toggleGroup(id: number) {
        setToggledId(id);
        setCollapsedIds((ids) =>
            ids.includes(id)
                ? ids.filter((collapsedId) => collapsedId !== id)
                : [...ids, id],
        );
    }

    return (
        <MasterLayout
            title="Kategori"
            description="Kategori dan jenis barang untuk Perlengkapan dan Peralatan Kantor. Kode kategori dan kode jenis menjadi bagian kode barang."
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
                    label="Kelompok"
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
                    groups.length === 0 && (
                        <EmptyState
                            icon={TagIcon}
                            title={`Belum ada kategori ${typeInfo[type].label.toLowerCase()}`}
                            description={
                                type === 'aset'
                                    ? 'Contoh: Perangkat IT & Elektronik (kode ITE), Furnitur (kode FUR).'
                                    : 'Contoh: Alat Tulis Kantor (kode ATK), Promosi (kode PRM).'
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
                        <th className="px-3 py-3.5 font-medium">Kode Barang</th>
                        <th className="px-3 py-3.5 text-right font-medium">
                            {type === 'aset' ? 'Jumlah Unit' : 'Jumlah Barang'}
                        </th>
                        <th className="py-3.5 pr-5 pl-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                    <AnimatePresence initial={false} custom={toggledId}>
                        {rows.map(
                            ({
                                category,
                                isLastChild,
                                childIndex,
                                childCount,
                            }) => {
                                const isSub = Boolean(category.parent_id);
                                const hasChildren =
                                    !isSub && category.children_count > 0;
                                const isCollapsed = collapsedIds.includes(
                                    category.id,
                                );
                                const isRevealing =
                                    isSub && category.parent_id === toggledId;

                                return (
                                    <motion.tr
                                        key={category.id}
                                        initial={
                                            isRevealing
                                                ? { opacity: 0, y: -6 }
                                                : false
                                        }
                                        animate={{ opacity: 1, y: 0 }}
                                        custom={toggledId}
                                        variants={{
                                            collapse: (
                                                collapsingId: number | null,
                                            ) =>
                                                isSub &&
                                                category.parent_id ===
                                                    collapsingId
                                                    ? {
                                                          opacity: 0,
                                                          y: -8,
                                                          transition: {
                                                              duration: 0.18,
                                                              ease: 'easeIn',
                                                              delay:
                                                                  Math.min(
                                                                      childCount -
                                                                          1 -
                                                                          childIndex,
                                                                      8,
                                                                  ) * 0.03,
                                                          },
                                                      }
                                                    : {
                                                          opacity: 0,
                                                          transition: {
                                                              duration: 0,
                                                          },
                                                      },
                                        }}
                                        exit="collapse"
                                        transition={{
                                            duration: 0.22,
                                            ease: 'easeOut',
                                            delay: isRevealing
                                                ? Math.min(childIndex, 8) *
                                                  0.035
                                                : 0,
                                        }}
                                        onClick={(event) => {
                                            if (
                                                hasChildren &&
                                                !(
                                                    event.target as HTMLElement
                                                ).closest('button, a')
                                            ) {
                                                toggleGroup(category.id);
                                            }
                                        }}
                                        className={cn(
                                            isSub && 'bg-brand-50/40',
                                            hasChildren &&
                                                'cursor-pointer hover:bg-brand-50/60',
                                        )}
                                    >
                                        {isSub ? (
                                            <td className="relative py-3 pr-3 pl-14">
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'absolute -top-px left-[31px] w-0.5 bg-brand-300',
                                                        isLastChild
                                                            ? 'h-[calc(50%+1px)] rounded-b-full'
                                                            : '-bottom-px',
                                                    )}
                                                />
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute top-1/2 left-[31px] h-0.5 w-5 -translate-y-1/2 rounded-r-full bg-brand-300"
                                                />
                                                <span className="text-ink-700">
                                                    {category.name}
                                                </span>
                                                <span className="sr-only">
                                                    {' '}
                                                    (jenis barang dari{' '}
                                                    {category.parent_name})
                                                </span>
                                            </td>
                                        ) : (
                                            <td className="relative py-3 pr-3 pl-5">
                                                {hasChildren &&
                                                    !isCollapsed && (
                                                        <span
                                                            aria-hidden="true"
                                                            className="absolute top-[calc(50%+12px)] -bottom-px left-[31px] w-0.5 bg-brand-300"
                                                        />
                                                    )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleGroup(category.id)
                                                    }
                                                    disabled={!hasChildren}
                                                    aria-expanded={
                                                        hasChildren
                                                            ? !isCollapsed
                                                            : undefined
                                                    }
                                                    className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-default"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={cn(
                                                            'flex size-6 shrink-0 items-center justify-center rounded-md',
                                                            hasChildren
                                                                ? 'bg-brand-100 text-brand-700'
                                                                : 'bg-ink-100 text-ink-300',
                                                        )}
                                                    >
                                                        <ChevronRightIcon
                                                            className={cn(
                                                                'size-4 transition-transform motion-reduce:transition-none',
                                                                hasChildren &&
                                                                    !isCollapsed &&
                                                                    'rotate-90',
                                                            )}
                                                        />
                                                    </span>
                                                    <span className="flex flex-col">
                                                        <span className="font-semibold text-ink-900">
                                                            {category.name}
                                                        </span>
                                                        <span className="text-xs text-ink-500">
                                                            {hasChildren
                                                                ? `${category.children_count} jenis barang${isCollapsed ? ' · disembunyikan' : ''}`
                                                                : 'Belum ada jenis barang'}
                                                        </span>
                                                    </span>
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-3 py-3">
                                            <span className="rounded-md bg-ink-100 px-2 py-1 font-mono text-xs font-semibold text-ink-900">
                                                {category.code}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs text-ink-500">
                                            {codeExample(
                                                category.type,
                                                category.code,
                                                category.parent_code,
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
                                                            Jenis barang
                                                        </Button>
                                                    ) : undefined
                                                }
                                                onEdit={() =>
                                                    setEditing({
                                                        mode: 'edit',
                                                        category,
                                                    })
                                                }
                                                onDelete={() =>
                                                    setDeleting(category)
                                                }
                                                canDelete={!category.is_used}
                                                deleteHint={
                                                    category.children_count > 0
                                                        ? 'Masih punya jenis barang.'
                                                        : 'Masih dipakai oleh perlengkapan atau peralatan.'
                                                }
                                            />
                                        </td>
                                    </motion.tr>
                                );
                            },
                        )}
                    </AnimatePresence>
                </tbody>
            </MasterTable>
            <ListPagination paginated={paginated} noun="kategori" />

            {editing && (
                <CategoryDialog
                    editing={editing}
                    mainCategories={categories.filter(
                        (category) => !category.parent_id,
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
 * One form for every case: new category, new item type, or edit. Choosing a
 * main category turns it into an item type; choosing none makes it a main one.
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
    const canChooseParent = !isCodeLocked;
    const parentOptions = mainCategories.filter(
        (category) => category.type === type && category.id !== current?.id,
    );
    const parentCode =
        parentOptions.find((category) => String(category.id) === parentId)
            ?.code ?? null;
    const title =
        editing.mode === 'edit'
            ? `Ubah ${editing.category.name}`
            : editing.mode === 'new-sub'
              ? `Tambah jenis barang ${editing.parent.name}`
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
                                label="Kelompok"
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
                                            label: 'Perlengkapan Kantor',
                                            description:
                                                'Habis pakai, dihitung jumlahnya',
                                        },
                                        {
                                            value: 'aset',
                                            label: 'Peralatan Kantor',
                                            description:
                                                'Dipakai, dicatat per unit',
                                        },
                                    ]}
                                />
                            </Field>
                        )}

                        <Field
                            label={
                                parentId ? 'Nama jenis barang' : 'Nama kategori'
                            }
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
                                    parentId
                                        ? type === 'aset'
                                            ? 'Contoh: Laptop'
                                            : 'Contoh: Kertas HVS'
                                        : type === 'aset'
                                          ? 'Contoh: Perangkat IT & Elektronik'
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
                                placeholder={
                                    parentId
                                        ? type === 'aset'
                                            ? 'LPT'
                                            : 'HVS'
                                        : type === 'aset'
                                          ? 'ITE'
                                          : 'ATK'
                                }
                                aria-invalid={Boolean(errors.code)}
                                aria-describedby="category-code-preview"
                                className={`${inputClasses} font-mono uppercase read-only:bg-ink-50 read-only:text-ink-500`}
                            />
                            <p
                                id="category-code-preview"
                                className="text-xs text-ink-500"
                            >
                                Barang {parentId ? 'jenis' : 'kategori'} ini
                                akan berkode{' '}
                                <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono font-semibold text-ink-900">
                                    {codeExample(type, previewCode, parentCode)}
                                </span>
                                ,{' '}
                                <span className="font-mono">
                                    {codeExample(
                                        type,
                                        previewCode,
                                        parentCode,
                                        2,
                                    )}
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
                                label="Masuk ke kategori"
                                htmlFor="category-parent"
                                hint="Pilih kategori bila ini jenis barang"
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
                                            label: 'Tidak, ini kategori',
                                        },
                                        ...parentOptions.map((category) => ({
                                            value: String(category.id),
                                            label: category.name,
                                            description: `Jadikan jenis barang ${category.name}`,
                                        })),
                                    ]}
                                />
                            </Field>
                        ) : (
                            <input
                                type="hidden"
                                name="parent_id"
                                value={current?.parent_id ?? ''}
                            />
                        )}

                        {errors.parent_id && editing.mode === 'new-sub' && (
                            <p className="text-sm text-low-ink">
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
