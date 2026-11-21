import { type CSSProperties, createElement, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEffectiveTheme } from '../../hooks/useEffectiveTheme.js';
import type { DshThemeId } from '../../models/DshContext.js';
import { cx } from '../../utils/classNames.js';

export interface PopoverProps {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly triggerLabel: string;
    readonly theme?: DshThemeId;
    readonly contentLabel?: string;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly triggerElement?: 'span' | 'div';
}

export function Popover({
    children,
    content,
    triggerLabel,
    theme,
    contentLabel = triggerLabel,
    triggerClassName,
    contentClassName,
    triggerElement
}: PopoverProps) {
    const effectiveTheme = useEffectiveTheme(theme ?? 'auto');
    const panelTheme = theme ?? effectiveTheme;
    const popoverId = useId();
    const anchorName = `--dsh-core-popover-${popoverId.replaceAll(':', '')}`;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!open) return undefined;
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
    }, [open]);
    const panelStyle = { positionAnchor: anchorName } as CSSProperties & {
        positionAnchor: string;
    };
    const panel =
        open && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      ref={panelRef}
                      id={popoverId}
                      className={cx('dsh-core-root', 'dsh-popover-content', contentClassName)}
                      data-theme={panelTheme}
                      style={panelStyle}
                      role="dialog"
                      aria-label={contentLabel}>
                      {content}
                  </div>,
                  document.body
              )
            : undefined;
    const triggerProps = {
        'aria-label': triggerLabel,
        'aria-describedby': open ? popoverId : undefined,
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': open,
        onClick: () => setOpen(value => !value)
    };
    const trigger =
        triggerElement === undefined
            ? createElement(
                  'button',
                  {
                      type: 'button',
                      className: cx('dsh-popover-trigger', triggerClassName),
                      ...triggerProps
                  },
                  children
              )
            : createElement(
                  triggerElement,
                  {
                      className: cx('dsh-popover-trigger', triggerClassName),
                      ...triggerProps
                  },
                  children
              );
    return (
        <span ref={rootRef} className="dsh-popover" style={{ anchorName } as CSSProperties & { anchorName: string }}>
            {trigger}
            {panel}
        </span>
    );
}
