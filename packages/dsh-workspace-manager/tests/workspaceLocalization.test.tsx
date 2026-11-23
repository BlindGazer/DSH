// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkspaceAddirModal } from '../src/client/features/manage-workspaces/components/WorkspaceAddirModal.tsx';
import { installWorkspaceMenu } from '../src/client/features/manage-workspaces/services/workspaceMenuAdapter.ts';
import { en, ru } from '../src/shared/constants/localizations/WorkspaceManagerLocalization.ts';

const target = { workspaceId: 'project', displayTitle: 'Project', path: '/projects/repo' };

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('translates the same open menu item and releases the subscription on close and disposal', async () => {
    const fixture = document.createElement('div');
    fixture.innerHTML = '<div data-row-key="workspace:project"><button>Actions</button></div>';
    document.body.append(fixture);
    const anchor = screen.getByRole('button', { name: 'Actions' });
    const listeners = new Set<() => void>();
    let copy = en.edit as string;
    let native = 'Rename';
    const dispose = installWorkspaceMenu(document, {
        label: () => copy,
        nativeRenameLabel: () => native,
        subscribe: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        resolve: () => target,
        open: vi.fn()
    });
    const open = () => {
        fireEvent.click(anchor);
        const menu = document.createElement('div');
        menu.setAttribute('role', 'menu');
        menu.innerHTML = '<div role="presentation"><div><button role="menuitem"><span></span></button></div><button role="menuitem">Remove</button></div>';
        menu.querySelector('span')?.append(native);
        fixture.append(menu);
        return menu;
    };

    try {
        expect(listeners.size).toBe(0);
        const menu = open();
        const item = await screen.findByRole('menuitem', { name: en.edit });
        expect(item.textContent).toBe(en.edit);
        expect(listeners.size).toBe(1);

        copy = ru.edit;
        native = 'Переименовать';
        for (const listener of listeners) listener();
        const label = item.querySelector('span');
        if (label === null) throw new Error('Expected native label element');
        label.replaceChildren(native);
        item.setAttribute('aria-label', native);
        await waitFor(() => expect(item.textContent).toBe(ru.edit));
        expect(screen.getByRole('menuitem', { name: ru.edit })).toBe(item);
        expect(item.getAttribute('aria-label')).toBe(ru.edit);

        menu.remove();
        await waitFor(() => expect(listeners.size).toBe(0));
        open();
        const reopened = await screen.findByRole('menuitem', { name: ru.edit });
        expect(listeners.size).toBe(1);
        dispose();
        dispose();
        expect(listeners.size).toBe(0);
        expect(reopened.textContent).toBe(native);
        expect(reopened.getAttribute('aria-label')).toBeNull();
    } finally {
        dispose();
        fixture.remove();
    }
});

it('keeps the directory editor and its draft when the slot supplies a new translator', async () => {
    const fetch = vi.fn(async () => Response.json({ directories: [] }));
    vi.stubGlobal('fetch', fetch);
    const props = { target, onClose: vi.fn(), rename: vi.fn(), removeWorkspace: vi.fn(), pick: vi.fn() };
    const { rerender } = render(<WorkspaceAddirModal {...props} t={key => en[key]} />);
    await screen.findByRole('button', { name: en.add });
    const title = screen.getByText(en.title);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Unsaved draft' } });

    rerender(<WorkspaceAddirModal {...props} t={key => ru[key]} />);

    expect(screen.getByText(ru.title)).toBe(title);
    expect(screen.getByDisplayValue('Unsaved draft')).toBe(input);
    expect(screen.getByRole('button', { name: ru.add })).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
});
