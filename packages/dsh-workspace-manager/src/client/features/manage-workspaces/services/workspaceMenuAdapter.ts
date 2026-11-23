import type { WorkspaceEditTarget } from '../models/WorkspaceEditTarget.ts';

export interface WorkspaceMenuActions {
    readonly label: () => string;
    readonly nativeRenameLabel: () => string;
    readonly subscribe: (listener: () => void) => () => void;
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
    readonly detach: () => void;
    readonly restore: () => void;
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
            contribution.detach();
            contributed.delete(button);
        }
        if (active === undefined || !active.anchor.isConnected || active.menu !== undefined) return;

        const menu = [...doc.querySelectorAll('[role="menu"]')].find(node => !active?.before.has(node));
        if (menu === undefined) return;
        active.menu = menu;

        const nativeRows = menu.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]');
        const rename = [...nativeRows].find(button => button.textContent?.trim() === actions.nativeRenameLabel());
        const wrapper = rename?.parentElement ?? undefined;
        // Переиспользуем строку переименования, чтобы не создавать дублирующий пункт меню.
        if (
            nativeRows.length < 2 ||
            rename === undefined ||
            wrapper === undefined ||
            wrapper.parentElement?.getAttribute('role') !== 'presentation'
        )
            return;

        const findLabel = () =>
            [...rename.querySelectorAll('span')].find(
                span => span.children.length === 0 && span.textContent?.trim() === actions.nativeRenameLabel()
            );
        let label = findLabel();
        if (!(label?.firstChild instanceof Text)) return;

        const occurrence = active;
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

        const refresh = (): void => {
            if (!rename.isConnected) return;
            const text = actions.label();
            // Сохраняем текстовый узел, которым управляет React.
            if (label === undefined || !rename.contains(label)) label = findLabel();
            const node = label?.firstChild;
            if (node instanceof Text && node.data !== text) node.data = text;
            if (rename.getAttribute('aria-label') !== text) rename.setAttribute('aria-label', text);
        };

        wrapper.dataset.addirMenu = '';
        refresh();
        rename.addEventListener('click', onClick);
        const labelObserver = new MutationObserver(refresh);
        labelObserver.observe(rename, { childList: true, subtree: true, characterData: true, attributeFilter: ['aria-label'] });
        const unsubscribe = actions.subscribe(refresh);
        contributed.set(rename, {
            detach: () => {
                labelObserver.disconnect();
                unsubscribe();
                rename.removeEventListener('click', onClick);
            },
            restore: () => {
                const node = label?.firstChild;
                if (node instanceof Text) node.data = actions.nativeRenameLabel();
                if (originalAriaLabel === undefined) rename.removeAttribute('aria-label');
                else rename.setAttribute('aria-label', originalAriaLabel);
                delete wrapper.dataset.addirMenu;
            }
        });
    });

    doc.addEventListener('click', capture, true);
    observer.observe(doc.body, { childList: true, subtree: true });

    return () => {
        if (disposed) return;
        disposed = true;
        doc.removeEventListener('click', capture, true);
        observer.disconnect();
        for (const contribution of contributed.values()) {
            contribution.detach();
            contribution.restore();
        }
        contributed.clear();
        active = undefined;
    };
}
