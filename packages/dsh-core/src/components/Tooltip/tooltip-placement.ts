export type TooltipSide = 'right' | 'left' | 'bottom' | 'top';
export interface TooltipPlacementInput {
    readonly anchor: DOMRect;
    readonly width: number;
    readonly height: number;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
    readonly side: TooltipSide;
    readonly align: 'center' | 'end';
    readonly gap: number;
}
export interface TooltipPlacement {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly side: TooltipSide;
    readonly overflow: boolean;
}
const opposite: Record<TooltipSide, TooltipSide> = {
    right: 'left',
    left: 'right',
    top: 'bottom',
    bottom: 'top'
};
export function placeTooltip(input: TooltipPlacementInput): TooltipPlacement {
    const margin = 12;
    const width = Math.min(input.width, Math.max(0, input.viewportWidth - margin * 2));
    const height = Math.min(input.height, Math.max(0, input.viewportHeight - margin * 2));
    const clampX = (value: number) => Math.max(margin, Math.min(value, input.viewportWidth - margin - width));
    const clampY = (value: number) => Math.max(margin, Math.min(value, input.viewportHeight - margin - height));
    const positions: Record<TooltipSide, { left: number; top: number }> = {
        right: {
            left: input.anchor.right + 10,
            top: clampY((input.anchor.top + input.anchor.bottom - height) / 2)
        },
        left: {
            left: input.anchor.left - 10 - width,
            top: clampY((input.anchor.top + input.anchor.bottom - height) / 2)
        },
        bottom: {
            left: clampX(input.align === 'end' ? input.anchor.right - width : (input.anchor.left + input.anchor.right - width) / 2),
            top: input.anchor.bottom + input.gap
        },
        top: {
            left: clampX(input.align === 'end' ? input.anchor.right - width : (input.anchor.left + input.anchor.right - width) / 2),
            top: input.anchor.top - input.gap - height
        }
    };
    const horizontal = input.side === 'right' || input.side === 'left';
    const candidates = [input.side, opposite[input.side], ...(horizontal ? ['bottom', 'top'] : ['right', 'left'])] as TooltipSide[];
    for (const side of candidates) {
        const position = positions[side];
        if (
            position.left >= margin &&
            position.top >= margin &&
            position.left + width <= input.viewportWidth - margin &&
            position.top + height <= input.viewportHeight - margin
        )
            return { ...position, width, height, side, overflow: false };
    }
    const fallback = positions[input.side];
    return {
        left: clampX(fallback.left),
        top: clampY(fallback.top),
        width,
        height,
        side: input.side,
        overflow: true
    };
}
