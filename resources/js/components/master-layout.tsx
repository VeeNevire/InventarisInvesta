import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
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

const tabs = [
    { title: 'Karyawan', href: employeesIndex.url() },
    { title: 'Divisi', href: divisionsIndex.url() },
    { title: 'Ruangan', href: roomsIndex.url() },
    { title: 'Supplier', href: suppliersIndex.url() },
    { title: 'Kategori', href: categoriesIndex.url() },
    { title: 'Pengguna', href: usersIndex.url() },
];

type MasterLayoutProps = {
    title: string;
    description: string;
    actions?: ReactNode;
    children: ReactNode;
};

/**
 * Shared frame for the admin-only master data pages, with a tab per list.
 */
export function MasterLayout({
    title,
    description,
    actions,
    children,
}: MasterLayoutProps) {
    const { url } = usePage();

    return (
        <AppLayout
            title={`${title} · Master Data`}
            breadcrumbs={[
                { title: 'Beranda', href: dashboard.url() },
                { title: 'Master Data', href: employeesIndex.url() },
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
                {tabs.map((tab) => {
                    const isActive = url.startsWith(tab.href);

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            prefetch
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                isActive
                                    ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100'
                                    : 'text-ink-500 hover:bg-white/80 hover:text-ink-900',
                            )}
                        >
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
};

export function MasterTable({
    children,
    minWidth = '640px',
}: MasterTableProps) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-[0_1px_2px_rgba(18,24,38,0.04),0_8px_24px_-12px_rgba(18,24,38,0.08)]">
            <table className="w-full text-sm" style={{ minWidth }}>
                {children}
            </table>
        </div>
    );
}
