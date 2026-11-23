import { Link, router, usePage } from '@inertiajs/react';
import type { ComponentType, FormEvent, SVGProps } from 'react';
import { useState } from 'react';
import {
    ArrowsIcon,
    BoxIcon,
    ChartIcon,
    ClipboardIcon,
    DashboardIcon,
    DatabaseIcon,
    HelpIcon,
    LaptopIcon,
    LogoutIcon,
    SearchIcon,
    SettingsIcon,
    UserIcon,
} from '@/components/icons';
import { allowedMasterTabs } from '@/components/master-layout';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard, guide, logout } from '@/routes';
import { index as assetsIndex } from '@/routes/assets';
import { index as itemsIndex } from '@/routes/items';
import { index as reportsIndex } from '@/routes/reports';
import { edit as settingsEdit } from '@/routes/settings';
import { index as stockOpnamesIndex } from '@/routes/stock-opnames';
import { index as transactionsIndex } from '@/routes/transactions';

type NavEntry = {
    title: string;
    href: string | null;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    match?: (url: string) => boolean;
    /** Short plain-language hint shown under the title. */
    hint?: string;
};

const modules: NavEntry[] = [
    {
        title: 'Beranda',
        href: dashboard.url(),
        icon: DashboardIcon,
        match: (url) => url === '/' || url.startsWith('/?'),
    },
    {
        title: 'Barang',
        href: itemsIndex.url(),
        icon: BoxIcon,
        match: (url) => url.startsWith('/barang'),
        hint: 'Habis pakai',
    },
    {
        title: 'Aset',
        href: assetsIndex.url(),
        icon: LaptopIcon,
        match: (url) => url.startsWith('/aset'),
        hint: 'Laptop, printer, dll.',
    },
    {
        title: 'Transaksi',
        href: transactionsIndex.url(),
        icon: ArrowsIcon,
        match: (url) => url.startsWith('/transaksi'),
    },
    {
        title: 'Cek Stok',
        href: stockOpnamesIndex.url(),
        icon: ClipboardIcon,
        match: (url) => url.startsWith('/cek-stok'),
    },
    {
        title: 'Laporan',
        href: reportsIndex.url(),
        icon: ChartIcon,
        match: (url) => url.startsWith('/laporan'),
    },
];

const secondary: NavEntry[] = [
    {
        title: 'Panduan',
        href: guide.url(),
        icon: HelpIcon,
        match: (url) => url.startsWith('/panduan'),
    },
    {
        title: 'Pengaturan',
        href: settingsEdit.url(),
        icon: SettingsIcon,
        match: (url) => url.startsWith('/pengaturan'),
    },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
    const { url, props } = usePage();
    const [search, setSearch] = useState('');
    const user = props.auth.user;
    const masterDataHref = allowedMasterTabs(props.auth.can)[0]?.href ?? null;

    function submitSearch(event: FormEvent) {
        event.preventDefault();

        if (!search.trim()) {
            return;
        }

        router.get(itemsIndex.url(), { search: search.trim() });
        onNavigate?.();
    }

    return (
        <div className="flex h-full flex-col gap-6 px-4 py-6">
            <Link
                href={dashboard.url()}
                className="flex items-center gap-2.5 px-1"
                onClick={onNavigate}
            >
                <img
                    src="/logo-mark.png"
                    alt="Logo Inventaris Investa"
                    className="size-9 rounded-xl object-contain shadow-[0_6px_14px_-6px_rgba(42,56,176,0.6)]"
                />
                <span className="text-[19px] font-bold tracking-[-0.02em] text-ink-900">
                    Inventaris
                    <span className="text-brand-700">Investa</span>
                </span>
            </Link>

            <form
                onSubmit={submitSearch}
                role="search"
                className="flex h-11 items-center gap-2.5 border-b border-ink-200 px-2 text-ink-500 focus-within:border-brand-600"
            >
                <SearchIcon className="size-[18px]" />
                <label htmlFor="sidebar-search" className="sr-only">
                    Cari barang
                </label>
                <input
                    id="sidebar-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari barang…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
            </form>

            <nav aria-label="Modul utama" className="grid grid-cols-2 gap-2.5">
                {modules.map((entry) => {
                    const isActive = entry.match?.(url) ?? false;
                    const content = (
                        <>
                            <entry.icon
                                className={cn(
                                    'size-6',
                                    isActive
                                        ? 'text-brand-700'
                                        : 'text-ink-700',
                                )}
                                strokeWidth={1.6}
                            />
                            <span className="flex flex-col items-center gap-0.5">
                                <span
                                    className={cn(
                                        'text-sm leading-tight',
                                        isActive
                                            ? 'font-semibold text-brand-700'
                                            : 'text-ink-700',
                                    )}
                                >
                                    {entry.title}
                                </span>
                                {entry.hint && (
                                    <span className="text-[11px] leading-tight text-ink-500">
                                        {entry.hint}
                                    </span>
                                )}
                            </span>
                        </>
                    );

                    const base =
                        'flex h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border transition-colors';

                    if (!entry.href) {
                        return (
                            <span
                                key={entry.title}
                                aria-disabled="true"
                                title="Segera hadir"
                                className={cn(
                                    base,
                                    'relative cursor-not-allowed border-transparent bg-white/40 opacity-60',
                                )}
                            >
                                {content}
                                <span className="absolute top-2 right-2 rounded bg-ink-100 px-1.5 text-[10px] font-semibold text-ink-500">
                                    Segera
                                </span>
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={entry.title}
                            href={entry.href}
                            data-tour={`nav-${entry.title.toLowerCase().replace(/ /g, '-')}`}
                            onClick={onNavigate}
                            aria-current={isActive ? 'page' : undefined}
                            prefetch
                            className={cn(
                                base,
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                                isActive
                                    ? 'border-brand-700 bg-white shadow-[0_8px_20px_-12px_rgba(42,56,176,0.55)]'
                                    : 'border-transparent bg-white/60 hover:bg-white',
                            )}
                        >
                            {content}
                        </Link>
                    );
                })}
            </nav>

            <div className="h-px bg-ink-200" />

            <ul className="flex flex-col gap-2">
                {masterDataHref && (
                    <li>
                        <Link
                            href={masterDataHref}
                            data-tour="nav-master"
                            onClick={onNavigate}
                            aria-current={
                                url.startsWith('/master') ? 'page' : undefined
                            }
                            className="group flex items-center gap-3"
                        >
                            <span
                                className={cn(
                                    'flex size-10 items-center justify-center rounded-xl',
                                    url.startsWith('/master')
                                        ? 'bg-brand-700 text-white'
                                        : 'bg-white/60 text-ink-700 group-hover:bg-white',
                                )}
                            >
                                <DatabaseIcon className="size-[18px]" />
                            </span>
                            <span
                                className={cn(
                                    'flex h-10 flex-1 items-center rounded-xl px-3.5 text-sm',
                                    url.startsWith('/master')
                                        ? 'bg-white font-semibold text-brand-700 ring-1 ring-brand-700'
                                        : 'bg-white/60 text-ink-700 group-hover:bg-white',
                                )}
                            >
                                Master Data
                            </span>
                        </Link>
                    </li>
                )}
                {secondary.map((entry) => {
                    if (entry.href) {
                        const isActive = entry.match?.(url) ?? false;

                        return (
                            <li key={entry.title}>
                                <Link
                                    href={entry.href}
                                    data-tour={`nav-${entry.title.toLowerCase().replace(/ /g, '-')}`}
                                    onClick={onNavigate}
                                    aria-current={isActive ? 'page' : undefined}
                                    className="group flex items-center gap-3"
                                >
                                    <span
                                        className={cn(
                                            'flex size-10 items-center justify-center rounded-xl',
                                            isActive
                                                ? 'bg-brand-700 text-white'
                                                : 'bg-white/60 text-ink-700 group-hover:bg-white',
                                        )}
                                    >
                                        <entry.icon className="size-[18px]" />
                                    </span>
                                    <span
                                        className={cn(
                                            'flex h-10 flex-1 items-center rounded-xl px-3.5 text-sm',
                                            isActive
                                                ? 'bg-white font-semibold text-brand-700 ring-1 ring-brand-700'
                                                : 'bg-white/60 text-ink-700 group-hover:bg-white',
                                        )}
                                    >
                                        {entry.title}
                                    </span>
                                </Link>
                            </li>
                        );
                    }

                    return (
                        <li key={entry.title}>
                            <span
                                aria-disabled="true"
                                title="Segera hadir"
                                className="flex cursor-not-allowed items-center gap-3 opacity-60"
                            >
                                <span className="flex size-10 items-center justify-center rounded-xl bg-white/60 text-ink-700">
                                    <entry.icon className="size-[18px]" />
                                </span>
                                <span className="flex h-10 flex-1 items-center justify-between rounded-xl bg-white/60 px-3.5 text-sm text-ink-700">
                                    {entry.title}
                                    <span className="text-[10px] font-semibold text-ink-400">
                                        Segera
                                    </span>
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-auto border-t border-ink-200 pt-4">
                <div
                    data-tour="account"
                    className="flex items-center gap-3 rounded-2xl bg-white/70 p-2.5"
                >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-800">
                        {user ? initials(user.name) : <UserIcon />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold text-ink-900">
                            {user?.name}
                        </span>
                        <span className="truncate text-xs text-ink-500">
                            {user?.role === 'admin' ? 'Admin' : 'Sekretaris'}
                        </span>
                    </div>
                    <Link
                        href={logout.url()}
                        method="post"
                        as="button"
                        aria-label="Keluar dari akun"
                        title="Keluar"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-low/10 hover:text-low"
                    >
                        <LogoutIcon className="size-[18px]" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
