import type React from 'react';
export interface GlobalSettingsCardProps {
    isModal?: boolean;
    onClose?: () => void;
}
export declare function GlobalSettingsCard({ isModal, onClose }: GlobalSettingsCardProps): React.JSX.Element;
