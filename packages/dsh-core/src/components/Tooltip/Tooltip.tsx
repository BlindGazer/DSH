import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEffectiveTheme } from '../../hooks/useEffectiveTheme.js';
import type { DshThemeId } from '../../models/DshContext.js';
import { cx } from '../../utils/classNames.js';

export interface TooltipProps {
    /** Содержимое кнопки, открывающей подсказку или панель. */
    readonly children: ReactNode;
    /** Содержимое поверхности DSH. */
    readonly content: ReactNode;
    /** Доступное имя кнопки-триггера. */
    readonly triggerLabel: string;
    /** Явная тема панели, если она отличается от автоматически определенной темы DSH. */
    readonly theme?: DshThemeId;
    /** Режим открытия: hover/focus для подсказки или click для закрепляемой панели. */
    readonly triggerMode?: 'hover' | 'click';
    /** Доступное имя панели при `triggerMode="click"`. */
    readonly contentLabel?: string;
    /** Задержка показа при наведении, как в подсказках DSH. */
    readonly delayMs?: number;
    readonly className?: string;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly 'data-testid'?: string;
}

/**
 * Отображает панель DSH через portal, размещает ее с учетом viewport и не рисует стрелку.
 * Поддерживает hover/focus и click, сохраняя семантику кнопки и доступную связь триггера с панелью.
 */
export function Tooltip({
    children,
    content,
    triggerLabel,
    theme,
    triggerMode = 'hover',
    contentLabel = triggerLabel,
    delayMs = 200,
    className,
    triggerClassName,
    contentClassName,
    'data-testid': testId
}: TooltipProps) {
    const effectiveTheme = useEffectiveTheme(theme ?? 'auto');
    const panelTheme = theme ?? effectiveTheme;
    const tooltipId = useId();
    const anchorName = `--dsh-core-tooltip-${tooltipId.replaceAll(':', '')}`;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const cancelTimers = (): void => {
        if (showTimer.current !== undefined) clearTimeout(showTimer.current);
        if (hideTimer.current !== undefined) clearTimeout(hideTimer.current);
        showTimer.current = undefined;
        hideTimer.current = undefined;
    };
    const scheduleOpen = (): void => {
        if (triggerMode !== 'hover') return;
        cancelTimers();
        showTimer.current = setTimeout(() => setOpen(true), Math.max(0, delayMs));
    };
    const scheduleClose = (): void => {
        if (triggerMode !== 'hover') return;
        if (showTimer.current !== undefined) clearTimeout(showTimer.current);
        showTimer.current = undefined;
        if (hideTimer.current !== undefined) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setOpen(false), 120);
    };

    useEffect(
        () => () => {
            if (showTimer.current !== undefined) clearTimeout(showTimer.current);
            if (hideTimer.current !== undefined) clearTimeout(hideTimer.current);
        },
        []
    );
    useEffect(() => {
        if (!open || triggerMode !== 'click') return undefined;
        const onPointerDown = (event: PointerEvent): void => {
            const target = event.target;
            if (!(target instanceof Node) || rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, triggerMode]);

    const anchorStyle = { anchorName } as CSSProperties & { anchorName: string };
    const panelStyle = { positionAnchor: anchorName } as CSSProperties & { positionAnchor: string };
    const panel =
        open && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      id={tooltipId}
                      ref={panelRef}
                      className={cx('dsh-core-root', 'dsh-tooltip-content', contentClassName)}
                      data-theme={panelTheme}
                      style={panelStyle}
                      role={triggerMode === 'click' ? 'dialog' : 'tooltip'}
                      {...(triggerMode === 'click' ? { 'aria-label': contentLabel } : {})}>
                      {content}
                  </div>,
                  document.body
              )
            : null;

    return (
        <span ref={rootRef} className={cx('dsh-tooltip', className)} data-testid={testId} style={anchorStyle}>
            <button
                type="button"
                className={cx('dsh-tooltip-trigger', triggerClassName)}
                aria-label={triggerLabel}
                aria-describedby={open ? tooltipId : undefined}
                {...(triggerMode === 'click' ? { 'aria-haspopup': 'dialog' as const, 'aria-expanded': open } : {})}
                onMouseEnter={scheduleOpen}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                    if (triggerMode === 'hover') {
                        cancelTimers();
                        setOpen(true);
                    }
                }}
                onBlur={scheduleClose}
                onClick={triggerMode === 'click' ? () => setOpen(value => !value) : undefined}>
                {children}
            </button>
            {panel}
        </span>
    );
}
