import type { ProfileActionsState } from '../hooks/useProfileActions.js';
interface ProfilesSectionProps extends Omit<ProfileActionsState, 'resetForOpen'> {
}
/**
 * Секция списка профилей прокси с подтверждением удаления и встроенным редактором.
 */
export declare function ProfilesSection(props: ProfilesSectionProps): import("react").JSX.Element;
export {};
