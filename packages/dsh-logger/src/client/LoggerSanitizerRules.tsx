import { CollectionAddButton, IconButton, TextField, TrashIcon } from '@kalex/dsh-core';
import type { SanitizerRules } from '../shared/index.ts';
import type { LoggerText } from '../shared/localization.ts';
import styles from './LoggerManagementPanel.module.css';
import { useLoggerSanitizerRules } from './useLoggerSanitizerRules.ts';

export interface LoggerSanitizerRulesProps {
    readonly rules: SanitizerRules | undefined;
    readonly onChange: (rules: SanitizerRules | undefined) => void;
    readonly text: LoggerText;
    readonly isGlobal?: boolean;
}

export function LoggerSanitizerRules(props: LoggerSanitizerRulesProps): React.JSX.Element {
    const { rules, text, isGlobal } = props;
    const { rowIds, update, add, remove } = useLoggerSanitizerRules(props);
    return (
        <div className={styles.rules}>
            <h3>{text('sanitizer')}</h3>
            <p className={styles.muted}>{text(isGlobal ? 'sanitizerGlobal' : 'sanitizerInherited')}</p>
            <div className={styles.grid}>
                {(['keys', 'paths'] as const).map(kind => (
                    <section className={styles.collection} key={kind}>
                        <details>
                            <summary>
                                <h3>{text(kind === 'keys' ? 'sanitizerKeys' : 'sanitizerPaths')}</h3>
                            </summary>
                            <small>{text(kind === 'keys' ? 'keysHelp' : 'pathsHelp')}</small>
                            {rowIds[kind].map((id, index) => (
                                <div className={styles.rule} key={id}>
                                    <TextField
                                        className={styles.input}
                                        id={id}
                                        value={rules?.[kind]?.[index] ?? ''}
                                        onChange={value =>
                                            update(
                                                kind,
                                                (rules?.[kind] ?? []).map((item, position) => (position === index ? value : item))
                                            )
                                        }
                                    />
                                    <IconButton size="small" variant="danger" tooltip={text('remove')} onClick={() => remove(kind, index)}>
                                        <TrashIcon />
                                    </IconButton>
                                </div>
                            ))}
                            {!rules?.[kind]?.length ? <small>{text('noRules')}</small> : null}
                            <CollectionAddButton onClick={() => add(kind)}>
                                {text(kind === 'keys' ? 'addKey' : 'addPath')}
                            </CollectionAddButton>
                        </details>
                    </section>
                ))}
            </div>
        </div>
    );
}
