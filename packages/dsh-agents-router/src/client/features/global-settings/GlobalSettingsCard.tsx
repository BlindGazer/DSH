import { buildCoreThemeStyles, Spinner, SwitchControl, ThemedSelect, useDshThemeRevision } from '@kalex/dsh-core';
import type React from 'react';
import { useRef } from 'react';
import { locales, resolveLocale } from '../../locales/index.js';
import { useEffectiveTheme } from '../../theme/useEffectiveTheme.js';
import { getHostLocale } from '../../utils/locale-context.js';
import { useGlobalSettings } from './hooks/useGlobalSettings.js';
import styles from './settingsStyles.module.scss';
import settingsStyleText from './settingsStyles.module.scss?inline';

export interface GlobalSettingsCardProps {
    isModal?: boolean;
    onClose?: () => void;
}

export function GlobalSettingsCard({ isModal = false, onClose }: GlobalSettingsCardProps): React.JSX.Element {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const { settings, notice, error, busy, update, resetDefaults, save } = useGlobalSettings();
    const effectiveTheme = useEffectiveTheme(settings?.theme ?? 'auto', rootRef);
    const themeRevision = useDshThemeRevision();
    const locale = resolveLocale(settings?.locale, getHostLocale());
    const t = (key: string): string => (locales[locale] as Record<string, string>)[key] ?? key;

    if (!settings) {
        return (
            <div ref={rootRef} className={`ar-settings-root ${styles.scope}`} data-theme={effectiveTheme}>
                <style data-theme-revision={themeRevision}>{`${buildCoreThemeStyles()}\n${settingsStyleText}`}</style>
                <section id="agents-router-global-settings" className="ar-settings-card">
                    <h2>{t('router')}</h2>
                    {error ? <p role="alert">{error}</p> : <Spinner />}
                </section>
            </div>
        );
    }

    const onSave = (event: React.FormEvent): void => {
        event.preventDefault();
        void save(t('saved'));
    };

    return (
        <div ref={rootRef} className={`ar-settings-root ${styles.scope}`} data-theme={effectiveTheme}>
            <style data-theme-revision={themeRevision}>{`${buildCoreThemeStyles()}\n${settingsStyleText}`}</style>
            <section id="agents-router-global-settings" className="ar-settings-card" aria-label={t('globalSettings')}>
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
                            <strong>{t('locale')}</strong>
                            <small>{t('localeHint')}</small>
                        </span>
                        <ThemedSelect
                            ariaLabel={t('locale')}
                            value={settings.locale}
                            disabled={busy}
                            onChange={value => update('locale', value)}
                            options={[
                                { value: 'auto', label: t('autoDsh') },
                                { value: 'ru', label: t('russian') },
                                { value: 'en', label: t('english') }
                            ]}
                        />
                    </div>
                    <div className="ar-settings-row">
                        <span className="ar-settings-copy">
                            <strong>{t('theme')}</strong>
                            <small>{t('themeHint')}</small>
                        </span>
                        <ThemedSelect
                            ariaLabel={t('theme')}
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
                            ariaLabel={t('polling')}
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
                            labelledBy="ar-global-logging-label"
                            checked={settings.globalLogging}
                            disabled={busy}
                            onChange={checked => update('globalLogging', checked)}
                        />
                    </div>
                    <div className="ar-settings-footer">
                        <div aria-live="polite">
                            {error ? (
                                <span className="ar-settings-error" role="alert">
                                    {error}
                                </span>
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
