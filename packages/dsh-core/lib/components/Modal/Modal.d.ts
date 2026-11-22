import { type ReactNode } from 'react';
/**
 * Свойства модального окна Modal дизайн-системы @kalex/dsh-core.
 */
export interface ModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title?: ReactNode;
    readonly headerExtra?: ReactNode;
    readonly footer?: ReactNode;
    readonly description?: ReactNode;
    readonly closeLabel?: string;
    readonly backdropClassName?: string;
    readonly cardClassName?: string;
    readonly children: ReactNode;
}
/**
 * Универсальное модальное окно с поддержкой активной темы DSH, клавиши Escape и закрытия по клику вне карточки.
 */
export declare function Modal({ open, onClose, title, headerExtra, footer, description, closeLabel, backdropClassName, cardClassName, children }: ModalProps): import("react").JSX.Element;
