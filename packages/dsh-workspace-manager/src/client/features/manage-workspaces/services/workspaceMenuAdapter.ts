import type { WorkspaceEditTarget } from '../models/WorkspaceEditTarget.js';

export interface WorkspaceMenuActions {
    readonly label: () => string;
    readonly resolve: (key: string) => WorkspaceEditTarget | undefined;
    readonly open: (target: WorkspaceEditTarget) => void;
}

interface ActiveWorkspaceMenu {
    readonly anchor: HTMLButtonElement;
    readonly key: string;
    readonly before: Set<Element>;
    menu?: Element;
}

interface WorkspaceMenuContribution {
    readonly wrapper: HTMLElement;
    readonly label: HTMLSpanElement;
    readonly originalLabel: string;
    readonly originalAriaLabel: string | undefined;
    readonly onClick: (event: MouseEvent) => void;
}

function queryElement<T extends Element>(parent: Element, selector: string): T | undefined {
    return parent.querySelector<T>(selector) ?? undefined;
}

/**
 * Добавляет пункт редактирования в меню рабочего пространства без вмешательства в его другие действия.
 * @param doc Документ с элементами меню рабочего пространства.
 * @param actions Локализованная подпись, поиск рабочего пространства и открытие редактора.
 * @returns Функция, удаляющая обработчики, наблюдатель и добавленные изменения.
 */
export function installWorkspaceMenu(doc: Document, actions: WorkspaceMenuActions): () => void {
    let active: ActiveWorkspaceMenu | undefined;
    const contributed = new Map<HTMLButtonElement, WorkspaceMenuContribution>();
    let disposed = false;

    const capture = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLButtonElement>('button') ?? undefined;
        const row = button?.closest<HTMLElement>('[data-row-key^="workspace:"]') ?? undefined;
        if (button === undefined || row === undefined || button !== queryElement(row, 'button')) {
            if (active?.menu?.contains(event.target)) return;
            active = undefined;
            return;
        }
        const key = row.dataset.rowKey?.slice('workspace:'.length);
        if (key === undefined || actions.resolve(key) === undefined) {
            active = undefined;
            return;
        }
        active = { anchor: button, key, before: new Set(doc.querySelectorAll('[role="menu"]')) };
    };

    const observer = new MutationObserver(() => {
        for (const [button, contribution] of contributed) {
            if (button.isConnected) continue;
            button.removeEventListener('click', contribution.onClick);
            contributed.delete(button);
        }
        if (active === undefined || !active.anchor.isConnected || active.menu !== undefined) return;

        const menu = [...doc.querySelectorAll('[role="menu"]')].find(node => !active?.before.has(node));
        if (menu === undefined) return;
        active.menu = menu;

        const nativeRows = menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]');
        const rename = nativeRows.item(0) ?? undefined;
        const wrapper = rename?.parentElement ?? undefined;
        // Переиспользуем строку переименования, чтобы не создавать дублирующий пункт меню.
        if (
            nativeRows.length < 2 ||
            rename === undefined ||
            wrapper === undefined ||
            wrapper.parentElement?.getAttribute('role') !== 'presentation'
        )
            return;

        const label = [...rename.querySelectorAll<HTMLSpanElement>('span')].find(
            span => span.children.length === 0 && span.textContent?.trim()
        );
        if (label === undefined) return;

        const occurrence = active;
        const originalLabel = label.textContent ?? '';
        const originalAriaLabel = rename.getAttribute('aria-label') ?? undefined;
        const onClick = (clickEvent: MouseEvent): void => {
            const target = actions.resolve(occurrence.key);
            if (target === undefined || !occurrence.anchor.isConnected) return;
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
            occurrence.anchor.click();
            queueMicrotask(() => {
                if (!disposed) actions.open(target);
            });
        };

        wrapper.dataset.addirMenu = '';
        label.textContent = actions.label();
        rename.setAttribute('aria-label', actions.label());
        rename.addEventListener('click', onClick);
        contributed.set(rename, { wrapper, label, originalLabel, originalAriaLabel, onClick });
    });

    doc.addEventListener('click', capture, true);
    observer.observe(doc.body, { childList: true, subtree: true });

    return () => {
        disposed = true;
        doc.removeEventListener('click', capture, true);
        observer.disconnect();
        for (const [button, contribution] of contributed) {
            button.removeEventListener('click', contribution.onClick);
            contribution.label.textContent = contribution.originalLabel;
            if (contribution.originalAriaLabel === undefined) button.removeAttribute('aria-label');
            else button.setAttribute('aria-label', contribution.originalAriaLabel);
            delete contribution.wrapper.dataset.addirMenu;
        }
        contributed.clear();
        active = undefined;
    };
}
