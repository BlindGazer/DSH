import type { Translate } from '../../../shared/constants/localizations/WorkspaceManagerLocalization.ts';
import styles from './WorktreeModal.module.scss';

interface WorktreeSummaryProps {
    readonly title: string;
    readonly path: string;
    readonly branch: string | null | undefined;
    readonly t: Translate;
}

export function WorktreeSummary({ title, path, branch, t }: WorktreeSummaryProps) {
    return (
        <div className={styles.summary}>
            <div className={styles.location}>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M1.75 12.5v-9h4.5l1.5 1.75h6.5v7.25z" />
                </svg>
                <strong>{title}</strong>
                <p>{path}</p>
            </div>
            {branch !== undefined ? (
                <span className={styles.branch} title={t('worktreeCurrentBranch')}>
                    <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        aria-hidden="true">
                        <circle cx="4.5" cy="3" r="1.65" />
                        <circle cx="4.5" cy="13" r="1.65" />
                        <circle cx="11.5" cy="3" r="1.65" />
                        <path d="M4.5 4.7v6.6m7-6.6c0 4.2-7 1.7-7 6.6" />
                    </svg>
                    <span>{branch ?? t('worktreeDetached')}</span>
                </span>
            ) : null}
        </div>
    );
}
