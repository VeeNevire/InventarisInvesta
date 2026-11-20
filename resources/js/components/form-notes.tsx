import { useEffect, useState } from 'react';
import {
    AlertIcon,
    ChevronDownIcon,
    PackageCheckIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';

type FormNotesProps = {
    /** Used to remember, per form, whether the notes were collapsed. */
    id: string;
    dos: string[];
    donts?: string[];
    title?: string;
};

const STORAGE_PREFIX = 'inventaris.form-notes.';

/**
 * Reminders shown at the top of a form: what to remember ("Jangan lupa")
 * and what to avoid ("Jangan sampai"). Can be folded away; the choice is
 * remembered per form in this browser.
 */
export function FormNotes({
    id,
    dos,
    donts = [],
    title = 'Perhatikan sebelum menyimpan',
}: FormNotesProps) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(STORAGE_PREFIX + id) === 'closed') {
                setIsOpen(false);
            }
        } catch {
            // Storage may be unavailable; keep the notes open.
        }
    }, [id]);

    function toggle() {
        const next = !isOpen;
        setIsOpen(next);

        try {
            window.localStorage.setItem(
                STORAGE_PREFIX + id,
                next ? 'open' : 'closed',
            );
        } catch {
            // Ignore storage failures.
        }
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50/70 to-white">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
            >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-brand-800">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-brand-700 text-white">
                        <AlertIcon className="size-4" />
                    </span>
                    {title}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
                    {isOpen ? 'Sembunyikan' : 'Tampilkan'}
                    <ChevronDownIcon
                        className={cn(
                            'size-4 transition-transform',
                            isOpen && 'rotate-180',
                        )}
                    />
                </span>
            </button>
            {isOpen && (
                <div className="grid grid-cols-1 gap-4 border-t border-brand-100 px-5 py-4 md:grid-cols-2">
                    <NoteList tone="do" title="Jangan lupa" items={dos} />
                    {donts.length > 0 && (
                        <NoteList
                            tone="dont"
                            title="Jangan sampai"
                            items={donts}
                        />
                    )}
                </div>
            )}
        </section>
    );
}

/**
 * Short reminders inside a dialog, without the fold button.
 */
export function DialogNotes({
    dos,
    donts = [],
}: {
    dos: string[];
    donts?: string[];
}) {
    return (
        <div className="flex flex-col gap-2 rounded-xl bg-brand-50/70 px-4 py-3">
            {dos.map((item) => (
                <p key={item} className="flex gap-2 text-[13px] text-ink-700">
                    <PackageCheckIcon className="mt-0.5 size-4 shrink-0 text-ok" />
                    {item}
                </p>
            ))}
            {donts.map((item) => (
                <p key={item} className="flex gap-2 text-[13px] text-ink-700">
                    <AlertIcon className="mt-0.5 size-4 shrink-0 text-service" />
                    <span>
                        <strong className="font-semibold">Jangan sampai</strong>{' '}
                        {item.charAt(0).toLowerCase() + item.slice(1)}
                    </span>
                </p>
            ))}
        </div>
    );
}

function NoteList({
    tone,
    title,
    items,
}: {
    tone: 'do' | 'dont';
    title: string;
    items: string[];
}) {
    const Icon = tone === 'do' ? PackageCheckIcon : AlertIcon;

    return (
        <div className="flex flex-col gap-2">
            <span
                className={cn(
                    'text-xs font-semibold tracking-wide uppercase',
                    tone === 'do' ? 'text-ok' : 'text-[#b45309]',
                )}
            >
                {title}
            </span>
            <ul className="flex flex-col gap-2">
                {items.map((item) => (
                    <li
                        key={item}
                        className="flex gap-2.5 text-sm leading-relaxed text-ink-700"
                    >
                        <Icon
                            className={cn(
                                'mt-0.5 size-4 shrink-0',
                                tone === 'do' ? 'text-ok' : 'text-service',
                            )}
                        />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
