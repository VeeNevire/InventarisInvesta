import { Link, usePage } from '@inertiajs/react';
import type { RefObject } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
    AlertIcon,
    BellIcon,
    CalendarIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    DashboardIcon,
    HelpIcon,
    LogoutIcon,
    MenuIcon,
    SettingsIcon,
    UserIcon,
} from '@/components/icons';
import { MenuSearch } from '@/components/menu-search';
import { formatNumber, initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard, guide, logout } from '@/routes';
import { show as itemShow } from '@/routes/items';
import { edit as settingsEdit } from '@/routes/settings';
import type { BreadcrumbItem } from '@/types';

type AppHeaderProps = {
    breadcrumbs: BreadcrumbItem[];
    onOpenMenu: () => void;
};

const todayFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export function AppHeader({ breadcrumbs, onOpenMenu }: AppHeaderProps) {
    return (
        <header className="flex items-center gap-3">
            <button
                type="button"
                onClick={onOpenMenu}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700 lg:hidden"
                aria-label="Buka menu"
            >
                <MenuIcon />
            </button>

            <Breadcrumbs breadcrumbs={breadcrumbs} />

            <div className="flex flex-1 justify-end md:justify-center">
                <MenuSearch />
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <TodayChip />
                <NotificationBell />
                <UserMenu />
            </div>
        </header>
    );
}

function Breadcrumbs({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
    const crumbs = breadcrumbs.filter((crumb) => crumb.title !== 'Beranda');
    const isHome = crumbs.length === 0;

    return (
        <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-sm">
                <li className={cn(!isHome && 'hidden sm:block')}>
                    <Link
                        href={dashboard.url()}
                        aria-current={isHome ? 'page' : undefined}
                        className={cn(
                            'flex h-8 items-center gap-2 rounded-lg px-2 transition-colors',
                            isHome
                                ? 'bg-brand-50 font-semibold text-brand-800'
                                : 'text-ink-500 hover:bg-white hover:text-brand-700',
                        )}
                    >
                        <DashboardIcon className="size-4" />
                        {isHome && 'Beranda'}
                    </Link>
                </li>
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;

                    return (
                        <Fragment key={crumb.title}>
                            <li
                                aria-hidden="true"
                                className={cn(
                                    'text-ink-200',
                                    !isLast && 'hidden sm:block',
                                    isLast && index === 0 && 'hidden sm:block',
                                )}
                            >
                                <ChevronRightIcon className="size-4" />
                            </li>
                            <li
                                className={cn(
                                    'min-w-0 truncate',
                                    !isLast && 'hidden sm:block',
                                )}
                            >
                                {isLast || !crumb.href ? (
                                    <span
                                        aria-current={
                                            isLast ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex h-8 items-center rounded-lg px-2.5',
                                            isLast
                                                ? 'bg-brand-50 font-semibold text-brand-800'
                                                : 'text-ink-500',
                                        )}
                                    >
                                        {crumb.title}
                                    </span>
                                ) : (
                                    <Link
                                        href={crumb.href}
                                        className="flex h-8 items-center rounded-lg px-2 text-ink-500 transition-colors hover:bg-white hover:text-brand-700"
                                    >
                                        {crumb.title}
                                    </Link>
                                )}
                            </li>
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}

function TodayChip() {
    const [today] = useState(() => todayFormatter.format(new Date()));

    return (
        <span className="hidden h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-700 xl:flex">
            <span className="flex size-6 items-center justify-center rounded-md bg-sun-100 text-sun-700">
                <CalendarIcon className="size-3.5" />
            </span>
            {today}
        </span>
    );
}

/**
 * Closes a popover on outside click or Escape. Returns the container ref.
 */
function useDismiss(
    isOpen: boolean,
    close: () => void,
): RefObject<HTMLDivElement | null> {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointer(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                close();
            }
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                close();
            }
        }

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, close]);

    return containerRef;
}

function UserMenu() {
    const user = usePage().props.auth.user;
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useDismiss(isOpen, () => setIsOpen(false));
    const roleLabel = user?.role === 'admin' ? 'Admin' : 'Sekretaris';
    const itemClass =
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900';

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label="Menu akun"
                data-tour="account"
                className={cn(
                    'flex h-10 items-center gap-2.5 rounded-xl border bg-white pr-2 pl-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    isOpen
                        ? 'border-brand-400 ring-4 ring-brand-100'
                        : 'border-ink-200 hover:border-brand-300',
                )}
            >
                <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-800 to-brand-600 text-xs font-bold text-white">
                    {user ? (
                        initials(user.name)
                    ) : (
                        <UserIcon className="size-4" />
                    )}
                </span>
                <span className="hidden max-w-[9rem] flex-col items-start leading-tight md:flex">
                    <span className="max-w-full truncate text-[13px] font-semibold text-ink-900">
                        {user?.name}
                    </span>
                    <span className="text-[11px] text-ink-500">
                        {roleLabel}
                    </span>
                </span>
                <ChevronDownIcon
                    className={cn(
                        'size-4 text-ink-400 transition-transform',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-1.5 shadow-[0_24px_48px_-20px_rgba(23,33,31,0.25)]"
                >
                    <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-brand-50 to-sun-100/60 p-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-600 text-sm font-bold text-white">
                            {user ? initials(user.name) : <UserIcon />}
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold text-ink-900">
                                {user?.name}
                            </span>
                            <span className="truncate text-xs text-ink-500">
                                {user?.email}
                            </span>
                            <span className="mt-1 w-fit rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                                {roleLabel}
                            </span>
                        </span>
                    </div>
                    <div className="mt-1.5 flex flex-col">
                        <Link
                            href={settingsEdit.url()}
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                            className={itemClass}
                        >
                            <SettingsIcon className="size-[18px] text-ink-500" />
                            Pengaturan akun
                        </Link>
                        <Link
                            href={guide.url()}
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                            className={itemClass}
                        >
                            <HelpIcon className="size-[18px] text-ink-500" />
                            Panduan
                        </Link>
                    </div>
                    <div className="mt-1.5 border-t border-ink-100 pt-1.5">
                        <Link
                            href={logout.url()}
                            method="post"
                            as="button"
                            role="menuitem"
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-low-ink transition-colors hover:bg-low/10"
                        >
                            <LogoutIcon className="size-[18px]" />
                            Keluar
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationBell() {
    const { lowStockAlerts } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const count = lowStockAlerts.length;

    const containerRef = useDismiss(isOpen, () => setIsOpen(false));

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-label={`Notifikasi stok rendah: ${count}`}
                data-tour="bell"
                className={cn(
                    'relative flex size-10 items-center justify-center rounded-xl border bg-white text-ink-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    isOpen
                        ? 'border-brand-400 text-brand-700 ring-4 ring-brand-100'
                        : 'border-ink-200 hover:border-brand-300 hover:text-brand-700',
                )}
            >
                <BellIcon />
                {count > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-75 motion-reduce:hidden" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-accent-500 ring-2 ring-white" />
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-[0_24px_48px_-20px_rgba(23,33,31,0.25)]">
                    <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                        <p className="text-sm font-semibold text-ink-900">
                            Stok rendah
                        </p>
                        <span className="rounded-md bg-low/10 px-2 py-0.5 text-xs font-semibold text-low-ink">
                            {count} barang
                        </span>
                    </div>
                    {count === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-ink-500">
                            Semua stok aman.
                        </p>
                    ) : (
                        <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
                            {lowStockAlerts.map((alert) => (
                                <li key={alert.code}>
                                    <Link
                                        href={itemShow.url(alert.code)}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50"
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                                alert.current_stock <= 0
                                                    ? 'bg-ink-100 text-ink-500'
                                                    : 'bg-low/10 text-low',
                                            )}
                                        >
                                            <AlertIcon className="size-4" />
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-sm font-medium text-ink-900">
                                                {alert.name}
                                            </span>
                                            <span className="text-xs text-ink-500">
                                                Sisa{' '}
                                                {formatNumber(
                                                    alert.current_stock,
                                                )}{' '}
                                                {alert.unit} · minimum{' '}
                                                {formatNumber(
                                                    alert.minimum_stock,
                                                )}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="border-t border-ink-100 bg-ink-50 px-4 py-2.5 text-xs text-ink-500">
                        Notifikasi bisa dimatikan per barang di halaman
                        detailnya.
                    </p>
                </div>
            )}
        </div>
    );
}
