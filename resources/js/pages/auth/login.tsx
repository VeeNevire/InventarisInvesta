import { Form, Head } from '@inertiajs/react';
import type { ComponentType, SVGProps } from 'react';
import {
    ArrowsIcon,
    BoxIcon,
    ClipboardIcon,
    LaptopIcon,
    TagIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { store as loginStore } from '@/routes/login';

type FloatingTile = {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    className: string;
};

/**
 * Faint inventory tiles scattered behind the login card.
 */
const floatingTiles: FloatingTile[] = [
    { icon: BoxIcon, className: 'top-[12%] left-[10%] size-16 -rotate-12' },
    { icon: LaptopIcon, className: 'top-[18%] right-[12%] size-20 rotate-6' },
    { icon: TagIcon, className: 'bottom-[16%] left-[14%] size-14 rotate-12' },
    {
        icon: ArrowsIcon,
        className: 'right-[9%] bottom-[22%] size-16 -rotate-6',
    },
    {
        icon: ClipboardIcon,
        className: 'top-[46%] left-[4%] hidden size-12 rotate-3 md:flex',
    },
    {
        icon: BoxIcon,
        className: 'top-[52%] right-[4%] hidden size-12 -rotate-3 md:flex',
    },
];

export default function Login() {
    return (
        <>
            <Head title="Masuk" />
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#c3cde6_1.2px,transparent_1.2px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_30%,transparent_100%)] bg-[size:22px_22px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-brand-300/40 blur-[110px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-40 -bottom-48 size-[560px] rounded-full bg-brand-500/25 blur-[120px]"
                />

                {floatingTiles.map((tile, index) => (
                    <span
                        key={index}
                        aria-hidden="true"
                        className={`pointer-events-none absolute flex items-center justify-center rounded-2xl border border-white/80 bg-white/55 text-brand-400 shadow-[0_12px_30px_-14px_rgba(42,56,176,0.35)] backdrop-blur-sm ${tile.className}`}
                    >
                        <tile.icon className="size-1/2" strokeWidth={1.4} />
                    </span>
                ))}

                <div className="relative flex w-full max-w-[420px] flex-col gap-7 rounded-[28px] border border-white bg-white/90 p-8 shadow-[0_1px_2px_rgba(18,24,38,0.04),0_32px_64px_-28px_rgba(30,45,120,0.35)] backdrop-blur-md sm:p-10">
                    <div className="flex flex-col items-center gap-5 text-center">
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-[0_10px_24px_-10px_rgba(42,56,176,0.9)]">
                            <BoxIcon className="size-7" strokeWidth={1.9} />
                        </span>
                        <div className="flex flex-col gap-1.5">
                            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
                                Masuk ke Inventaris
                                <span className="text-brand-700">Investa</span>
                            </h1>
                            <p className="text-sm text-ink-500">
                                Khusus Admin dan Sekretaris. Gunakan akun yang
                                diberikan admin.
                            </p>
                        </div>
                    </div>

                    <Form
                        {...loginStore.form()}
                        resetOnError={['password']}
                        className="flex flex-col gap-5"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="email"
                                        className="text-sm font-medium text-ink-700"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        autoFocus
                                        required
                                        placeholder="nama@perusahaan.co.id"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email
                                                ? 'email-error'
                                                : undefined
                                        }
                                        className="h-12 rounded-xl border border-ink-200 bg-white px-4 text-[15px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-invalid:border-low"
                                    />
                                    {errors.email && (
                                        <p
                                            id="email-error"
                                            className="text-sm text-[#c52c32]"
                                        >
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-ink-700"
                                    >
                                        Kata sandi
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        aria-invalid={Boolean(errors.password)}
                                        className="h-12 rounded-xl border border-ink-200 bg-white px-4 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-invalid:border-low"
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-[#c52c32]">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <label className="flex items-center gap-2.5 text-sm text-ink-700">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        value="1"
                                        className="size-[18px] rounded accent-brand-700"
                                    />
                                    Ingat saya di perangkat ini
                                </label>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-12 w-full"
                                >
                                    {processing ? 'Memeriksa…' : 'Masuk'}
                                </Button>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}
