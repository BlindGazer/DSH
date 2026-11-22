import { describe, expect, it } from 'vitest';
import { getReleaseViolation } from './release-content-policy.ts';

describe('release contents', () => {
    it.each([
        ['lib/index.js.map', ''],
        ['lib/index.d.ts.map', ''],
        ['lib/index.js', 'export {}; //# sourceMappingURL=data:application/json;base64,AAAA'],
        ['lib/styles.css', 'body{}/*# sourceMappingURL=styles.css.map */'],
        ['src/index.ts', ''],
        ['lib/index.ts', ''],
        ['lib/debug.txt', '']
    ])('rejects %s even in a library', (path, content) => {
        expect(getReleaseViolation('dsh-core', path, content)).toBeDefined();
    });

    it.each(['dsh-core', 'dsh-logger-core'])('allows published declarations in %s', packageName => {
        expect(getReleaseViolation(packageName, 'lib/index.d.ts')).toBeUndefined();
    });

    it('rejects declarations in a plugin', () => {
        expect(getReleaseViolation('dsh-logger', 'lib/index.d.ts')).toBeDefined();
    });
});
