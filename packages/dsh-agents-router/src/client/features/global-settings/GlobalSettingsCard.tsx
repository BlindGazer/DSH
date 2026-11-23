import {
    buildCoreThemeStyles,
    type DshLocalizedSlotProps,
    Spinner,
    SwitchControl,
    ThemedSelect,
    useDshThemeRevision
} from '@kalex/dsh-core';
import type React from 'react';
import { useRef } from 'react';
import type { GlobalSettings } from '../../../shared/models/RouterModels.ts';
import { useEffectiveTheme } from '../../theme/useEffectiveTheme.ts';
import { useGlobalSettings } from './hooks/useGlobalSettings.ts';
import styles from './settingsStyles.module.scss';
import settingsStyleText from './settingsStyles.module.scss?inline';

export interface GlobalSettingsCardProps extends DshLocalizedSlotProps {
    isModal?: boolean;
    onClose?: () => void;
}

export function GlobalSettingsCard({ isModal = false, onClose, t }: GlobalSettingsCardProps): React.JSX.Element {
    const state = useGlobalSettings();
    const content = <GlobalSettingsContent t={t} state={state} isModal={isModal} {...(onClose ? { onClose } : {})} />;
    return isModal ? content : <SettingsRoot preference={state.settings?.theme ?? 'auto'}>{content}</SettingsRoot>;
}

export function SettingsRoot({ preference, children }: { preference: GlobalSettings['theme']; children: React.ReactNode }) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const effectiveTheme = useEffectiveTheme(preference, rootRef);
    const themeRevision = useDshThemeRevision();
    return (
        <div ref={rootRef} className={`ar-settings-root ${styles.scope}`} data-theme={effectiveTheme}>
            <style data-theme-revision={themeRevision}>{`${buildCoreThemeStyles()}\n${settingsStyleText}`}</style>
            {children}
        </div>
    );
}

function GlobalSettingsContent({ state, isModal, onClose, t }: GlobalSettingsCardProps & { state: ReturnType<typeof useGlobalSettings> }) {
    const { settings, notice, error, busy, update, resetDefaults, save } = state;

    if (!settings) {
        return (
            <div className="ar-settings-layout">
                {isModal ? <style>{settingsStyleText}</style> : undefined}
                <section id="agents-router-global-settings" className="ar-settings-card">
                    <h2>{t('router')}</h2>
                    {error ? <p>{error}</p> : <Spinner />}
                </section>
            </div>
        );
    }

    const onSave = (event: React.FormEvent): void => {
        event.preventDefault();
        void save(t('saved'));
    };

    return (
        <div className="ar-settings-layout">
            {isModal ? <style>{settingsStyleText}</style> : undefined}
            <section id="agents-router-global-settings" className="ar-settings-card">
                <div className="ar-settings-heading">
                    <div>
                        <h2>{t('globalSettings')}</h2>
                        <p>{t('settingsStorage')}</p>
                    </div>
                    <div className="ar-settings-header-right">
                        <span className="ar-settings-scope">{t('globalScope')}</span>
                        {isModal ? (
                            <button type="button" className="ar-btn ar-btn-sm" onClick={onClose}>
                                &#x2715; {t('close')}
                            </button>
                        ) : null}
                    </div>
                </div>
                <form onSubmit={onSave}>
                    <div className="ar-settings-row">
                        <span className="ar-settings-copy">
                            <strong>{t('theme')}</strong>
                            <small>{t('themeHint')}</small>
                        </span>
                        <ThemedSelect
                            value={settings.theme}
                            disabled={busy}
                            onChange={value => update('theme', value)}
                            options={[
                                { value: 'auto', label: t('autoTheme') },
                                { value: 'dark', label: t('dark') },
                                { value: 'light', label: t('light') }
                            ]}
                        />
                    </div>
                    <div className="ar-settings-row">
                        <span className="ar-settings-copy">
                            <strong>{t('polling')}</strong>
                            <small>{t('pollingHint')}</small>
                        </span>
                        <ThemedSelect
                            value={String(settings.pollingIntervalMs)}
                            disabled={busy}
                            onChange={value => {
                                if (value === '2000') update('pollingIntervalMs', 2000);
                                else if (value === '3000') update('pollingIntervalMs', 3000);
                                else if (value === '5000') update('pollingIntervalMs', 5000);
                                else if (value === '10000') update('pollingIntervalMs', 10000);
                            }}
                            options={[
                                { value: '2000', label: `2 ${t('seconds')}` },
                                { value: '3000', label: `3 ${t('seconds')}` },
                                { value: '5000', label: `5 ${t('seconds')}` },
                                { value: '10000', label: `10 ${t('seconds')}` }
                            ]}
                        />
                    </div>
                    <div className="ar-settings-row">
                        <span className="ar-settings-copy">
                            <strong id="ar-global-logging-label">{t('globalLogging')}</strong>
                            <small>{t('loggingHint')}</small>
                        </span>
                        <SwitchControl
                            checked={settings.globalLogging}
                            disabled={busy}
                            onChange={checked => update('globalLogging', checked)}
                        />
                    </div>
                    <div className="ar-settings-footer">
                        <div>
                            {error ? (
                                <span className="ar-settings-error">{error}</span>
                            ) : notice ? (
                                <span className="ar-settings-success">{notice}</span>
                            ) : null}
                        </div>
                        <div className="ar-settings-buttons">
                            <button className="ar-btn" type="button" disabled={busy} onClick={resetDefaults}>
                                {t('resetDefaults')}
                            </button>
                            <button className="ar-btn ar-settings-primary" type="submit" disabled={busy}>
                                {t('save')}
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    );
}
