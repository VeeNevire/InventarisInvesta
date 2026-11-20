import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect;

const GAP = 6;
const MAX_HEIGHT = 288;

/**
 * Positions a list right under (or above, when there is no room) an anchor
 * element. The list is rendered into <body> so dialogs and scroll areas
 * never clip it.
 */
export function useFloatingPosition(
    anchorRef: RefObject<HTMLElement | null>,
    open: boolean,
): CSSProperties {
    const [style, setStyle] = useState<CSSProperties>({});

    useIsomorphicLayoutEffect(() => {
        if (!open) {
            return;
        }

        function update() {
            const anchor = anchorRef.current;

            if (!anchor) {
                return;
            }

            const rect = anchor.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom - GAP - 8;
            const spaceAbove = rect.top - GAP - 8;
            const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
            const maxHeight = Math.min(
                MAX_HEIGHT,
                placeAbove ? spaceAbove : spaceBelow,
            );

            setStyle({
                position: 'fixed',
                left: rect.left,
                width: rect.width,
                maxHeight,
                ...(placeAbove
                    ? { bottom: window.innerHeight - rect.top + GAP }
                    : { top: rect.bottom + GAP }),
            });
        }

        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);

        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, anchorRef]);

    return style;
}

type FloatingListProps = {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onDismiss: () => void;
    id: string;
    label?: string;
    children: ReactNode;
};

/**
 * The shared dropdown panel used by Select and Autocomplete.
 */
export function FloatingList({
    open,
    anchorRef,
    onDismiss,
    id,
    label,
    children,
}: FloatingListProps) {
    const style = useFloatingPosition(anchorRef, open);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointer(event: PointerEvent) {
            const target = event.target as Node;

            if (
                !listRef.current?.contains(target) &&
                !anchorRef.current?.contains(target)
            ) {
                onDismiss();
            }
        }

        document.addEventListener('pointerdown', handlePointer);

        return () => document.removeEventListener('pointerdown', handlePointer);
    }, [open, onDismiss, anchorRef]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <ul
            ref={listRef}
            id={id}
            role="listbox"
            aria-label={label}
            style={style}
            className="z-[70] flex flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-2xl border border-ink-200 bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(18,24,38,0.35)]"
        >
            {children}
        </ul>,
        document.body,
    );
}

type FloatingOptionProps = {
    id: string;
    selected?: boolean;
    active: boolean;
    onChoose: () => void;
    onHover: () => void;
    children: ReactNode;
};

export function FloatingOption({
    id,
    selected = false,
    active,
    onChoose,
    onHover,
    children,
}: FloatingOptionProps) {
    const ref = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (active) {
            ref.current?.scrollIntoView({ block: 'nearest' });
        }
    }, [active]);

    return (
        <li
            ref={ref}
            id={id}
            role="option"
            aria-selected={selected}
            onMouseDown={(event) => {
                event.preventDefault();
                onChoose();
            }}
            onMouseEnter={onHover}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                active ? 'bg-brand-50 text-ink-900' : 'text-ink-700'
            } ${selected ? 'font-semibold text-brand-700' : ''}`}
        >
            {children}
        </li>
    );
}
