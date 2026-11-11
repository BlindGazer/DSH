import { type ProxyClientSnapshot } from '../../../app/proxyStore.js';
import type { ImportExportHandlersState } from '../hooks/useImportExportHandlers.js';
export interface ImportExportSectionProps extends Omit<ImportExportHandlersState, 'resetForOpen'> {
    readonly placement: 'header' | 'body';
    readonly snap?: ProxyClientSnapshot;
}
/**
 * Секция кнопок и форм парольного экспорта/импорта настроек прокси.
 */
export declare function ImportExportSection(props: ImportExportSectionProps): import("react").JSX.Element;
