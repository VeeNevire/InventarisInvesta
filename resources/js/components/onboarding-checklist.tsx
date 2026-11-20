import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    CheckIcon,
    ChevronRightIcon,
    HelpIcon,
    XIcon,
} from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { guide } from '@/routes';
import { create as assetCreate } from '@/routes/assets';
import { create as itemCreate } from '@/routes/items';
import { index as employeesIndex } from '@/routes/master/employees';
import { create as incomingCreate } from '@/routes/transactions/incoming';
import { create as outgoingCreate } from '@/routes/transactions/outgoing';

export type OnboardingProgress = {
    has_employees: boolean;
    has_items: boolean;
    has_incoming: boolean;
    has_outgoing: boolean;
    has_assets: boolean;
};

type ChecklistStep = {
    key: keyof OnboardingProgress;
    title: string;
    body: string;
    href: string;
    actionLabel: string;
};

const DISMISS_STORAGE_KEY = 'inventaris.onboarding.dismissed';

/**
 * The first-day "start here" list. It ticks itself off from real data and
 * disappears once every step has been done at least once.
 */
export function OnboardingChecklist({
    progress,
}: {
    progress: OnboardingProgress;
}) {
    const { can } = usePage().props.auth;
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        try {
            setIsDismissed(
                window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1',
            );
        } catch {
            // Storage can be unavailable (private mode); keep showing the list.
        }
    }, []);

    const steps: ChecklistStep[] = [
        ...(can['master.employees']
            ? [
                  {
                      key: 'has_employees' as const,
                      title: 'Daftarkan karyawan',
                      body: 'Orang yang mengambil barang atau memegang aset. Divisinya boleh diisi nanti.',
                      href: employeesIndex.url(),
                      actionLabel: 'Buka data karyawan',
                  },
              ]
            : []),
        {
            key: 'has_items',
            title: 'Daftarkan barang persediaan',
            body: can['items.create']
                ? 'Barang habis pakai seperti ATK, kalender, atau merchandise. Stok awalnya diisi lewat Barang Masuk.'
                : 'Buka Barang Masuk, ketik nama barangnya, lalu pilih "Tambah barang baru".',
            href: can['items.create'] ? itemCreate.url() : incomingCreate.url(),
            actionLabel: 'Tambah barang',
        },
        {
            key: 'has_incoming',
            title: 'Catat barang masuk pertama',
            body: 'Setiap barang datang dari supplier atau pembelian, catat di sini. Stok bertambah otomatis.',
            href: incomingCreate.url(),
            actionLabel: 'Catat barang masuk',
        },
        {
            key: 'has_outgoing',
            title: 'Catat barang keluar pertama',
            body: 'Setiap ada yang mengambil barang, catat siapa penerimanya dan untuk apa. Stok berkurang otomatis.',
            href: outgoingCreate.url(),
            actionLabel: 'Catat barang keluar',
        },
        {
            key: 'has_assets',
            title: 'Daftarkan aset kantor',
            body: 'Laptop, printer, proyektor, dan barang lain yang dipakai bergantian. Dicatat per unit beserta pemegangnya.',
            href: assetCreate.url(),
            actionLabel: 'Tambah aset',
        },
    ];

    const doneCount = steps.filter((step) => progress[step.key]).length;
    const nextStep = steps.find((step) => !progress[step.key]);

    if (!nextStep || isDismissed) {
        return null;
    }

    function dismiss() {
        setIsDismissed(true);

        try {
            window.localStorage.setItem(DISMISS_STORAGE_KEY, '1');
        } catch {
            // Ignore storage failures; the list is hidden for this visit.
        }
    }

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 bg-brand-50/60 px-5 py-5">
                <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="text-base font-semibold text-ink-900">
                        Mulai di sini
                    </h2>
                    <p className="text-[13px] text-ink-500">
                        Langkah awal supaya aplikasi siap dipakai. Daftar ini
                        tercentang sendiri dan hilang setelah semuanya selesai.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ButtonLink
                        href={guide.url()}
                        variant="ghost"
                        size="sm"
                        icon={<HelpIcon className="size-4" />}
                    >
                        Panduan
                    </ButtonLink>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={dismiss}
                        icon={<XIcon className="size-4" />}
                    >
                        Sembunyikan
                    </Button>
                </div>
                <div className="flex w-full items-center gap-3">
                    <span
                        className="h-2 flex-1 overflow-hidden rounded-full bg-white"
                        role="progressbar"
                        aria-label="Kemajuan langkah awal"
                        aria-valuemin={0}
                        aria-valuemax={steps.length}
                        aria-valuenow={doneCount}
                    >
                        <span
                            className="block h-full rounded-full bg-brand-600 transition-[width]"
                            style={{
                                width: `${(doneCount / steps.length) * 100}%`,
                            }}
                        />
                    </span>
                    <span className="text-xs font-semibold text-ink-700 tabular-nums">
                        {doneCount} dari {steps.length} selesai
                    </span>
                </div>
            </div>

            <ol className="divide-y divide-ink-100">
                {steps.map((step, index) => {
                    const isDone = progress[step.key];
                    const isNext = step.key === nextStep.key;

                    return (
                        <li
                            key={step.key}
                            className={cn(
                                'flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap',
                                isNext && 'bg-white',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                    isDone
                                        ? 'bg-ok text-white'
                                        : isNext
                                          ? 'bg-brand-700 text-white'
                                          : 'bg-ink-100 text-ink-500',
                                )}
                            >
                                {isDone ? (
                                    <CheckIcon
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                ) : (
                                    index + 1
                                )}
                                <span className="sr-only">
                                    {isDone ? ' (selesai)' : ''}
                                </span>
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span
                                    className={cn(
                                        'text-sm font-semibold',
                                        isDone
                                            ? 'text-ink-400 line-through'
                                            : 'text-ink-900',
                                    )}
                                >
                                    {step.title}
                                </span>
                                {!isDone && (
                                    <span className="text-[13px] text-ink-500">
                                        {step.body}
                                    </span>
                                )}
                            </span>
                            {!isDone &&
                                (isNext ? (
                                    <ButtonLink
                                        href={step.href}
                                        size="sm"
                                        className="ml-12 sm:ml-0"
                                    >
                                        {step.actionLabel}
                                    </ButtonLink>
                                ) : (
                                    <Link
                                        href={step.href}
                                        className="ml-12 inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-brand-700 hover:text-brand-800 sm:ml-0"
                                    >
                                        {step.actionLabel}
                                        <ChevronRightIcon className="size-4" />
                                    </Link>
                                ))}
                        </li>
                    );
                })}
            </ol>
        </Card>
    );
}
