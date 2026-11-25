import { router, usePage } from '@inertiajs/react';
import type { ComponentType, KeyboardEvent, SVGProps } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { modules, secondary } from '@/components/app-sidebar';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    ChevronRightIcon,
    SearchIcon,
} from '@/components/icons';
import { allowedMasterTabs } from '@/components/master-layout';
import { cn } from '@/lib/utils';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';

type MenuResult = {
    title: string;
    group: string;
    href: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    keywords?: string;
};

/**
 * Navbar trigger plus a command-palette style popup for jumping to any menu.
 * Opens on click or Ctrl/⌘ + K.
 */
export function MenuSearch() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        function handleShortcut(event: globalThis.KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                setIsOpen(true);
            }
        }

        document.addEventListener('keydown', handleShortcut);

        return () => document.removeEventListener('keydown', handleShortcut);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Cari menu"
                className="hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-400 transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:flex"
            >
                <SearchIcon className="size-4" />
                <span className="flex-1 text-left">Cari menu…</span>
                <kbd className="rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-500">
                    Ctrl K
                </kbd>
            </button>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Cari menu"
                className="flex size-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700 md:hidden"
            >
                <SearchIcon className="size-[18px]" />
            </button>
            {isOpen && <MenuSearchPopup onClose={() => setIsOpen(false)} />}
        </>
    );
}

function MenuSearchPopup({ onClose }: { onClose: () => void }) {
    const { props } = usePage();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const allResults = useMemo<MenuResult[]>(() => {
        const navigation = [...modules, ...secondary].flatMap((entry) =>
            entry.href
                ? [
                      {
                          title: entry.title,
                          group: 'Menu',
                          href: entry.href,
                          icon: entry.icon,
                          keywords: [entry.hint, entry.tourId]
                              .filter(Boolean)
                              .join(' '),
                      },
                  ]
                : [],
        );

        const master = allowedMasterTabs(props.auth.can).map((section) => ({
            title: section.title,
            group: 'Master Data',
            href: section.href,
            icon: section.icon,
            keywords: 'master data',
        }));

        const actions: MenuResult[] = [
            {
                title: 'Catat barang masuk',
                group: 'Aksi cepat',
                href: incomingCreate.url(),
                icon: ArrowDownTrayIcon,
                keywords: 'transaksi masuk tambah stok',
            },
            {
                title: 'Catat barang keluar',
                group: 'Aksi cepat',
                href: outgoingCreate.url(),
                icon: ArrowUpTrayIcon,
                keywords: 'transaksi keluar ambil',
            },
        ];

        return [...actions, ...navigation, ...master];
    }, [props.auth.can]);

    const results = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!term) {
            return allResults;
        }

        return allResults.filter((result) =>
            `${result.title} ${result.group} ${result.keywords ?? ''}`
                .toLowerCase()
                .includes(term),
        );
    }, [allResults, query]);

    useEffect(() => {
        inputRef.current?.focus();

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    function open(result: MenuResult) {
        onClose();
        router.visit(result.href);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            onClose();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) =>
                Math.min(index + 1, Math.max(results.length - 1, 0)),
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter' && results[activeIndex]) {
            event.preventDefault();
            open(results[activeIndex]);
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
            <button
                type="button"
                aria-label="Tutup pencarian"
                onClick={onClose}
                className="absolute inset-0 bg-ink-900/40 backdrop-blur-[3px]"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Cari menu"
                className="relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-[0_32px_64px_-24px_rgba(23,82,131,0.45)]"
            >
                <div className="flex items-center gap-3 border-b border-ink-100 px-4">
                    <SearchIcon className="size-5 text-brand-600" />
                    <input
                        ref={inputRef}
                        type="search"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ketik nama menu, mis. peralatan, laporan…"
                        aria-label="Cari menu"
                        className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
                    />
                    <kbd className="rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-500">
                        Esc
                    </kbd>
                </div>
                <ul className="flex-1 overflow-y-auto p-2" role="listbox">
                    {results.length === 0 && (
                        <li className="px-3 py-8 text-center text-sm text-ink-500">
                            Menu “{query}” tidak ditemukan.
                        </li>
                    )}
                    {results.map((result, index) => {
                        const showGroup =
                            result.group !== results[index - 1]?.group;
                        const isActive = index === activeIndex;

                        return (
                            <li key={`${result.group}-${result.title}`}>
                                {showGroup && (
                                    <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.08em] text-ink-400 uppercase">
                                        {result.group}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => open(result)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                                        isActive
                                            ? 'bg-brand-50 text-brand-800'
                                            : 'text-ink-700',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-8 shrink-0 items-center justify-center rounded-lg',
                                            isActive
                                                ? 'bg-brand-700 text-white'
                                                : 'bg-ink-50 text-ink-500',
                                        )}
                                    >
                                        <result.icon className="size-[18px]" />
                                    </span>
                                    <span className="flex-1 font-medium">
                                        {result.title}
                                    </span>
                                    <ChevronRightIcon
                                        className={cn(
                                            'size-4',
                                            isActive
                                                ? 'text-brand-600'
                                                : 'text-ink-200',
                                        )}
                                    />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>,
        document.body,
    );
}
