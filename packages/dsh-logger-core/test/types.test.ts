import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const compiler = fileURLToPath(new URL('../../../node_modules/typescript/bin/tsc', import.meta.url));
const baseConfig = fileURLToPath(new URL('../../../configs/packages/dsh-logger-core/tsconfig.json', import.meta.url));
const fixture = fileURLToPath(new URL('./type-fixtures/context.ts', import.meta.url));

describe('logger-core external TypeScript contract', () => {
    it.each([false, true])('preserves JSON context types with exactOptionalPropertyTypes=%s', exactOptionalPropertyTypes => {
        const directory = mkdtempSync(join(tmpdir(), 'dsh-logger-core-types-'));
        try {
            const config = join(directory, 'tsconfig.json');
            writeFileSync(
                config,
                JSON.stringify({
                    extends: baseConfig,
                    compilerOptions: {
                        noEmit: true,
                        skipLibCheck: false,
                        module: 'NodeNext',
                        moduleResolution: 'NodeNext',
                        exactOptionalPropertyTypes
                    },
                    include: [],
                    files: [fixture]
                })
            );
            const result = spawnSync(process.execPath, [compiler, '-p', config, '--pretty', 'false'], { stdio: 'inherit' });
            expect(result.error).toBeUndefined();
            expect(result.status).toBe(0);
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
