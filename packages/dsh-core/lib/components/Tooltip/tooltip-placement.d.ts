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
export declare function placeTooltip(input: TooltipPlacementInput): TooltipPlacement;
