/**
 * Свойства полосы загрузки ProgressBar.
 */
export interface ProgressBarProps {
    readonly label?: string;
    readonly className?: string;
}
/**
 * Горизонтальная полоса загрузки страницы или вкладки с тестовой меткой TestId.Common.Loading.
 */
export declare function ProgressBar({ label, className }: ProgressBarProps): import("react").JSX.Element;
