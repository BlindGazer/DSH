import { Button, IconButton, Modal, RefreshIcon, SwitchControl, TextField, ThemedSelect, Tooltip } from '@kalex/dsh-core';
import type { LogLevel } from '@kalex/dsh-logger-core';

import { DEFAULT_LEVEL, DEFAULT_MAX_FILE_BYTES, type LoggerConfig, type LoggerPolicy } from '../shared/index.ts';
import { type LoggerText, loggerDictionaries } from '../shared/localization.ts';
import type { LoggerPathPreview } from '../shared/remote.ts';
import styles from './LoggerManagementPanel.module.css';
import panelCss from './LoggerManagementPanel.module.css?inline';
import { LoggerSanitizerRules } from './LoggerSanitizerRules.tsx';
import { useLoggerPanel } from './useLoggerPanel.ts';

export interface LoggerManagementPanelProps {
    readonly config: LoggerConfig;
    readonly savedConfig?: LoggerConfig;
    readonly resolvedPath?: string;
    readonly text?: LoggerText;
    readonly packageNames?: readonly string[];
    readonly onChange: (config: LoggerConfig) => void;
    readonly onSave?: (config: LoggerConfig) => void;
    readonly onEdit?: () => void;
    readonly onReload?: () => void;
    readonly busy?: boolean;
    readonly loading?: boolean;
    readonly onPathChange?: (path: string) => boolean;
    readonly pathSummary?: { readonly controlled: number; readonly unknown: number };
    readonly onPreviewPath?: (path: string) => void;
    readonly pathPreview?: LoggerPathPreview;
    readonly pathError?: string;
    readonly pathPreviewStatus?: 'idle' | 'loading' | 'ready' | 'error';
    readonly previewDraft?: string;
}
const MIB = 1048576;

export function LoggerManagementPanel(props: LoggerManagementPanelProps): React.JSX.Element {
    const text: LoggerText = props.text ?? (key => loggerDictionaries.en[key]);
    const state = useLoggerPanel(props);
    const level = props.config.level ?? DEFAULT_LEVEL;
    const limit = props.config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
    const levelOptions = (['debug', 'info', 'warn', 'error'] as const).map(value => ({
        value,
        label: text(value === 'error' ? 'levelError' : value)
    }));
    const setPlugin = (name: string, policy: LoggerPolicy): void =>
        props.onChange({ ...props.config, plugins: { ...props.config.plugins, [name]: policy } });
    const names = props.packageNames ?? Object.keys(props.config.plugins ?? {});
    const visible = names.filter(name => name.toLowerCase().includes(state.search.toLowerCase()));
    return (
        <form
            className={styles.panel}
            noValidate
            onSubmit={event => {
                event.preventDefault();
                state.submit();
            }}>
            <style>{panelCss}</style>
            <div className={styles.body}>
                <section>
                    <div className={styles.row}>
                        <h2>{text('globalSettings')}</h2>
                        <Tooltip triggerElement="span" content={text('globalGate')} side="bottom" align="end">
                            <SwitchControl
                                checked={props.config.enabled}
                                onChange={enabled => props.onChange({ ...props.config, enabled })}
                            />
                        </Tooltip>
                    </div>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            {text('defaultLevel')}
                            <ThemedSelect<LogLevel>
                                value={level}
                                fullWidth
                                menuClassName={styles.levelMenu}
                                options={levelOptions}
                                onChange={value => props.onChange({ ...props.config, level: value })}
                            />
                        </div>
                        <div className={styles.field}>
                            {text('maxFileMiB')}
                            <TextField
                                className={styles.input}
                                type="number"
                                id={state.limitId}
                                error={state.invalidLimit(limit) ? text('limitError') : undefined}
                                value={String(limit / MIB)}
                                onChange={value => props.onChange({ ...props.config, maxFileBytes: Math.round(Number(value) * MIB) })}
                            />
                            <small>{text('fileLimitHelp')}</small>
                        </div>
                    </div>
                    <div className={styles.field}>
                        {text('pathLabel')}
                        <TextField
                            className={styles.input}
                            id={state.pathId}
                            error={state.pathError}
                            value={state.pathDraft}
                            onChange={value => {
                                props.onEdit?.();
                                state.setPathDraft(value);
                            }}
                        />
                        {state.checkingPath ? <small>{text('previewLoading')}</small> : null}
                        {props.resolvedPath ? (
                            <small>
                                {text('path')}: <code>{props.resolvedPath}</code>
                            </small>
                        ) : null}
                    </div>
                    <LoggerSanitizerRules
                        rules={props.config.sanitizer}
                        isGlobal
                        text={text}
                        onChange={sanitizer => {
                            const { sanitizer: _removed, ...rest } = props.config;
                            props.onChange(sanitizer ? { ...rest, sanitizer } : rest);
                        }}
                    />
                </section>
                <section>
                    <h2>{text('connectedPlugins')}</h2>
                    <p className={styles.muted}>
                        {names.length} {text('connected')} · {names.filter(name => props.config.plugins?.[name]?.enabled !== false).length}{' '}
                        {text('enabledCount')}
                    </p>
                    {!props.config.enabled ? <p className={styles.muted}>{text('globalDisabled')}</p> : null}
                    <div className={styles.field}>
                        {text('search')}
                        <TextField className={styles.input} value={state.search} onChange={state.setSearch} />
                    </div>
                    {visible.map(name => {
                        const policy = props.config.plugins?.[name] ?? { enabled: true };
                        const expanded = state.expanded.includes(name);
                        const overrides: string[] = [];
                        if (policy.level !== undefined) {
                            overrides.push(levelOptions.find(option => option.value === policy.level)?.label ?? policy.level);
                        }
                        if (policy.maxFileBytes !== undefined) {
                            overrides.push(`${policy.maxFileBytes / MIB} ${text('mib')}`);
                        }
                        if (policy.sanitizer?.keys?.some(key => key.trim()) || policy.sanitizer?.paths?.some(path => path.trim())) {
                            overrides.push(text('sanitizer'));
                        }
                        return (
                            <article className={styles.plugin} key={name}>
                                <div className={styles.row}>
                                    <div>
                                        <h3>
                                            <code>{name}</code>
                                        </h3>
                                    </div>
                                    <div className={styles.actions}>
                                        <SwitchControl
                                            checked={policy.enabled}
                                            onChange={enabled => setPlugin(name, { ...policy, enabled })}
                                        />
                                        <IconButton
                                            size="small"
                                            variant="neutral"
                                            tooltip={text(expanded ? 'collapse' : 'configure')}
                                            onClick={() => state.toggle(name)}>
                                            <svg
                                                width={14}
                                                height={14}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round">
                                                <path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                                            </svg>
                                        </IconButton>
                                    </div>
                                </div>
                                {overrides.length > 0 ? (
                                    <p className={styles.summary}>
                                        {text('overridden')}: {overrides.join(', ')}
                                    </p>
                                ) : null}
                                {expanded ? (
                                    <div className={styles.pluginBody}>
                                        <div className={styles.grid}>
                                            <div className={styles.field}>
                                                {text('level')}
                                                <ThemedSelect<LogLevel | 'inherit'>
                                                    value={policy.level ?? 'inherit'}
                                                    fullWidth
                                                    menuClassName={styles.levelMenu}
                                                    options={[
                                                        {
                                                            value: 'inherit',
                                                            label: `${text('globalLevel')}: ${levelOptions.find(option => option.value === level)?.label ?? level}`
                                                        },
                                                        ...levelOptions
                                                    ]}
                                                    onChange={value => {
                                                        const { level: _removed, ...rest } = policy;
                                                        setPlugin(name, value === 'inherit' ? rest : { ...rest, level: value });
                                                    }}
                                                />
                                            </div>
                                            <div className={styles.field}>
                                                {text('pluginFileMiB')}
                                                <TextField
                                                    className={styles.input}
                                                    type="number"
                                                    id={state.pluginLimitId(name)}
                                                    error={state.invalidLimit(policy.maxFileBytes) ? text('limitError') : undefined}
                                                    value={policy.maxFileBytes === undefined ? '' : String(policy.maxFileBytes / MIB)}
                                                    placeholder={String(limit / MIB)}
                                                    onChange={value => {
                                                        const { maxFileBytes: _removed, ...rest } = policy;
                                                        setPlugin(
                                                            name,
                                                            value === '' ? rest : { ...rest, maxFileBytes: Math.round(Number(value) * MIB) }
                                                        );
                                                    }}
                                                />
                                                <small>
                                                    {text('emptyInherits')} {limit / MIB} {text('mib')}
                                                </small>
                                            </div>
                                        </div>
                                        <LoggerSanitizerRules
                                            rules={policy.sanitizer}
                                            text={text}
                                            onChange={sanitizer => {
                                                const { sanitizer: _removed, ...rest } = policy;
                                                setPlugin(name, sanitizer ? { ...rest, sanitizer } : rest);
                                            }}
                                        />
                                        <div className={styles.actions}>
                                            <Button onClick={() => setPlugin(name, { enabled: policy.enabled })}>
                                                {text('resetOverrides')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                    {!visible.length ? <p className={styles.muted}>{text('noPlugins')}</p> : null}
                </section>
            </div>
            <footer className={styles.footer}>
                {props.busy || props.loading || state.dirty ? (
                    <small>{text(props.busy ? 'saving' : props.loading ? 'loading' : 'dirty')}</small>
                ) : null}
                <div className={styles.actions}>
                    {props.onReload ? (
                        <IconButton
                            variant="neutral"
                            tooltip={text('reload')}
                            disabled={props.busy === true || props.loading === true}
                            onClick={state.reload}>
                            <RefreshIcon />
                        </IconButton>
                    ) : null}
                    <Button disabled={!state.dirty || props.busy === true || props.loading === true} onClick={state.cancel}>
                        {text('cancelChanges')}
                    </Button>
                    <Button type="submit" variant="primary" disabled={!state.dirty || props.busy === true || props.loading === true}>
                        {text('save')}
                    </Button>
                </div>
            </footer>
            <Modal
                open={state.reloadConfirming}
                onClose={state.cancelReload}
                title={text('reloadTitle')}
                closeLabel={text('close')}
                footer={
                    <div className={styles.actions}>
                        <Button onClick={state.cancelReload}>{text('cancel')}</Button>
                        <Button variant="danger" onClick={state.confirmReload}>
                            {text('confirmReload')}
                        </Button>
                    </div>
                }>
                <p>{text('reloadWarning')}</p>
            </Modal>
            <Modal
                open={state.confirming}
                onClose={state.cancelPath}
                title={text('pathTitle')}
                closeLabel={text('close')}
                cardClassName={styles.pathDialog}
                footer={
                    <div className={styles.actions}>
                        <Button onClick={state.cancelPath}>{text('cancel')}</Button>
                        <Button variant="danger" disabled={!state.previewReady} onClick={state.confirmPath}>
                            {text('confirmPath')}
                        </Button>
                    </div>
                }>
                <p>{text('pathWarning')}</p>
                <p>
                    {text('currentPath')}:{' '}
                    <code>{props.resolvedPath ?? props.savedConfig?.path ?? props.config.path ?? text('defaultPath')}</code>
                </p>
                <p>
                    {text('newPath')}: <code>{props.pathPreview?.path ?? state.pathDraft}</code>
                </p>
                {state.previewReady ? (
                    <>
                        <p>
                            {text('controlled')}: {props.pathPreview?.controlled}; {text('unknown')}: {props.pathPreview?.unknown}
                        </p>
                        <h3>{text('willDelete')}</h3>
                        <ul>
                            {props.pathPreview?.deleted.map(path => (
                                <li key={path}>
                                    <code>{path}</code>
                                </li>
                            ))}
                        </ul>
                        {!props.pathPreview?.deleted.length ? <p>{text('none')}</p> : null}
                        <h3>{text('willKeep')}</h3>
                        <ul>
                            {props.pathPreview?.preserved.map(path => (
                                <li key={path}>
                                    <code>{path}</code>
                                </li>
                            ))}
                        </ul>
                        {!props.pathPreview?.preserved.length ? <p>{text('none')}</p> : null}
                    </>
                ) : null}
            </Modal>
        </form>
    );
}
