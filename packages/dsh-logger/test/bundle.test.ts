import { readFileSync } from 'node:fs';
import type { InvocationDescriptor } from '@deepseek-ai/dsh-typert-protocol';
import { describe, expect, it } from 'vitest';
import { TYPERT_REMOTE } from '../src/shared/remote.ts';

interface BundleManifest {
    readonly dsh: { readonly bundle: { readonly patch: string } };
    readonly exports: Readonly<Record<'./host' | './remote' | './typert', { readonly default: string }>>;
    readonly files: readonly string[];
    readonly scripts: Readonly<Record<string, string>>;
}

const packageRoot = new URL('../', import.meta.url);
const manifest: BundleManifest = JSON.parse(readFileSync(new URL('package.json', packageRoot), 'utf8'));

describe('installable DSH bundle', () => {
    it('emits a ModuleLoader client entry with settings registration', () => {
        const client = readFileSync(new URL('lib/client.js', packageRoot), 'utf8');
        expect(client).toContain('window.__ModuleLoader__.load');
        expect(client).toContain('@kalex/dsh-logger');
        expect(client).toContain('settings.section');
        expect(client).toContain('remote.loggerSettings');
    });
    it('imports the built Host entry without a TypeScript transform', async () => {
        const hostUrl = new URL('lib/host.js', packageRoot).href;
        const host = await import(/* @vite-ignore */ hostUrl);
        expect(typeof host.apply).toBe('function');
    });
    it('ships the Host Typert manifest through the declared package export', async () => {
        const artifactUrl = new URL(manifest.exports['./typert'].default, packageRoot).href;
        const artifact = await import(/* @vite-ignore */ artifactUrl);

        expect(artifact.TYPERT).toMatchObject({
            package: '@kalex/dsh-logger',
            face: 'host',
            schemas: [],
            model: { services: [], events: [], objects: [] }
        });
        expect(artifact.TYPERT.invocations).toBe(artifact.TYPERT_REMOTE.descriptors);
        expect(artifact.TYPERT.invocations.map((row: InvocationDescriptor) => row.method)).toStrictEqual(['read', 'save', 'previewPath']);
    });
    it.each(['save', 'previewPath'])('keeps the built %s Host and Client wire parameters identical', async method => {
        const artifactUrl = new URL(manifest.exports['./typert'].default, packageRoot).href;
        const artifact = await import(/* @vite-ignore */ artifactUrl);
        const descriptor = artifact.TYPERT.invocations.find((row: InvocationDescriptor) => row.method === method);

        expect(
            descriptor?.parameters.map(({ name, wire, source }: InvocationDescriptor['parameters'][number]) => ({ name, wire, source }))
        ).toStrictEqual(
            TYPERT_REMOTE.descriptors
                .find(row => row.method === method)
                ?.parameters.map(({ name, wire, source }) => ({ name, wire, source }))
        );
        expect(descriptor?.parameters).toEqual([expect.objectContaining({ name: 'input', wire: 'input', source: 'json' })]);
    });
    it.each(['./remote', './typert'] as const)('exports only the runtime entry for %s', subpath => {
        expect(manifest.exports[subpath]).toEqual({ default: './lib/remote.js' });
    });
    it('declares and ships the Loader patch', () => {
        expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml');
        expect(manifest.files).toContain('cordis.patch.yml');
        const patch = readFileSync(new URL(manifest.dsh.bundle.patch, packageRoot), 'utf8');
        expect(patch).toContain("name: '@kalex/dsh-logger'");
        expect(patch).toContain('enabled: false');
        expect(patch).toContain('maxFileBytes: 10485760');
    });

    it('exports a dedicated Host entry rather than a package-manager script', () => {
        expect(manifest.exports['./host']).toEqual({
            default: './lib/host.js'
        });
        expect(manifest.files).toContain('lib');
        expect(manifest.scripts.cordis).toBeUndefined();
    });
});
