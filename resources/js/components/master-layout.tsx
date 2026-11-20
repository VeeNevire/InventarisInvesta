import { Link, usePage } from '@inertiajs/react';
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
import { cn } from '@/lib/utils';
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
    permission: Permission | 'manage-users';
};

/**
 * Every master data list, in the order shown on the tabs.
 */
export const masterSections: MasterSection[] = [
    {
        key: 'employees',
        title: 'Karyawan',
        href: employeesIndex.url(),
        icon: UsersIcon,
        permission: 'master.employees',
    },
    {
        key: 'divisions',
        title: 'Divisi',
        href: divisionsIndex.url(),
        icon: GridIcon,
        permission: 'master.employees',
    },
    {
        key: 'rooms',
        title: 'Ruangan',
        href: roomsIndex.url(),
        icon: DoorIcon,
        permission: 'master.places',
    },
    {
        key: 'suppliers',
        title: 'Supplier',
        href: suppliersIndex.url(),
        icon: TruckIcon,
        permission: 'master.places',
    },
    {
        key: 'categories',
        title: 'Kategori',
        href: categoriesIndex.url(),
        icon: TagIcon,
        permission: 'master.categories',
    },
    {
        key: 'users',
        title: 'Pengguna',
        href: usersIndex.url(),
        icon: KeyIcon,
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
 * Shared frame for the master data pages, with a tab per list the user may open.
 */
export function MasterLayout({
    title,
    description,
    actions,
    children,
}: MasterLayoutProps) {
    const { url, props } = usePage();
    const visibleTabs = allowedMasterTabs(props.auth.can);

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
            />
            <nav
                aria-label="Master data"
                className="-mt-2 flex gap-1 overflow-x-auto rounded-2xl bg-white/70 p-1.5"
            >
                {visibleTabs.map((tab) => {
                    const isActive = url.startsWith(tab.href);

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            prefetch
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                isActive
                                    ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100'
                                    : 'text-ink-500 hover:bg-white/80 hover:text-ink-900',
                            )}
                        >
                            <tab.icon className="size-4" />
                            {tab.title}
                        </Link>
                    );
                })}
            </nav>
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
        return <div className="rounded-2xl bg-white">{empty}</div>;
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
            <table className="w-full text-sm" style={{ minWidth }}>
                {children}
            </table>
        </div>
    );
}
