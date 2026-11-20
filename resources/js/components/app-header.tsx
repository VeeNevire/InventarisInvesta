import { Link, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { AlertIcon, BellIcon, MenuIcon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as itemShow } from '@/routes/items';
import type { BreadcrumbItem } from '@/types';

type AppHeaderProps = {
    breadcrumbs: BreadcrumbItem[];
    onOpenMenu: () => void;
};

export function AppHeader({ breadcrumbs, onOpenMenu }: AppHeaderProps) {
    return (
        <header className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenMenu}
                    className="flex size-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 lg:hidden"
                    aria-label="Buka menu"
                >
                    <MenuIcon />
                </button>
                <nav aria-label="Breadcrumb" className="min-w-0">
                    <ol className="flex items-center gap-1.5 text-[15px]">
                        {breadcrumbs.map((crumb, index) => {
                            const isLast = index === breadcrumbs.length - 1;

                            return (
                                <Fragment key={crumb.title}>
                                    {index > 0 && (
                                        <li
                                            aria-hidden="true"
                                            className="text-ink-400"
                                        >
                                            /
                                        </li>
                                    )}
                                    <li className="truncate">
                                        {crumb.href && !isLast ? (
                                            <Link
                                                href={crumb.href}
                                                className="text-ink-900 hover:text-brand-700"
                                            >
                                                {crumb.title}
                                            </Link>
                                        ) : (
                                            <span
                                                aria-current="page"
                                                className="text-ink-500"
                                            >
                                                {crumb.title}
                                            </span>
                                        )}
                                    </li>
                                </Fragment>
                            );
                        })}
                    </ol>
                </nav>
            </div>
            <NotificationBell />
        </header>
    );
}

function NotificationBell() {
    const { lowStockAlerts } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const count = lowStockAlerts.length;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointer(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-label={`Notifikasi stok rendah: ${count}`}
                data-tour="bell"
                className={cn(
                    'relative flex size-11 items-center justify-center rounded-xl border bg-white text-ink-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                    isOpen
                        ? 'border-brand-600'
                        : 'border-white shadow-sm hover:border-ink-200',
                )}
            >
                <BellIcon />
                {count > 0 && (
                    <span className="absolute top-2 right-2 size-2.5 rounded-full bg-low ring-2 ring-white" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                        <p className="text-sm font-semibold text-ink-900">
                            Stok rendah
                        </p>
                        <span className="rounded-md bg-low/10 px-2 py-0.5 text-xs font-semibold text-[#c52c32]">
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
