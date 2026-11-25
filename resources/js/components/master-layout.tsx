import { usePage } from '@inertiajs/react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import {
    DoorIcon,
    GridIcon,
    KeyIcon,
    TagIcon,
    TruckIcon,
    UsersIcon,
} from '@/components/icons';
import { PageHeader } from '@/components/ui/page-header';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { index as categoriesIndex } from '@/routes/master/categories';
import { index as divisionsIndex } from '@/routes/master/divisions';
import { index as employeesIndex } from '@/routes/master/employees';
import { index as roomsIndex } from '@/routes/master/rooms';
import { index as suppliersIndex } from '@/routes/master/suppliers';
import { index as usersIndex } from '@/routes/master/users';
import type { Auth, Permission } from '@/types';

export type MasterSectionKey =
    'employees' | 'divisions' | 'rooms' | 'suppliers' | 'categories' | 'users';

export type MasterSection = {
    key: MasterSectionKey;
    title: string;
    href: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    /** Short plain-language hint shown in the sidebar panel. */
    hint: string;
    permission: Permission | 'manage-users';
};

/**
 * Every master data list, in the order shown in the sidebar panel.
 */
export const masterSections: MasterSection[] = [
    {
        key: 'employees',
        title: 'Karyawan',
        href: employeesIndex.url(),
        icon: UsersIcon,
        hint: 'Penerima & pemegang peralatan',
        permission: 'master.employees',
    },
    {
        key: 'divisions',
        title: 'Divisi',
        href: divisionsIndex.url(),
        icon: GridIcon,
        hint: 'Bagian di perusahaan',
        permission: 'master.employees',
    },
    {
        key: 'rooms',
        title: 'Ruangan',
        href: roomsIndex.url(),
        icon: DoorIcon,
        hint: 'Lokasi penempatan peralatan',
        permission: 'master.places',
    },
    {
        key: 'suppliers',
        title: 'Supplier',
        href: suppliersIndex.url(),
        icon: TruckIcon,
        hint: 'Pemasok barang',
        permission: 'master.places',
    },
    {
        key: 'categories',
        title: 'Kategori',
        href: categoriesIndex.url(),
        icon: TagIcon,
        hint: 'Kategori & jenis barang',
        permission: 'master.categories',
    },
    {
        key: 'users',
        title: 'Pengguna',
        href: usersIndex.url(),
        icon: KeyIcon,
        hint: 'Akun login & hak akses',
        permission: 'manage-users',
    },
];

/**
 * The Master Data lists this user is allowed to open.
 */
export function allowedMasterTabs(can: Auth['can']): MasterSection[] {
    return masterSections.filter((section) => can[section.permission]);
}

type MasterLayoutProps = {
    title: string;
    description: string;
    actions?: ReactNode;
    children: ReactNode;
};

/**
 * Shared frame for the master data pages. The lists themselves are reached
 * through the "Master Data" submenu in the sidebar.
 */
export function MasterLayout({
    title,
    description,
    actions,
    children,
}: MasterLayoutProps) {
    const { url, props } = usePage();
    const visibleTabs = allowedMasterTabs(props.auth.can);
    const currentSection = visibleTabs.find((section) =>
        url.startsWith(section.href),
    );

    return (
        <AppLayout
            title={`${title} · Master Data`}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Master Data', href: visibleTabs[0]?.href },
                { title },
            ]}
        >
            <PageHeader
                title={title}
                description={description}
                actions={actions}
                eyebrow={
                    <span className="flex items-center gap-2.5">
                        {currentSection && (
                            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 text-white shadow-[0_6px_14px_-6px_rgba(22,121,201,0.6)]">
                                <currentSection.icon className="size-[18px]" />
                            </span>
                        )}
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-brand-700 uppercase">
                            Master Data
                        </span>
                    </span>
                }
            />
            {children}
        </AppLayout>
    );
}

type MasterTableProps = {
    children: ReactNode;
    minWidth?: string;
    /** Shown instead of the table when the list has no rows. */
    empty?: ReactNode;
};

export function MasterTable({
    children,
    minWidth = '640px',
    empty,
}: MasterTableProps) {
    if (empty) {
        return (
            <div className="rounded-2xl border border-ink-200/60 bg-white">
                {empty}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-ink-200/60 bg-white shadow-[0_1px_2px_rgba(23,33,31,0.04),0_12px_32px_-18px_rgba(23,82,131,0.18)]">
            <table className="w-full text-sm" style={{ minWidth }}>
                {children}
            </table>
        </div>
    );
}
