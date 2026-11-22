/**
 * Свойства индикатора вращения Spinner.
 */
export interface SpinnerProps {
    readonly size?: 'small' | 'standard';
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}
/**
 * Компактный индикатор загрузки для кнопок, строк и списков.
 */
export declare function Spinner({ size, markLoadingRoot, className }: SpinnerProps): import("react").JSX.Element;
