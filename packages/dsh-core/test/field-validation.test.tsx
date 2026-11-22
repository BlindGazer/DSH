// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TextField } from '../src/components/TextField/TextField.tsx';
import { ThemedSelect } from '../src/components/ThemedSelect/ThemedSelect.tsx';

const onChange = () => undefined;
const options = [{ value: 'http', label: 'HTTP' }];
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
});

afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
});

it('keeps the native TextField as the layout item when validation is not enabled', () => {
    act(() => root.render(<TextField id="host" value="" onChange={onChange} />));

    expect(host.firstElementChild).toBe(host.querySelector('input#host'));
    expect(host.querySelector('[data-invalid]')).toBeNull();
});

it.each([
    ['TextField', (error?: string) => <TextField id="field" value="" onChange={onChange} error={error} />],
    ['ThemedSelect', (error?: string) => <ThemedSelect id="field" value="http" options={options} onChange={onChange} error={error} />]
] as const)('shows and clears the %s error below the same focusable control', (_name, field) => {
    act(() => root.render(field()));
    const control = host.querySelector<HTMLElement>('#field');
    if (!control) throw new Error('Missing field control');
    control.focus();
    expect(control.nextElementSibling).toBeNull();

    act(() => root.render(field('Check this value')));

    expect(control.dataset.invalid).toBe('true');
    expect(control.nextElementSibling?.textContent).toBe('Check this value');
    expect(document.activeElement).toBe(control);

    act(() => root.render(field()));

    expect(control.dataset.invalid).toBeUndefined();
    expect(control.nextElementSibling).toBeNull();
    expect(document.activeElement).toBe(control);
});
