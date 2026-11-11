import { type ReactNode } from 'react';
import type { DshThemeId } from '../../models/DshContext.js';
/**
 * Свойства модального окна Modal дизайн-системы @kalex/dsh-core.
 */
export interface ModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title?: ReactNode;
    readonly headerExtra?: ReactNode;
    readonly closeLabel?: string;
    readonly theme?: DshThemeId;
    readonly backdropClassName?: string;
    readonly cardClassName?: string;
    readonly children: ReactNode;
}
/**
 * Универсальное модальное окно с поддержкой активной темы DSH, клавиши Escape и закрытия по клику вне карточки.
 */
export declare function Modal({ open, onClose, title, headerExtra, closeLabel, theme, backdropClassName, cardClassName, children }: ModalProps): import("react").JSX.Element | undefined;
