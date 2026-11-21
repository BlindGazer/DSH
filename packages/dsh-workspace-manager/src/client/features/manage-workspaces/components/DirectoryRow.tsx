import { Button, Checkbox } from '@kalex/dsh-core';
import type { Dispatch, SetStateAction } from 'react';
import type { Translate } from '../../../../shared/constants/localizations/WorkspaceManagerLocalization.js';
import { TestId } from '../../../../shared/constants/testId.js';
import type { ClientLinkedDirectory } from '../services/addirApi.js';
import { getPathBasename } from '../services/workspaceLabels.js';

interface DirectoryRowProps {
    readonly directory: ClientLinkedDirectory;
    readonly index: number;
    readonly busy: boolean;
    readonly setDirectories: Dispatch<SetStateAction<ClientLinkedDirectory[]>>;
    readonly t: Translate;
}

export function DirectoryRow({ directory, index, busy, setDirectories, t }: DirectoryRowProps) {
    return (
        <div className="addir-folder" data-testid={TestId.WorkspaceManager.DirectoryRow}>
            <div className="addir-folder-info">
                <span className="addir-folder-name">{directory.alias || getPathBasename(directory.path)}</span>
                <span className="addir-folder-path" title={directory.path}>
                    {directory.path}
                </span>
            </div>
            <div className="addir-folder-actions">
                <div className="addir-check">
                    <Checkbox
                        checked={directory.readOnly}
                        disabled={busy}
                        ariaLabel={t('readOnly')}
                        onChange={checked =>
                            setDirectories(rows => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, readOnly: checked } : row)))
                        }
                    />
                    {t('readOnly')}
                </div>
                <Button
                    ariaLabel={`${t('remove')}: ${directory.alias || directory.path}`}
                    title={t('remove')}
                    disabled={busy}
                    onClick={() => setDirectories(rows => rows.filter((_, rowIndex) => rowIndex !== index))}>
                    {t('remove')}
                </Button>
            </div>
        </div>
    );
}
