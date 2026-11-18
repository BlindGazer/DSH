import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'codex-modal-diagnostic.js');
const script = await readFile(scriptPath, 'utf8');

function createElement({ tagName, className = '', textContent = '', attributes = {}, parentElement }) {
    return {
        tagName: tagName.toUpperCase(),
        className,
        textContent,
        parentElement,
        getAttribute(name) {
            return attributes[name] || '';
        },
        getBoundingClientRect() {
            return { width: 760, height: 600, x: 120, y: 80 };
        },
        matches(selector) {
            return selector === `.${className}`;
        }
    };
}

function runDiagnostic({ titleText = 'OpenAI Codex' } = {}) {
    const html = createElement({ tagName: 'html' });
    const body = createElement({ tagName: 'body', parentElement: html });
    const modal = createElement({
        tagName: 'div',
        className: 'codex-modal',
        attributes: { role: 'dialog', 'aria-modal': 'true' },
        parentElement: body
    });
    const title = createElement({ tagName: 'div', textContent: titleText, parentElement: modal });
    const declarations = { 0: 'width', 1: 'max-width', length: 2 };
    const style = {
        ...declarations,
        getPropertyValue(property) {
            return property === 'width' ? '420px' : '760px';
        },
        getPropertyPriority() {
            return '';
        }
    };
    const messages = [];
    const document = {
        body: { textContent: titleText },
        documentElement: html,
        styleSheets: [
            {
                href: 'http://dsh.test/plugin.css?v=1',
                cssRules: [{ selectorText: '.codex-modal', style }]
            }
        ],
        querySelectorAll() {
            return [title];
        }
    };

    runInNewContext(script, {
        document,
        location: { href: 'http://dsh.test/' },
        innerWidth: 1669,
        innerHeight: 1368,
        getComputedStyle() {
            return {
                display: 'flex',
                position: 'fixed',
                boxSizing: 'border-box',
                width: '420px',
                minWidth: '0px',
                maxWidth: '760px',
                height: '600px',
                minHeight: '0px',
                maxHeight: '88vh',
                flex: '0 1 auto',
                flexBasis: 'auto',
                padding: '16px',
                margin: '0px',
                transform: 'none',
                zoom: '1'
            };
        },
        console: { log: value => messages.push(value) }
    });

    return messages;
}

describe('Codex modal diagnostic script', () => {
    it('prints a single ready-to-share text report with dimensions and matching CSS rules', () => {
        const messages = runDiagnostic();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain('[Codex CSS check] Заголовок: OpenAI Codex');
        expect(messages[0]).toContain('Окно браузера: 1669x1368');
        expect(messages[0]).toContain('width=420px min-width=0px max-width=760px');
        expect(messages[0]).toContain('plugin.css | .codex-modal | ancestors=0 | width: 420px; max-width: 760px');
        expect(messages[0]).not.toContain('[object Object]');
    });

    it('prints a useful text message when the title is not found', () => {
        const messages = runDiagnostic({ titleText: 'Other settings' });

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain('Текст "OpenAI Codex" не найден');
        expect(messages[0]).toContain('Документ: Other settings');
    });
});
