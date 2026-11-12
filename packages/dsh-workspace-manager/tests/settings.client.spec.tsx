// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AddirSettingsSection } from '../src/client/features/manage-workspaces/components/SettingsSection.js';
import type { UseWorkspaceSnapshot, WorkspaceSelector, WorkspaceSnapshot } from '../src/client/models/WorkspaceManagerClientContext.js';
import { ru } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.js';

vi.mock('../src/client/features/manage-workspaces/services/addirApi.js', () => ({
    fetchGlobalConfig: vi.fn(async () => ({ enableTools: false, enableContextInjection: true, enforceReadOnly: true })),
    saveGlobalConfig: vi.fn(async () => undefined)
}));
afterEach(cleanup);

describe('settings editor fallback', () => {
    it('opens the selected workspace editor from the settings section', async () => {
        const snapshot: WorkspaceSnapshot = {
            items: [{ workspaceId: 'one', title: 'Project One', path: '/one', sessionIds: [], createdAt: '', updatedAt: '' }]
        };
        const useWorkspaces: UseWorkspaceSnapshot = <Selected,>(selector: WorkspaceSelector<Selected>): Selected => selector(snapshot);
        const openEdit = vi.fn();
        render(
            <AddirSettingsSection
                t={key => ru[key]}
                useWorkspaces={useWorkspaces}
                openEdit={openEdit}
            />
        );
        await screen.findByRole('switch', { name: /Контекст каталогов/ });
        expect(screen.getByText('Project One')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Изменить' }));
        expect(openEdit).toHaveBeenCalledWith('one');
    });
});
