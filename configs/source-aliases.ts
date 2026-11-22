import { resolve } from 'node:path';

/** Internal reuse always resolves source, never installed packages or generated declarations. */
export function getInternalSourceAliases(monorepoRoot: string): Record<string, string> {
    return {
        '@kalex/dsh-core': resolve(monorepoRoot, 'packages/dsh-core/src'),
        '@kalex/dsh-logger-core': resolve(monorepoRoot, 'packages/dsh-logger-core/src')
    };
}
