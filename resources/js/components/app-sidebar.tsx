import { Link, router, usePage } from '@inertiajs/react';
import type { ComponentType, FormEvent, SVGProps } from 'react';
import { useState } from 'react';
import {
    ArrowLeftIcon,
    ArrowsIcon,
    BoxIcon,
    ChartIcon,
    ClipboardIcon,
    DashboardIcon,
    DatabaseIcon,
    HelpIcon,
    LaptopIcon,
    ChevronRightIcon,
    SearchIcon,
    SettingsIcon,
} from '@/components/icons';
import type { MasterSection } from '@/components/master-layout';
import { allowedMasterTabs } from '@/components/master-layout';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { dashboard, guide } from '@/routes';
import { index as assetsIndex } from '@/routes/assets';
import { index as itemsIndex } from '@/routes/items';
import { index as reportsIndex } from '@/routes/reports';
import { edit as settingsEdit } from '@/routes/settings';
import { index as stockOpnamesIndex } from '@/routes/stock-opnames';
import { index as transactionsIndex } from '@/routes/transactions';

export type NavEntry = {
    title: string;
    href: string | null;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    match?: (url: string) => boolean;
    /** Short plain-language hint shown under the title. */
    hint?: string;
    /** Stable guided-tour target, so renaming the title does not break the tour. */
    tourId?: string;
};

export const modules: NavEntry[] = [
    {
        title: 'Beranda',
        href: dashboard.url(),
        icon: DashboardIcon,
        match: (url) => url === '/' || url.startsWith('/?'),
    },
    {
        title: 'Perlengkapan Kantor',
        href: itemsIndex.url(),
        icon: BoxIcon,
        match: (url) => url.startsWith('/barang'),
        hint: 'Habis pakai: ATK, tisu, dll.',
        tourId: 'barang',
    },
    {
        title: 'Peralatan Kantor',
        href: assetsIndex.url(),
        icon: LaptopIcon,
        match: (url) => url.startsWith('/aset'),
        hint: 'Laptop, printer, meja, dll.',
        tourId: 'aset',
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

export const secondary: NavEntry[] = [
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
    const masterSections = allowedMasterTabs(props.auth.can);
    const isWithinMaster = url.startsWith('/master');
    const [panel, setPanel] = useState<'main' | 'master'>(
        isWithinMaster && masterSections.length > 0 ? 'master' : 'main',
    );
    const lowStockCount = props.lowStockAlerts.length;

    function submitSearch(event: FormEvent) {
        event.preventDefault();

        if (!search.trim()) {
            return;
        }

        router.get(itemsIndex.url(), { search: search.trim() });
        onNavigate?.();
    }

    return (
        <div className="flex h-full flex-col gap-6 px-4 py-5">
            <Link
                href={dashboard.url()}
                className="flex items-center gap-2.5 px-2"
                onClick={onNavigate}
            >
                <img
                    src="/logo-mark.svg?v=7"
                    alt="Logo Inventaris Investa"
                    className="size-9 rounded-[9px] shadow-[0_6px_14px_-6px_rgba(22,121,201,0.6)]"
                />
                <span className="text-[15px] font-bold tracking-[0.04em] text-ink-900 uppercase">
                    Inventaris{' '}
                    <span className="bg-gradient-to-r from-brand-800 to-brand-600 bg-clip-text text-transparent">
                        Investa
                    </span>
                </span>
            </Link>

            <div className="relative -mx-4 min-h-0 flex-1 overflow-hidden">
                <div
                    className={cn(
                        'flex h-full w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
                        panel === 'master' && '-translate-x-1/2',
                    )}
                >
                    <div
                        className="flex min-h-0 w-1/2 flex-col gap-6 overflow-y-auto px-4"
                        inert={panel !== 'main'}
                    >
                        <form
                            onSubmit={submitSearch}
                            role="search"
                            className="flex h-10 items-center gap-2.5 rounded-xl border border-ink-200/80 bg-ink-50 px-3 text-ink-400 transition-colors focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100"
                        >
                            <SearchIcon className="size-4" />
                            <label htmlFor="sidebar-search" className="sr-only">
                                Cari barang
                            </label>
                            <input
                                id="sidebar-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari barang…"
                                className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                            />
                        </form>

                        <nav
                            aria-label="Modul utama"
                            className="flex flex-col gap-1"
                        >
                            <SectionLabel>Menu</SectionLabel>
                            {modules.map((entry) => (
                                <SidebarLink
                                    key={entry.title}
                                    entry={entry}
                                    isActive={entry.match?.(url) ?? false}
                                    onNavigate={onNavigate}
                                    count={
                                        entry.title === 'Perlengkapan Kantor' &&
                                        lowStockCount > 0
                                            ? lowStockCount
                                            : undefined
                                    }
                                />
                            ))}
                        </nav>

                        <nav
                            aria-label="Lainnya"
                            className="flex flex-col gap-1"
                        >
                            <SectionLabel>Lainnya</SectionLabel>
                            {masterSections.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setPanel('master')}
                                    data-tour="nav-master"
                                    className={cn(
                                        'group flex h-10 items-center gap-3 rounded-xl px-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                                        isWithinMaster
                                            ? 'bg-brand-50 font-semibold text-brand-800'
                                            : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
                                    )}
                                >
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-500 group-hover:text-brand-700">
                                        <DatabaseIcon
                                            className="size-[18px]"
                                            strokeWidth={1.7}
                                        />
                                    </span>
                                    <span className="flex-1 truncate">
                                        Master Data
                                    </span>
                                    <ChevronRightIcon className="size-4 text-ink-400 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            )}
                            {secondary.map((entry) => (
                                <SidebarLink
                                    key={entry.title}
                                    entry={entry}
                                    isActive={entry.match?.(url) ?? false}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </nav>
                    </div>

                    <div
                        className="flex min-h-0 w-1/2 flex-col gap-5 px-4"
                        inert={panel !== 'master'}
                    >
                        <MasterDataPanel
                            sections={masterSections}
                            url={url}
                            onBack={() => setPanel('main')}
                            onNavigate={onNavigate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

type MasterDataPanelProps = {
    sections: MasterSection[];
    url: string;
    onBack: () => void;
    onNavigate?: () => void;
};

/**
 * Sidebar panel that replaces the main menu while working in Master Data.
 */
function MasterDataPanel({
    sections,
    url,
    onBack,
    onNavigate,
}: MasterDataPanelProps) {
    return (
        <>
            <button
                type="button"
                onClick={onBack}
                className="group flex h-10 shrink-0 items-center gap-2 rounded-xl border border-ink-200/80 bg-ink-50 px-3 text-sm font-medium text-ink-600 transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
                <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
                Kembali ke menu utama
            </button>

            <div className="relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-4 text-white">
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full border-[14px] border-white/10"
                />
                <span className="relative flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <DatabaseIcon className="size-5" />
                </span>
                <p className="relative mt-3 text-[15px] font-semibold">
                    Master Data
                </p>
                <p className="relative text-xs text-white/80">
                    Data dasar yang dipakai di seluruh aplikasi.
                </p>
            </div>

            <nav aria-label="Master Data" className="flex min-h-0 flex-1 flex-col">
                <SectionLabel>Daftar</SectionLabel>
                <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4">
                    {sections.map((section) => {
                        const isActive = url.startsWith(section.href);

                        return (
                            <Link
                                key={section.key}
                                href={section.href}
                                onClick={onNavigate}
                                prefetch
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'group relative flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                                    isActive ? 'bg-brand-50' : 'hover:bg-ink-50',
                                )}
                            >
                                {isActive && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-2 bottom-2 -left-4 w-1 rounded-r-full bg-brand-500"
                                    />
                                )}
                                <span
                                    className={cn(
                                        'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-brand-500 text-white shadow-[0_4px_10px_-4px_rgba(22,121,201,0.7)]'
                                            : 'bg-ink-50 text-ink-500 group-hover:bg-white group-hover:text-brand-700',
                                    )}
                                >
                                    <section.icon className="size-[18px]" />
                                </span>
                                <span className="flex min-w-0 flex-col">
                                    <span
                                        className={cn(
                                            'truncate text-sm',
                                            isActive
                                                ? 'font-semibold text-brand-800'
                                                : 'text-ink-700',
                                        )}
                                    >
                                        {section.title}
                                    </span>
                                    <span className="truncate text-[11px] text-ink-400">
                                        {section.hint}
                                    </span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}

function SectionLabel({ children }: { children: string }) {
    return (
        <span className="px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-ink-400 uppercase">
            {children}
        </span>
    );
}

type SidebarLinkProps = {
    entry: NavEntry;
    isActive: boolean;
    onNavigate?: () => void;
    count?: number;
};

function SidebarLink({ entry, isActive, onNavigate, count }: SidebarLinkProps) {
    const Icon = entry.icon;
    const base =
        'group relative flex min-h-10 items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm transition-colors';
    const iconBox = (
        <span
            className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                isActive
                    ? 'bg-brand-500 text-white shadow-[0_4px_10px_-4px_rgba(22,121,201,0.7)]'
                    : 'text-ink-500 group-hover:text-brand-700',
            )}
        >
            <Icon className="size-[18px]" strokeWidth={isActive ? 2 : 1.7} />
        </span>
    );

    if (!entry.href) {
        return (
            <span
                aria-disabled="true"
                title="Segera hadir"
                className={cn(
                    base,
                    'cursor-not-allowed text-ink-500 opacity-60',
                )}
            >
                {iconBox}
                <span className="flex-1 truncate">{entry.title}</span>
                <span className="rounded bg-ink-100 px-1.5 text-[10px] font-semibold text-ink-500">
                    Segera
                </span>
            </span>
        );
    }

    return (
        <Link
            href={entry.href}
            data-tour={`nav-${entry.tourId ?? entry.title.toLowerCase().replace(/ /g, '-')}`}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            title={entry.hint}
            prefetch
            className={cn(
                base,
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                isActive
                    ? 'bg-brand-50 font-semibold text-brand-800'
                    : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
            )}
        >
            {isActive && (
                <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 -left-4 w-1 rounded-r-full bg-brand-500"
                />
            )}
            {iconBox}
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="leading-5 text-pretty">{entry.title}</span>
                {entry.hint && (
                    <span className="text-[11px] leading-4 font-normal text-pretty text-ink-400">
                        {entry.hint}
                    </span>
                )}
            </span>
            {count !== undefined && (
                <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white tabular-nums"
                    aria-label={`${count} barang stok rendah`}
                >
                    {formatNumber(count)}
                </span>
            )}
        </Link>
    );
}
