import { Form, Head } from '@inertiajs/react';
import type { ComponentType, SVGProps } from 'react';
import { useState } from 'react';
import {
    AlertIcon,
    ArrowsIcon,
    BoxIcon,
    ClipboardIcon,
    EyeIcon,
    EyeOffIcon,
    LaptopIcon,
    TagIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { store as loginStore } from '@/routes/login';

type FloatingTile = {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    position: string;
    size: string;
    rotate: string;
    animationClass: string;
};

/**
 * Faint inventory tiles scattered behind the login card that gently float.
 */
const floatingTiles: FloatingTile[] = [
    {
        icon: BoxIcon,
        position: 'top-[12%] left-[10%]',
        size: 'size-16',
        rotate: '-rotate-12',
        animationClass: 'animate-float-1',
    },
    {
        icon: LaptopIcon,
        position: 'top-[18%] right-[12%]',
        size: 'size-20',
        rotate: 'rotate-6',
        animationClass: 'animate-float-2',
    },
    {
        icon: TagIcon,
        position: 'bottom-[16%] left-[14%]',
        size: 'size-14',
        rotate: 'rotate-12',
        animationClass: 'animate-float-3',
    },
    {
        icon: ArrowsIcon,
        position: 'right-[9%] bottom-[22%]',
        size: 'size-16',
        rotate: '-rotate-6',
        animationClass: 'animate-float-4',
    },
    {
        icon: ClipboardIcon,
        position: 'top-[46%] left-[4%] hidden md:block',
        size: 'size-12',
        rotate: 'rotate-3',
        animationClass: 'animate-float-2',
    },
    {
        icon: BoxIcon,
        position: 'top-[52%] right-[4%] hidden md:block',
        size: 'size-12',
        rotate: '-rotate-3',
        animationClass: 'animate-float-1',
    },
];

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Masuk" />
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#bfe3dc_1.2px,transparent_1.2px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_30%,transparent_100%)] bg-[size:22px_22px]"
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
                    <div
                        key={index}
                        aria-hidden="true"
                        className={`pointer-events-none absolute ${tile.position} ${tile.animationClass}`}
                    >
                        <span
                            className={`flex items-center justify-center rounded-2xl border border-white/80 bg-white/55 text-brand-400 shadow-[0_12px_30px_-14px_rgba(22,121,201,0.35)] backdrop-blur-sm ${tile.size} ${tile.rotate}`}
                        >
                            <tile.icon className="size-1/2" strokeWidth={1.4} />
                        </span>
                    </div>
                ))}

                <div className="relative flex w-full max-w-[420px] flex-col gap-7 rounded-[28px] border border-white bg-white/90 p-8 shadow-[0_1px_2px_rgba(18,24,38,0.04),0_32px_64px_-28px_rgba(23,82,131,0.35)] backdrop-blur-md sm:p-10">
                    <div className="flex flex-col items-center gap-5 text-center">
                        <img
                            src="/logo-mark.svg?v=7"
                            alt="Inventaris Investa"
                            className="size-16 rounded-[15px] shadow-[0_10px_24px_-10px_rgba(22,121,201,0.55)]"
                        />
                        <div className="flex flex-col gap-1.5">
                            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
                                Masuk ke Inventaris{' '}
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
                                        Email{' '}
                                        <span
                                            className="text-low"
                                            aria-hidden="true"
                                        >
                                            *
                                        </span>
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        autoFocus
                                        required
                                        aria-required="true"
                                        placeholder="nama@perusahaan.co.id"
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email
                                                ? 'email-error'
                                                : undefined
                                        }
                                        className="h-12 rounded-xl border border-ink-200 bg-white px-4 text-[15px] text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100 aria-invalid:border-low"
                                    />
                                    {errors.email && (
                                        <p
                                            id="email-error"
                                            role="alert"
                                            className="flex items-center gap-1.5 text-sm font-medium text-low-ink"
                                        >
                                            <AlertIcon className="size-4 shrink-0" />
                                            <span>{errors.email}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-ink-700"
                                    >
                                        Kata sandi{' '}
                                        <span
                                            className="text-low"
                                            aria-hidden="true"
                                        >
                                            *
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete="current-password"
                                            required
                                            aria-required="true"
                                            aria-invalid={Boolean(
                                                errors.password,
                                            )}
                                            aria-describedby={
                                                errors.password
                                                    ? 'password-error'
                                                    : undefined
                                            }
                                            className="h-12 w-full rounded-xl border border-ink-200 bg-white pr-12 pl-4 text-[15px] text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100 aria-invalid:border-low"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((prev) => !prev)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? 'Sembunyikan kata sandi'
                                                    : 'Tampilkan kata sandi'
                                            }
                                            aria-pressed={showPassword}
                                            className="group absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-400 transition-colors hover:text-ink-700 focus:text-ink-700 focus:outline-none"
                                        >
                                            <span className="relative flex size-5 items-center justify-center transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90">
                                                <EyeIcon
                                                    className={`absolute inset-0 size-5 transition-all duration-300 ease-out ${
                                                        showPassword
                                                            ? 'scale-50 rotate-45 opacity-0 pointer-events-none'
                                                            : 'scale-100 rotate-0 opacity-100'
                                                    }`}
                                                />
                                                <EyeOffIcon
                                                    className={`absolute inset-0 size-5 transition-all duration-300 ease-out ${
                                                        showPassword
                                                            ? 'scale-100 rotate-0 opacity-100'
                                                            : 'scale-50 -rotate-45 opacity-0 pointer-events-none'
                                                    }`}
                                                />
                                            </span>
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p
                                            id="password-error"
                                            role="alert"
                                            className="flex items-center gap-1.5 text-sm font-medium text-low-ink"
                                        >
                                            <AlertIcon className="size-4 shrink-0" />
                                            <span>{errors.password}</span>
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
                                    className="h-12 w-full gap-2 text-[15px]"
                                >
                                    {processing ? (
                                        <>
                                            <svg
                                                className="size-4 animate-spin text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            <span>Memeriksa…</span>
                                        </>
                                    ) : (
                                        <span>Masuk</span>
                                    )}
                                </Button>
                            </>
                        )}
                    </Form>

                    <div className="border-t border-ink-100 pt-5 text-center text-xs text-ink-500">
                        <p className="leading-relaxed">
                            Lupa kata sandi atau mengalami kendala masuk?
                        </p>
                        <p className="mt-1">
                            Hubungi Administrator Atau TIM IT Investa untuk
                            mendapatkan bantuan.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
