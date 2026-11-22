import { type CSSProperties, createElement, type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../utils/classNames.ts';

export interface PopoverProps {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly triggerClassName?: string;
    readonly contentClassName?: string;
    readonly triggerElement?: 'span' | 'div';
}

export function Popover({ children, content, triggerClassName, contentClassName, triggerElement }: PopoverProps) {
    const popoverId = useId();
    const anchorName = `--dsh-core-popover-${popoverId.replaceAll(':', '')}`;
    const [portalTarget, setPortalTarget] = useState<Element>();
    const rootRef = useRef<HTMLSpanElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!portalTarget) return undefined;
        const onPointerDown = (event: PointerEvent): void => {
            const target = event.target;
            if (!(target instanceof Node) || rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setPortalTarget(undefined);
        };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') setPortalTarget(undefined);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [portalTarget]);
    const panelStyle = { positionAnchor: anchorName } as CSSProperties & {
        positionAnchor: string;
    };
    const panel = portalTarget
        ? createPortal(
              <div ref={panelRef} id={popoverId} role="dialog" className={cx('dsh-popover-content', contentClassName)} style={panelStyle}>
                  {content}
              </div>,
              portalTarget
          )
        : undefined;
    const triggerProps = {
        onClick: (event: MouseEvent<HTMLElement>) =>
            setPortalTarget(portalTarget ? undefined : (event.currentTarget.closest('[data-theme]:not(html)') ?? document.body))
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
