/**
 * Свойства скелетона загрузки Skeleton.
 */
export interface SkeletonProps {
    readonly width?: string | number;
    readonly height?: string | number;
    readonly markLoadingRoot?: boolean;
    readonly className?: string;
}
/**
 * Скелетон поля, кнопки или карточки для сохранения структуры разметки во время загрузки данных.
 */
export declare function Skeleton({ width, height, markLoadingRoot, className }: SkeletonProps): import("react").JSX.Element;
