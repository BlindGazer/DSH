import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { type AccountSnapshot, AccountSnapshotSchema } from '../shared/remote.ts';

const summary = AccountSnapshotSchema.pick({
    usageLimited: true,
    usageLimits: true,
    usageCredits: true,
    usageCreditsUnlimited: true,
    usageResetCredits: true,
    usageUpdatedAt: true
})
    .extend({
        usageLimits: z
            .array(
                z.strictObject({
                    name: z.string().regex(/^[\p{L}\p{N} ._()+-]{1,80}$/u),
                    usedPercent: z.number().min(0).max(100),
                    windowSeconds: z.number().nonnegative(),
                    resetAt: z.number()
                })
            )
            .max(18),
        usageCredits: z.string().regex(/^(?:-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)?$/iu),
        usageResetCredits: z.number().int().nonnegative().optional(),
        usageUpdatedAt: z.number().int().positive()
    })
    .strip();
const record = z.strictObject({ version: z.literal(1), summary });

export class UsageCache {
    constructor(private readonly profilePath = process.env.DSH_PROFILE_DIR?.trim() || process.env.DSH_PROFILE_PATH?.trim()) {}

    private path(key: string): string | undefined {
        if (!this.profilePath) return undefined;
        const digest = createHash('sha256')
            .update(JSON.stringify([realpathSync(this.profilePath), key]))
            .digest('hex');
        return join(homedir(), 'dsh', 'openai-hub', `dsh-openai-hub-quota-${digest}.json`);
    }

    read(key: string) {
        try {
            const path = this.path(key);
            if (!path) return undefined;
            const stat = lstatSync(path);
            if (!stat.isFile() || stat.size > 65536) return undefined;
            const parsed = record.safeParse(JSON.parse(readFileSync(path, 'utf8')));
            return parsed.success ? parsed.data.summary : undefined;
        } catch {
            return undefined;
        }
    }

    write(key: string, view: AccountSnapshot): void {
        const path = this.path(key);
        if (!path) return;
        const payload = record.parse({ version: 1, summary: view });
        mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
        const temp = `${path}.${randomUUID()}.tmp`;
        try {
            writeFileSync(temp, JSON.stringify(payload), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
            renameSync(temp, path);
        } finally {
            rmSync(temp, { force: true });
        }
    }

    delete(key: string): void {
        const path = this.path(key);
        if (path) rmSync(path, { force: true });
    }
}
