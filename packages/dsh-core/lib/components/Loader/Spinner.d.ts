/**
 * Свойства индикатора вращения Spinner.
 */
export interface SpinnerProps {
    readonly label?: string;
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}
/**
 * Компактный индикатор загрузки для кнопок, строк и списков.
 */
export declare function Spinner({ label, markLoadingRoot, className }: SpinnerProps): import("react").JSX.Element;
