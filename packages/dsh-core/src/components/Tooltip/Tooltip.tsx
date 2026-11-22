import { type CSSProperties, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/classNames.ts';
import { pointerModality } from './input-modality.ts';
import { placeTooltip, type TooltipSide } from './tooltip-placement.ts';

export interface TooltipProps {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly triggerMode?: 'hover' | 'click';
    readonly delayMs?: number;
    readonly className?: string;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly triggerElement?: 'span' | 'div';
    readonly side?: TooltipSide;
    readonly align?: 'center' | 'end';
    readonly portal?: boolean | 'body';
    readonly 'data-testid'?: string;
}

export function Tooltip({
    children,
    content,
    triggerMode = 'hover',
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
    const anchor = useRef<HTMLElement | undefined>(undefined);
    const bubble = useRef<HTMLSpanElement | undefined>(undefined);
    const [portalTarget, setPortalTarget] = useState<Element>();
    const [placement, setPlacement] = useState<{ anchor: DOMRect; width: number; height: number } | undefined>(undefined);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cancel = (): void => {
        if (timer.current !== undefined) clearTimeout(timer.current);
        timer.current = undefined;
    };
    const show = (): void => {
        if (anchor.current) {
            setPlacement({ anchor: anchor.current.getBoundingClientRect(), width: 0, height: 0 });
            setPortalTarget(anchor.current.closest('[data-theme]:not(html)') ?? document.body);
        }
    };
    const hide = (): void => {
        cancel();
        setPortalTarget(undefined);
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
        if (!portalTarget || !bubble.current) return undefined;
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
    }, [portalTarget]);
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
                      if (portalTarget) hide();
                      else show();
                  }
                : hide
    };
    const trigger =
        triggerElement === 'span' || triggerMode === 'click' ? (
            <span {...triggerProps}>{children}</span>
        ) : (
            <button type="button" className={cx('dsh-tooltip-trigger', triggerClassName)} {...triggerProps}>
                {children}
            </button>
        );
    const panel = portalTarget ? (
        <span
            ref={element => {
                bubble.current = element ?? undefined;
            }}
            className={cx('dsh-tooltip-content', portal === 'body' ? 'dsh-core-root' : undefined, contentClassName)}
            data-theme={portal === 'body' ? (portalTarget.getAttribute('data-theme') ?? undefined) : undefined}
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
            {portal && portalTarget ? createPortal(panel, portal === 'body' ? document.body : portalTarget) : panel}
        </span>
    );
}
