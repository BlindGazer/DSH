import { extname } from 'node:path';

const declarations = new Set(['dsh-core', 'dsh-logger-core']);
const runtime = /\.(?:[cm]?js|css)$/i;
const assets = /\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?|ttf|otf|wasm)$/i;
const metadata = /^(?:package\.json|README\.md|LICEN[CS]E(?:\.md)?|cordis\.patch\.yml)$/i;
const declaration = /\.d\.[cm]?ts$/i;
const mapComment = /\/\/[#@]\s*sourceMappingURL\s*=|\/\*[#@]\s*sourceMappingURL\s*=/;

export function isReleaseText(path: string): boolean {
    return runtime.test(path) || declaration.test(path);
}

export function getReleaseViolation(packageName: string, path: string, content = ''): string | undefined {
    if (/\.map$/i.test(path)) return 'source map files are not allowed';
    if (mapComment.test(content)) {
        return 'embedded source map references are not allowed';
    }
    if (declaration.test(path)) {
        return declarations.has(packageName) && path.startsWith('lib/') ? undefined : 'declarations are only allowed in public libraries';
    }
    if (path.startsWith('lib/') && (runtime.test(path) || assets.test(path))) return;
    if (metadata.test(path)) return;
    if (path.startsWith('docs/') && (extname(path) === '.md' || assets.test(path))) return;
    if (path.startsWith('locale/') && extname(path) === '.json') return;
    if ((path.startsWith('assets/') || path === 'icon.svg') && assets.test(path)) return;
    return 'unexpected file in release';
}
