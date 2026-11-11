import { type ProxyClientSnapshot, tProxy } from '../../../app/proxyStore.js';

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
                        className="kpp-checkbox-row"
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
                        className="kpp-btn kpp-btn-sm"
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
                        className="kpp-btn kpp-btn-sm"
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
            {snap?.error ? <div className="kpp-alert kpp-alert-err">{tProxy(snap.error)}</div> : undefined}
            {ioNotice ? (
                <div className={ioNotice.ok ? 'kpp-alert kpp-alert-ok' : 'kpp-alert kpp-alert-err'}>{tProxy(ioNotice.text)}</div>
            ) : undefined}
            {exportPasswordPromptOpen ? (
                <div className="kpp-form">
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{tProxy('Encrypt Credentials for Portable Export')}</div>
                    <div className="kpp-host-sub">
                        {tProxy('Enter a password to encrypt login & password (AES-256-GCM) so they can be imported on another computer:')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="password"
                            className="kpp-input"
                            placeholder={tProxy('Enter encryption password...')}
                            value={exportPassword}
                            onChange={event => setExportPassword(event.target.value)}
                        />
                        <button
                            type="button"
                            className="kpp-btn kpp-btn-primary"
                            onClick={() => {
                                handleConfirmEncryptedExport().catch(() => {});
                            }}>
                            {tProxy('Download Export')}
                        </button>
                        <button
                            type="button"
                            className="kpp-btn"
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
                <div className="kpp-form">
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{tProxy('Encrypted Credentials Detected in Import File')}</div>
                    <div className="kpp-host-sub">
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
                            className="kpp-input"
                            style={{ flex: '1 1 200px' }}
                            placeholder={tProxy('Enter decryption password...')}
                            value={importPassword}
                            onChange={event => setImportPassword(event.target.value)}
                        />
                        <button
                            type="button"
                            className="kpp-btn kpp-btn-primary"
                            onClick={() => {
                                handleConfirmEncryptedImport(false).catch(() => {});
                            }}>
                            {tProxy('Decrypt & Import')}
                        </button>
                        <button
                            type="button"
                            className="kpp-btn"
                            onClick={() => {
                                handleConfirmEncryptedImport(true).catch(() => {});
                            }}>
                            {tProxy('Import Without Credentials')}
                        </button>
                        <button
                            type="button"
                            className="kpp-btn"
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
