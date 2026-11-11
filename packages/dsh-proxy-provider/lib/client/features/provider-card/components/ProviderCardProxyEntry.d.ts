export interface ProviderCardProxyEntryProps {
    readonly provider?: string | {
        readonly provider?: string;
        readonly id?: string;
    };
    readonly providerId?: string;
}
/**
 * Компактная строка выбора профиля прокси и кнопки настроек внутри карточки провайдера DSH.
 */
export declare function ProviderCardProxyEntry(props: ProviderCardProxyEntryProps): import("react").JSX.Element | undefined;
