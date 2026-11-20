import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'outline' | 'soft' | 'ghost';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
    primary:
        'bg-brand-700 text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_-6px_rgba(42,56,176,0.6)] hover:bg-brand-800',
    outline:
        'border border-brand-700 bg-white text-brand-700 hover:bg-brand-50',
    soft: 'bg-ink-50 text-brand-700 hover:bg-brand-50',
    ghost: 'text-ink-700 hover:bg-ink-100',
};

const sizes: Record<Size, string> = {
    md: 'h-11 gap-2 rounded-xl px-4 text-sm',
    sm: 'h-9 gap-1.5 rounded-lg px-3 text-[13px]',
};

export function buttonClasses(
    variant: Variant = 'primary',
    size: Size = 'md',
    className?: string,
): string {
    return cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
    );
}

type ButtonProps = ComponentProps<'button'> & {
    variant?: Variant;
    size?: Size;
    icon?: ReactNode;
};

export function Button({
    variant,
    size,
    icon,
    className,
    children,
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={buttonClasses(variant, size, className)}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'size'> & {
    variant?: Variant;
    size?: Size;
    icon?: ReactNode;
};

export function ButtonLink({
    variant,
    size,
    icon,
    className,
    children,
    ...props
}: ButtonLinkProps) {
    return (
        <Link
            className={buttonClasses(variant, size, className as string)}
            {...props}
        >
            {icon}
            {children}
        </Link>
    );
}
