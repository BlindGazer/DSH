import { existsSync } from 'node:fs';
import net from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';

let cachedUndici = null;

/**
 * Resolve `undici` from current package, DSH desktop profile, or DSH app resources.
 */
export async function loadUndici() {
  if (cachedUndici) return cachedUndici;
  const candidates = ['undici'];
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
  const profileUndici = join(dshHome, 'profiles', 'desktop', 'node_modules', 'undici', 'index.js');
  if (existsSync(profileUndici)) {
    candidates.push(pathToFileURL(profileUndici).href);
  }
  for (const spec of candidates) {
    try {
      cachedUndici = await import(spec);
      return cachedUndici;
    } catch {
      /* try next */
    }
  }
  throw new Error('undici package is required but could not be resolved');
}
