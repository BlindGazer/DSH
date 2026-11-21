import { Spinner } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.js';
import styles from './codexStyles.module.scss';

export interface CodexLoginProgressProps {
    readonly text: (key: OpenAICodexText) => string;
}

export function CodexLoginProgress({ text }: CodexLoginProgressProps) {
    return (
        <div className={styles.card} aria-busy="true">
            <div className={styles.header}>
                <Spinner label={text('signingIn')} />
                <h3>{text('signingIn')}</h3>
            </div>
            <p>{text('signingInHint')}</p>
        </div>
    );
}
