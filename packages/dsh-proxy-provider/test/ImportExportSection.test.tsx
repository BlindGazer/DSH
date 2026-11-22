import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    ImportExportSection,
    type ImportExportSectionProps
} from '../src/client/features/import-export/components/ImportExportSection.tsx';

function renderPrompt(prompt: Pick<ImportExportSectionProps, 'exportPasswordPromptOpen' | 'pendingImportPayload'>): string {
    return renderToStaticMarkup(
        <ImportExportSection
            placement="body"
            ioNotice={null}
            exportWithCreds={true}
            setExportWithCreds={() => {}}
            setExportPasswordPromptOpen={() => {}}
            exportPassword=""
            setExportPassword={() => {}}
            setPendingImportPayload={() => {}}
            importPassword=""
            setImportPassword={() => {}}
            fileInputRef={{ current: null }}
            handleExportClick={async () => {}}
            handleConfirmEncryptedExport={async () => {}}
            handleImportFileChange={async () => {}}
            handleConfirmEncryptedImport={async () => {}}
            {...prompt}
        />
    );
}

describe('ImportExportSection (encrypted transfer prompts)', () => {
    it.each([
        {
            name: 'export',
            prompt: { exportPasswordPromptOpen: true, pendingImportPayload: null },
            buttons: ['Cancel', 'Download Export']
        },
        {
            name: 'import',
            prompt: { exportPasswordPromptOpen: false, pendingImportPayload: { encryptedCredentials: true } },
            buttons: ['Import Without Credentials', 'Cancel', 'Decrypt &amp; Import']
        }
    ])('puts the primary $name action last', ({ prompt, buttons }) => {
        const markup = renderPrompt(prompt);

        expect(Array.from(markup.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g), match => match[1])).toStrictEqual(buttons);
    });
});
