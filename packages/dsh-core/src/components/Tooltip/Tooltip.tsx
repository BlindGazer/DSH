import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEffectiveTheme } from '../../hooks/useEffectiveTheme.js';
import type { DshThemeId } from '../../models/DshContext.js';
import { cx } from '../../utils/classNames.js';
import { pointerModality } from './input-modality.js';
import { placeTooltip, type TooltipSide } from './tooltip-placement.js';

export interface TooltipProps {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly triggerLabel: string;
    readonly theme?: DshThemeId;
    readonly triggerMode?: 'hover' | 'click';
    readonly contentLabel?: string;
    readonly delayMs?: number;
    readonly className?: string;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly triggerElement?: 'span' | 'div';
    readonly side?: TooltipSide;
    readonly align?: 'center' | 'end';
    readonly portal?: boolean;
    readonly 'data-testid'?: string;
}

export function Tooltip({
    children,
    content,
    triggerLabel,
    theme,
    triggerMode = 'hover',
    contentLabel = triggerLabel,
    delayMs = 0,
    className,
    triggerClassName,
    contentClassName,
    triggerElement,
    side = 'right',
    align = 'center',
    portal = true,
    'data-testid': testId
}: TooltipProps) {
    const effectiveTheme = useEffectiveTheme(theme ?? 'auto');
    const id = useId();
    const anchor = useRef<HTMLElement | undefined>(undefined);
    const bubble = useRef<HTMLSpanElement | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<{ anchor: DOMRect; width: number; height: number } | undefined>(undefined);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cancel = (): void => {
        if (timer.current !== undefined) clearTimeout(timer.current);
        timer.current = undefined;
    };
    const show = (): void => {
        if (anchor.current) {
            setPlacement({ anchor: anchor.current.getBoundingClientRect(), width: 0, height: 0 });
            setOpen(true);
        }
    };
    const hide = (): void => {
        cancel();
        setOpen(false);
        setPlacement(undefined);
    };
    const delayedShow = (): void => {
        cancel();
        if (delayMs <= 0) show();
        else timer.current = setTimeout(show, delayMs);
    };
    useEffect(() => {
        const timerRef = timer;
        return () => {
            if (timerRef.current !== undefined) clearTimeout(timerRef.current);
            timerRef.current = undefined;
        };
    }, []);
    useEffect(() => {
        if (!open || !bubble.current || !placement) return undefined;
        const update = (): void => {
            if (anchor.current && bubble.current) {
                const box = bubble.current.getBoundingClientRect();
                setPlacement({ anchor: anchor.current.getBoundingClientRect(), width: box.width, height: box.height });
            }
        };
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
        observer?.observe(bubble.current);
        window.addEventListener('resize', update);
        update();
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [open, placement]);
    const positioned =
        placement && placement.width > 0
            ? placeTooltip({
                  anchor: placement.anchor,
                  width: placement.width,
                  height: placement.height,
                  viewportWidth: window.innerWidth,
                  viewportHeight: window.innerHeight,
                  side,
                  align,
                  gap: 8
              })
            : undefined;
    const triggerProps = {
        'aria-label': triggerLabel,
        'aria-describedby': open ? id : undefined,
        onPointerEnter: (event: PointerEvent) => {
            if (triggerMode === 'hover' && event.pointerType !== 'touch') delayedShow();
        },
        onPointerLeave: () => {
            if (triggerMode === 'hover') hide();
        },
        onFocus: () => {
            if (triggerMode === 'hover' && !pointerModality()) delayedShow();
        },
        onBlur: hide,
        onClick:
            triggerMode === 'click'
                ? () => {
                      if (open) hide();
                      else show();
                  }
                : undefined
    };
    const trigger =
        triggerElement === 'span' || triggerMode === 'click' ? (
            <span {...triggerProps}>{children}</span>
        ) : (
            <button type="button" className={cx('dsh-tooltip-trigger', triggerClassName)} {...triggerProps}>
                {children}
            </button>
        );
    const panel = open ? (
        <span
            ref={element => {
                bubble.current = element ?? undefined;
            }}
            id={id}
            className={cx('dsh-tooltip-content', contentClassName)}
            data-theme={theme ?? effectiveTheme}
            role="tooltip"
            aria-label={contentLabel}
            style={
                { left: positioned?.left ?? 0, top: positioned?.top ?? 0, visibility: positioned ? 'visible' : 'hidden' } as CSSProperties
            }>
            {content}
        </span>
    ) : undefined;
    return (
        <span
            ref={element => {
                anchor.current = element ?? undefined;
            }}
            className={cx('dsh-tooltip', className)}
            data-testid={testId}>
            {trigger}
            {portal && panel ? createPortal(panel, document.body) : panel}
        </span>
    );
}
