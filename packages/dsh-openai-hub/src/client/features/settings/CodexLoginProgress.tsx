import { Spinner } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import styles from './codexStyles.module.scss';

export interface CodexLoginProgressProps {
    readonly text: (key: OpenAICodexText) => string;
}

export function CodexLoginProgress({ text }: CodexLoginProgressProps) {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <Spinner />
                <h3>{text('signingIn')}</h3>
            </div>
            <p>{text('signingInHint')}</p>
        </div>
    );
}
