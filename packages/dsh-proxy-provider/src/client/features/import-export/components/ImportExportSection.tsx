import { Checkbox, Tooltip } from '@kalex/dsh-core';
import { type ProxyClientSnapshot, tProxy } from '../../../app/proxyStore.ts';
import { proxyClasses } from '../../../app/proxyStyles.ts';

import type { ImportExportHandlersState } from '../hooks/useImportExportHandlers.ts';

export interface ImportExportSectionProps extends Omit<ImportExportHandlersState, 'resetForOpen'> {
    readonly placement: 'header' | 'body';
    readonly snap?: ProxyClientSnapshot;
}

/**
 * Секция кнопок и форм парольного экспорта/импорта настроек прокси.
 */
export function ImportExportSection(props: ImportExportSectionProps) {
    const {
        placement,
        fileInputRef,
        exportWithCreds,
        setExportWithCreds,
        setExportPasswordPromptOpen,
        handleExportClick,
        snap,
        ioNotice,
        exportPasswordPromptOpen,
        exportPassword,
        setExportPassword,
        handleConfirmEncryptedExport,
        pendingImportPayload,
        importPassword,
        setImportPassword,
        handleConfirmEncryptedImport,
        setPendingImportPayload
    } = props;

    if (placement === 'header') {
        return (
            <>
                <input
                    ref={el => {
                        fileInputRef.current = el;
                    }}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={e => {
                        props.handleImportFileChange(e).catch(() => {});
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap'
                    }}>
                    <Tooltip
                        content={tProxy(
                            'When checked, Export will ask for a password and include encrypted login & password for portable transfer to another computer'
                        )}
                        triggerElement="span">
                        <span className={proxyClasses('checkboxRow')} style={{ fontSize: '12px', marginRight: '2px' }}>
                            <Checkbox
                                checked={exportWithCreds}
                                onChange={checked => {
                                    setExportWithCreds(checked);
                                    if (!checked) setExportPasswordPromptOpen(false);
                                }}
                            />
                            <span>{tProxy('Include credentials')}</span>
                        </span>
                    </Tooltip>
                    <Tooltip
                        content={tProxy(
                            exportWithCreds
                                ? 'Export proxy settings and password-encrypted credentials'
                                : 'Export proxy settings without credentials'
                        )}
                        triggerElement="span">
                        <button
                            type="button"
                            className={proxyClasses('button', 'buttonSmall')}
                            onClick={() => {
                                handleExportClick().catch(() => {});
                            }}>
                            {tProxy('Export')}
                        </button>
                    </Tooltip>
                    <Tooltip content={tProxy('Import proxy profiles and routing from JSON file')} triggerElement="span">
                        <button
                            type="button"
                            className={proxyClasses('button', 'buttonSmall')}
                            onClick={() => fileInputRef.current?.click?.()}>
                            {tProxy('Import')}
                        </button>
                    </Tooltip>
                </div>
            </>
        );
    }

    return (
        <>
            {snap?.error ? <div className={proxyClasses('alert', 'alertError')}>{tProxy(snap.error)}</div> : undefined}
            {ioNotice ? (
                <div className={ioNotice.ok ? proxyClasses('alert', 'alertOk') : proxyClasses('alert', 'alertError')}>
                    {tProxy(ioNotice.text)}
                </div>
            ) : undefined}
            {exportPasswordPromptOpen ? (
                <div className={proxyClasses('form')}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{tProxy('Encrypt Credentials for Portable Export')}</div>
                    <div className={proxyClasses('hostSub')}>
                        {tProxy('Enter a password to encrypt login & password (AES-256-GCM) so they can be imported on another computer:')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="password"
                            className={proxyClasses('input')}
                            placeholder={tProxy('Enter encryption password...')}
                            value={exportPassword}
                            onChange={event => setExportPassword(event.target.value)}
                        />
                        <button
                            type="button"
                            className={proxyClasses('button')}
                            onClick={() => {
                                setExportPasswordPromptOpen(false);
                                setExportPassword('');
                            }}>
                            {tProxy('Cancel')}
                        </button>
                        <button
                            type="button"
                            className={proxyClasses('button', 'buttonPrimary')}
                            onClick={() => {
                                handleConfirmEncryptedExport().catch(() => {});
                            }}>
                            {tProxy('Download Export')}
                        </button>
                    </div>
                </div>
            ) : undefined}
            {pendingImportPayload ? (
                <div className={proxyClasses('form')}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{tProxy('Encrypted Credentials Detected in Import File')}</div>
                    <div className={proxyClasses('hostSub')}>
                        {tProxy('Enter the password used when exporting this file to decrypt and restore login & password:')}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}>
                        <input
                            type="password"
                            className={proxyClasses('input')}
                            style={{ flex: '1 1 200px' }}
                            placeholder={tProxy('Enter decryption password...')}
                            value={importPassword}
                            onChange={event => setImportPassword(event.target.value)}
                        />
                        <button
                            type="button"
                            className={proxyClasses('button')}
                            onClick={() => {
                                handleConfirmEncryptedImport(true).catch(() => {});
                            }}>
                            {tProxy('Import Without Credentials')}
                        </button>
                        <button
                            type="button"
                            className={proxyClasses('button')}
                            onClick={() => {
                                setPendingImportPayload(null);
                                setImportPassword('');
                            }}>
                            {tProxy('Cancel')}
                        </button>
                        <button
                            type="button"
                            className={proxyClasses('button', 'buttonPrimary')}
                            onClick={() => {
                                handleConfirmEncryptedImport(false).catch(() => {});
                            }}>
                            {tProxy('Decrypt & Import')}
                        </button>
                    </div>
                </div>
            ) : undefined}
        </>
    );
}
