import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

const cacheDir = new URL('../node_modules/dsh-github-styles/', import.meta.url);
const apiUrl = 'https://api.github.com/repos/deepseek-ai/deepseek-harness/contents/packages/client/ui-theme/src/styles?ref=master';
const rawBase = 'https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-theme/src/styles/';
const styleNames = [
    'base.css',
    'corner-shape.css',
    'design-platform.css',
    'focus.css',
    'gradient-shadow-text.css',
    'onboarding.css',
    'scrollbar.css',
    'shiki.css',
    'brand-font.css'
];
const manifestName = 'manifest.json';

async function fetchText(url) {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'dsh-core-demo' }
    });
    if (!response.ok) throw new Error(`GitHub request failed: ${response.status} ${url}`);
    return response.text();
}

async function readManifest() {
    try {
        return JSON.parse(await readFile(new URL(manifestName, cacheDir), 'utf8'));
    } catch {
        return undefined;
    }
}

const cachedManifest = await readManifest();
let remoteFiles;
try {
    remoteFiles = JSON.parse(await fetchText(apiUrl));
} catch (error) {
    if (cachedManifest) {
        console.warn(`[dsh-core demo] GitHub unavailable, using cached DSH styles (${error.message})`);
        process.exit(0);
    }
    throw error;
}

const remoteSha = Object.fromEntries(remoteFiles.filter(file => styleNames.includes(file.name)).map(file => [file.name, file.sha]));
const unchanged = cachedManifest && styleNames.every(name => cachedManifest.files?.[name] === remoteSha[name]);
if (unchanged) {
    console.log('[dsh-core demo] DSH styles are up to date');
    process.exit(0);
}

const temporaryDir = new URL('../node_modules/.dsh-github-styles.tmp/', import.meta.url);
await rm(temporaryDir, { recursive: true, force: true });
await mkdir(temporaryDir, { recursive: true });
for (const name of styleNames) {
    const content = await fetchText(`${rawBase}${name}`);
    await writeFile(new URL(name, temporaryDir), content, 'utf8');
}
await writeFile(
    new URL(manifestName, temporaryDir),
    `${JSON.stringify(
        {
            source: 'https://github.com/deepseek-ai/deepseek-harness',
            ref: 'master',
            files: remoteSha
        },
        null,
        2
    )}\n`,
    'utf8'
);
await rm(cacheDir, { recursive: true, force: true });
await mkdir(new URL('../node_modules/', import.meta.url), { recursive: true });
await rename(temporaryDir, cacheDir);
console.log(`[dsh-core demo] Updated ${styleNames.length} DSH style files from master`);
