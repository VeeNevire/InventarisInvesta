import { router, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpIcon, XIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { preference as guidePreference } from '@/routes/guide';

const START_EVENT = 'inventaris:start-tour';

/**
 * Start the guided tour from anywhere, e.g. a button on the guide page.
 */
export function startGuidedTour(): void {
    window.dispatchEvent(new CustomEvent(START_EVENT));
}

type TourStep = {
    /** Value of the `data-tour` attribute to point at; none = centred bubble. */
    target?: string;
    title: string;
    body: string;
    adminOnly?: boolean;
};

const steps: TourStep[] = [
    {
        title: 'Selamat datang di InventarisInvesta',
        body: 'Tur singkat ini menunjukkan menu-menu utama dan kegunaannya. Gunakan tombol Lanjut, atau tombol panah di keyboard.',
    },
    {
        target: 'nav-beranda',
        title: 'Beranda',
        body: 'Ringkasan gudang hari ini: stok kritis, transaksi terakhir, aset yang perlu perhatian, dan barang yang lama tidak keluar.',
    },
    {
        target: 'nav-barang',
        title: 'Barang',
        body: 'Daftar barang habis pakai beserta sisa stoknya. Klik nama barang untuk melihat kartu stok, yaitu riwayat masuk dan keluarnya.',
    },
    {
        target: 'nav-transaksi',
        title: 'Transaksi',
        body: 'Catat Barang Masuk saat barang datang dan Barang Keluar saat ada yang mengambil. Semua riwayatnya juga ada di sini. Jangan lupa mencatat setiap kali barang diambil.',
    },
    {
        target: 'nav-aset',
        title: 'Aset',
        body: 'Laptop, printer, proyektor, dan barang lain yang dipakai. Catat siapa pemegangnya, kapan dikembalikan, dan kapan diservis.',
    },
    {
        target: 'nav-cek-stok',
        title: 'Cek Stok',
        body: 'Hitung barang di gudang secara langsung, lalu cocokkan dengan catatan sistem. Lakukan rutin, misalnya sebulan sekali.',
    },
    {
        target: 'nav-laporan',
        title: 'Laporan',
        body: 'Rekap untuk atasan atau keuangan. Bisa diunduh sebagai Excel atau dicetak sebagai PDF.',
    },
    {
        target: 'nav-master',
        title: 'Master Data',
        body: 'Kelola data dasar: karyawan, divisi, ruangan, supplier, kategori, dan akun pengguna. Anda hanya melihat bagian yang boleh Anda kelola.',
        adminOnly: true,
    },
    {
        target: 'bell',
        title: 'Notifikasi stok rendah',
        body: 'Titik merah di lonceng berarti ada barang yang hampir habis. Klik untuk melihat daftarnya.',
    },
    {
        target: 'nav-panduan',
        title: 'Panduan',
        body: 'Lupa caranya? Buka Panduan untuk langkah-langkah setiap fitur dan tanya jawab. Tur ini juga bisa diulang dari sana.',
    },
    {
        target: 'nav-pengaturan',
        title: 'Pengaturan',
        body: 'Ubah nama, email, dan kata sandi akun Anda. Tur ini juga bisa dimatikan atau diulang dari sana.',
    },
    {
        target: 'account',
        title: 'Akun Anda',
        body: 'Nama dan peran Anda. Klik ikon di sebelah kanan untuk keluar dari aplikasi.',
    },
];

const BUBBLE_WIDTH = 340;
const GAP = 14;
const PADDING = 6;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(name: string | undefined): HTMLElement | null {
    if (!name) {
        return null;
    }

    const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`),
    );

    return (
        candidates.find((element) => {
            const rect = element.getBoundingClientRect();

            return rect.width > 0 && rect.height > 0;
        }) ?? null
    );
}

/**
 * Offers the tour once after login, and runs it: a spotlight on each menu
 * with a bubble explaining it.
 */
export function GuidedTour() {
    const { offerGuide, auth } = usePage().props;
    const isAdmin = auth.canAccessMasterData || auth.can['manage-users'];
    const [isOffering, setIsOffering] = useState(Boolean(offerGuide));
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [stepIndex, setStepIndex] = useState<number | null>(null);
    const [rect, setRect] = useState<Rect | null>(null);

    const activeSteps = steps.filter((step) => !step.adminOnly || isAdmin);
    const step = stepIndex === null ? null : activeSteps[stepIndex];

    const savePreference = useCallback((showOnLogin: boolean) => {
        router.patch(
            guidePreference.url(),
            { show_guide_on_login: showOnLogin },
            { preserveScroll: true, preserveState: true },
        );
    }, []);

    const closeOffer = useCallback(
        (startTour: boolean) => {
            setIsOffering(false);

            if (dontAskAgain) {
                savePreference(false);
            }

            if (startTour) {
                setStepIndex(0);
            }
        },
        [dontAskAgain, savePreference],
    );

    const stop = useCallback(() => {
        setStepIndex(null);
        setRect(null);
    }, []);

    const go = useCallback(
        (delta: number) => {
            setStepIndex((current) => {
                if (current === null) {
                    return current;
                }

                const next = current + delta;

                if (next >= activeSteps.length) {
                    return null;
                }

                return Math.max(0, next);
            });
        },
        [activeSteps.length],
    );

    useEffect(() => {
        function handleStart() {
            setIsOffering(false);
            setStepIndex(0);
        }

        window.addEventListener(START_EVENT, handleStart);

        return () => window.removeEventListener(START_EVENT, handleStart);
    }, []);

    useEffect(() => {
        if (stepIndex === null) {
            return;
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                stop();
            } else if (event.key === 'ArrowRight') {
                go(1);
            } else if (event.key === 'ArrowLeft') {
                go(-1);
            }
        }

        document.addEventListener('keydown', handleKey);

        return () => document.removeEventListener('keydown', handleKey);
    }, [stepIndex, go, stop]);

    useLayoutEffect(() => {
        if (!step) {
            return;
        }

        function measure() {
            const target = findTarget(step?.target);

            if (!target) {
                setRect(null);

                return;
            }

            const box = target.getBoundingClientRect();
            setRect({
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
            });
        }

        findTarget(step.target)?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
        });
        measure();
        const timeout = window.setTimeout(measure, 350);

        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);

        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [step]);

    const firstName = auth.user?.name.split(' ')[0] ?? '';

    return (
        <>
            <Dialog
                open={isOffering}
                onClose={() => closeOffer(false)}
                title={`Halo, ${firstName}!`}
                description="Mau lihat tur singkat aplikasi? Hanya sekitar satu menit, untuk mengingatkan letak menu dan kegunaannya."
                icon={
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                        <HelpIcon className="size-5" />
                    </span>
                }
            >
                <div className="flex flex-col gap-4">
                    <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-3.5">
                        <input
                            type="checkbox"
                            checked={dontAskAgain}
                            onChange={(event) =>
                                setDontAskAgain(event.target.checked)
                            }
                            className="mt-0.5 size-[18px] accent-brand-700"
                        />
                        <span className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-ink-900">
                                Jangan tampilkan lagi setiap login
                            </span>
                            <span className="text-xs text-ink-500">
                                Tur tetap bisa dibuka kapan saja dari menu
                                Panduan.
                            </span>
                        </span>
                    </label>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => closeOffer(false)}
                        >
                            Nanti saja
                        </Button>
                        <Button onClick={() => closeOffer(true)}>
                            Mulai tur
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            {step &&
                stepIndex !== null &&
                typeof document !== 'undefined' &&
                createPortal(
                    <TourOverlay
                        rect={rect}
                        title={step.title}
                        body={step.body}
                        index={stepIndex}
                        total={activeSteps.length}
                        onPrevious={() => go(-1)}
                        onNext={() => go(1)}
                        onClose={stop}
                    />,
                    document.body,
                )}
        </>
    );
}

type TourOverlayProps = {
    rect: Rect | null;
    title: string;
    body: string;
    index: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
};

function TourOverlay({
    rect,
    title,
    body,
    index,
    total,
    onPrevious,
    onNext,
    onClose,
}: TourOverlayProps) {
    const isLast = index === total - 1;
    const bubbleStyle = bubblePosition(rect);
    const placement = rect ? bubbleStyle.placement : 'center';

    return (
        <div className="fixed inset-0 z-[80]" role="presentation">
            {rect ? (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-2xl ring-2 ring-white transition-all duration-300"
                    style={{
                        top: rect.top - PADDING,
                        left: rect.left - PADDING,
                        width: rect.width + PADDING * 2,
                        height: rect.height + PADDING * 2,
                        boxShadow: '0 0 0 9999px rgba(18, 24, 38, 0.55)',
                    }}
                />
            ) : (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-ink-900/55"
                />
            )}

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
                style={bubbleStyle.style}
                className={cn(
                    'absolute flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-[0_24px_48px_-16px_rgba(18,24,38,0.5)] transition-all duration-300',
                )}
            >
                {placement === 'right' && (
                    <span
                        aria-hidden="true"
                        className="absolute top-6 -left-1.5 size-3 rotate-45 bg-white"
                    />
                )}
                {placement === 'left' && (
                    <span
                        aria-hidden="true"
                        className="absolute top-6 -right-1.5 size-3 rotate-45 bg-white"
                    />
                )}
                {placement === 'below' && (
                    <span
                        aria-hidden="true"
                        className="absolute -top-1.5 right-6 size-3 rotate-45 bg-white"
                    />
                )}

                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-brand-700">
                            Langkah {index + 1} dari {total}
                        </span>
                        <h2
                            id="tour-title"
                            className="text-base font-semibold text-ink-900"
                        >
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup tur"
                        className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
                    >
                        <XIcon className="size-4" />
                    </button>
                </div>
                <p className="text-sm leading-relaxed text-ink-700">{body}</p>

                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex gap-1" aria-hidden="true">
                        {Array.from({ length: total }, (_, dot) => (
                            <span
                                key={dot}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    dot === index
                                        ? 'w-4 bg-brand-700'
                                        : 'w-1.5 bg-ink-200',
                                )}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {index > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onPrevious}
                            >
                                Kembali
                            </Button>
                        )}
                        <Button size="sm" onClick={onNext} autoFocus>
                            {isLast ? 'Selesai' : 'Lanjut'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function bubblePosition(rect: Rect | null): {
    style: CSSProperties;
    placement: 'right' | 'left' | 'below' | 'center';
} {
    const width = Math.min(BUBBLE_WIDTH, window.innerWidth - 32);

    if (!rect) {
        return {
            placement: 'center',
            style: {
                width,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            },
        };
    }

    const clampTop = (top: number) =>
        Math.max(16, Math.min(top, window.innerHeight - 260));

    if (rect.left + rect.width + GAP + width + 16 <= window.innerWidth) {
        return {
            placement: 'right',
            style: {
                width,
                top: clampTop(rect.top - 8),
                left: rect.left + rect.width + GAP + PADDING,
            },
        };
    }

    if (rect.left - GAP - width - 16 >= 0) {
        return {
            placement: 'left',
            style: {
                width,
                top: clampTop(rect.top - 8),
                left: rect.left - GAP - width - PADDING,
            },
        };
    }

    return {
        placement: 'below',
        style: {
            width,
            top: rect.top + rect.height + GAP + PADDING,
            left: Math.max(
                16,
                Math.min(
                    rect.left + rect.width - width,
                    window.innerWidth - width - 16,
                ),
            ),
        },
    };
}
