import { useEffect, useState } from 'react';
import type { DshThemeId, DshThemeMode, DshThemePreference } from '../models/DshContext.js';
import { getDshTheme } from '../theme/palettes.js';

interface RgbColor {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
}

interface RefLike {
    readonly current: Element | null;
}

const DEFAULT_IGNORED_ROOT_SELECTOR =
    '.dsh-core-root, .ar-root, .ar-settings-root, .kpp-root, .kpp-card-bar, .kpp-footer-row, .kpp-modal-backdrop, .kpp-locale-settings';

function parseRgb(value: string): RgbColor | undefined {
    const match = /rgba?\((\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\)/i.exec(value);
    if (!match?.[1] || !match[2] || !match[3]) return undefined;
    return {
        r: Number(match[1]),
        g: Number(match[2]),
        b: Number(match[3]),
        a: match[4] === undefined ? 1 : Number(match[4])
    };
}

function luminance({ r, g, b }: RgbColor): number {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Определяет активную тему оболочки DSH ('light' или 'dark') по DOM-атрибутам, классам и вычисленным цветам фона.
 */
export function detectHostTheme(anchorEl?: Element, ignoredSelector = DEFAULT_IGNORED_ROOT_SELECTOR): DshThemeMode {
    if (typeof document === 'undefined') return 'dark';
    const roots: Element[] = [];
    for (let element = anchorEl?.parentElement; element; element = element.parentElement) {
        if (!element.matches(ignoredSelector) && element.matches('[data-theme], [data-color-scheme], .dark, .light')) roots.push(element);
    }
    if (document.documentElement) roots.push(document.documentElement);
    if (document.body) roots.push(document.body);

    for (const element of roots) {
        const attrTheme = (
            element.getAttribute?.('data-theme') ||
            element.getAttribute?.('data-color-scheme') ||
            element.getAttribute?.('data-mode') ||
            ''
        ).toLowerCase();
        if (attrTheme === 'light' || attrTheme === 'dark') return attrTheme;
        if (element.classList?.contains('light')) return 'light';
        if (element.classList?.contains('dark')) return 'dark';
        const computedScheme = typeof getComputedStyle === 'function' ? getComputedStyle(element).colorScheme : '';
        if (computedScheme === 'light' || computedScheme === 'dark') return computedScheme;
    }

    const probe = anchorEl?.parentElement || document.body;
    if (probe && typeof getComputedStyle === 'function') {
        for (let element: Element | null = probe; element; element = element.parentElement) {
            const color = parseRgb(getComputedStyle(element).backgroundColor);
            if (color && color.a > 0.2) return luminance(color) > 140 ? 'light' : 'dark';
        }
        if (document.body) {
            const text = parseRgb(getComputedStyle(document.body).color);
            if (text) return luminance(text) < 100 ? 'light' : 'dark';
        }
    }
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark';
}

/**
 * Реактивный хук получения активной темы ('dark', 'light' или зарегистрированной пользовательской темы)
 * с подпиской на изменения темы оболочки DSH.
 */
export function useEffectiveTheme(preference: DshThemePreference = 'auto', rootRef?: RefLike): DshThemeId {
    const explicit = preference !== 'auto' && preference.trim() !== '' ? getDshTheme(preference).id : undefined;
    const [theme, setTheme] = useState<DshThemeId>(() => explicit ?? detectHostTheme());

    useEffect(() => {
        if (explicit) return undefined;
        const update = (): void => {
            setTheme(detectHostTheme(rootRef?.current ?? undefined));
        };
        const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(update);
        if (typeof document !== 'undefined') {
            for (const element of [document.documentElement, document.body].filter(Boolean)) {
                observer?.observe(element, {
                    attributes: true,
                    attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme', 'data-mode']
                });
            }
        }
        const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: light)') : undefined;
        media?.addEventListener?.('change', update);
        queueMicrotask(update);
        return () => {
            observer?.disconnect();
            media?.removeEventListener?.('change', update);
        };
    }, [explicit, rootRef]);

    return explicit ?? theme;
}
