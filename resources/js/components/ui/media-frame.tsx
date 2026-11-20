import type { ComponentType, ReactNode, SVGProps } from 'react';
import { ImageIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

type MediaFrameProps = {
    src: string | null;
    alt: string;
    fallbackIcon?: ComponentType<SVGProps<SVGSVGElement>>;
    className?: string;
    children?: ReactNode;
};

/**
 * Soft blue photo area used on cards and detail pages. Shows the uploaded
 * photo, or a quiet placeholder when there is none yet.
 */
export function MediaFrame({
    src,
    alt,
    fallbackIcon: FallbackIcon = ImageIcon,
    className,
    children,
}: MediaFrameProps) {
    return (
        <div
            className={cn(
                'relative flex items-center justify-center overflow-hidden rounded-xl bg-media',
                className,
            )}
        >
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="size-full object-contain p-3"
                />
            ) : (
                <div className="flex flex-col items-center gap-2 text-brand-300">
                    <FallbackIcon className="size-10" strokeWidth={1.25} />
                    <span className="text-[11px] font-medium text-ink-400">
                        Belum ada foto
                    </span>
                </div>
            )}
            {children}
        </div>
    );
}
