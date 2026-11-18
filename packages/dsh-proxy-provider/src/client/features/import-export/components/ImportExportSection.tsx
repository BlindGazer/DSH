import { type ProxyClientSnapshot, tProxy } from '../../../app/proxyStore.js';
import { proxyClasses } from '../../../app/proxyStyles.js';

import type { ImportExportHandlersState } from '../hooks/useImportExportHandlers.js';

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
                    <label
                        className={proxyClasses('checkboxRow')}
                        style={{ fontSize: '12px', marginRight: '2px' }}
                        title={tProxy(
                            'When checked, Export will ask for a password and include encrypted login & password for portable transfer to another computer'
                        )}>
                        <input
                            type="checkbox"
                            checked={exportWithCreds}
                            onChange={event => {
                                setExportWithCreds(event.target.checked);
                                if (!event.target.checked) setExportPasswordPromptOpen(false);
                            }}
                        />
                        <span>{tProxy('Include credentials')}</span>
                    </label>
                    <button
                        type="button"
                        className={proxyClasses('button', 'buttonSmall')}
                        onClick={() => {
                            handleExportClick().catch(() => {});
                        }}
                        title={tProxy(
                            exportWithCreds
                                ? 'Export proxy settings and password-encrypted credentials'
                                : 'Export proxy settings without credentials'
                        )}>
                        {tProxy('Export')}
                    </button>
                    <button
                        type="button"
                        className={proxyClasses('button', 'buttonSmall')}
                        onClick={() => fileInputRef.current?.click?.()}
                        title={tProxy('Import proxy profiles and routing from JSON file')}>
                        {tProxy('Import')}
                    </button>
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
                            className={proxyClasses('button', 'buttonPrimary')}
                            onClick={() => {
                                handleConfirmEncryptedExport().catch(() => {});
                            }}>
                            {tProxy('Download Export')}
                        </button>
                        <button
                            type="button"
                            className={proxyClasses('button')}
                            onClick={() => {
                                setExportPasswordPromptOpen(false);
                                setExportPassword('');
                            }}>
                            {tProxy('Cancel')}
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
                            className={proxyClasses('button', 'buttonPrimary')}
                            onClick={() => {
                                handleConfirmEncryptedImport(false).catch(() => {});
                            }}>
                            {tProxy('Decrypt & Import')}
                        </button>
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
                    </div>
                </div>
            ) : undefined}
        </>
    );
}
