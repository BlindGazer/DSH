import { type DshActiveLocale, type DshTranslate, useEffectiveTheme } from '@kalex/dsh-core';
import type { OpenAICodexText } from '../../../shared/constants/localizations/OpenAICodexLocalization.ts';
import { TestId } from '../../../shared/constants/testId.ts';
import { CodexModelsAccountEntry } from './CodexModelsAccountEntry.tsx';
import { CodexSettingsPanel } from './CodexSettingsPanel.tsx';
import styles from './codexFooterStyles.module.scss';
import { useCodexModelsFooterEntry } from './hooks/useCodexModelsFooterEntry.ts';
import type { OpenAICodexController } from './openAICodexRuntime.ts';
export interface CodexModelsFooterEntryProps {
    readonly controller: OpenAICodexController;
    readonly locale: DshActiveLocale;
    readonly text: DshTranslate<OpenAICodexText>;
}
export function CodexModelsFooterEntry({ controller, locale, text }: CodexModelsFooterEntryProps) {
    const theme = useEffectiveTheme();
    const panel = useCodexModelsFooterEntry(controller);
    return (
        <div className={`dsh-core-root ${styles.footer}`} data-theme={theme} data-testid={TestId.OpenAIHub.ModelsFooter}>
            {panel.accounts.map(account => (
                <CodexModelsAccountEntry
                    key={account.accountLabel}
                    account={account}
                    controller={controller}
                    locale={locale}
                    text={text}
                    open={panel.openAccountLabel === account.accountLabel}
                    autoRefreshBusy={panel.autoRefreshPendingLabel === account.accountLabel}
                    autoRefreshError={panel.autoRefreshErrorLabel === account.accountLabel}
                    accountActionPending={panel.accountActionPendingLabel === account.accountLabel}
                    accountActionError={panel.accountActionErrorLabel === account.accountLabel}
                    deleteConfirmOpen={panel.deleteConfirmLabel === account.accountLabel}
                    reauthenticationPending={panel.reauthenticateAccount?.accountLabel === account.accountLabel}
                    onAutoRefreshChange={enabled => void panel.setAutoRefreshLimits(account.accountLabel, enabled)}
                    onSignIn={() => panel.reauthenticate(account)}
                    onDelete={() => panel.requestDeleteAccount(account.accountLabel)}
                    onCancelDelete={panel.cancelDeleteAccount}
                    onConfirmDelete={() => void panel.confirmDeleteAccount(account.accountLabel)}
                    onOpen={() => panel.setOpenAccountLabel(account.accountLabel)}
                    onClose={() => panel.setOpenAccountLabel('')}
                />
            ))}
            <CodexSettingsPanel
                controller={controller}
                text={text}
                {...(panel.reauthenticateAccount ? { reauthenticateAccount: panel.reauthenticateAccount } : {})}
                onReauthenticationClose={panel.clearReauthenticate}
            />
        </div>
    );
}
