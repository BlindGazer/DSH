import { isDeepStrictEqual } from 'node:util';
import type { Context } from '@deepseek-ai/cordis';
import type { ConfigEditor } from '@deepseek-ai/dsh-config-editor';
import { defaultLoggerConfig, type LoggerConfig } from '../shared/index.ts';
import {
    LoggerConfigSchema,
    type LoggerPathPreview,
    LoggerPathRequestSchema,
    type LoggerSaveRequest,
    LoggerSaveRequestSchema,
    type LoggerSettingsSnapshot
} from '../shared/remote.ts';
import type { DshLoggerService } from './index.ts';
import { cleanupLoggerDirectory, previewLoggerCleanup, resolveLoggerPath, validateLoggerConfig, validateLoggerPath } from './service.ts';

const hostNames = new Set(['@kalex/dsh-logger/host', '@kalex/dsh-logger', './lib/host.js']);

export class LoggerSettings {
    private current: LoggerConfig;
    public constructor(
        private readonly context: Context,
        config: LoggerConfig
    ) {
        this.current = config;
    }

    public read = async (): Promise<LoggerSettingsSnapshot> => {
        const service: DshLoggerService | undefined = this.context.get('dshLoggerService');
        const packageNames = new Set([...Object.keys(this.current.plugins ?? {}), ...(service?.listPackageNames() ?? [])]);
        return {
            config: LoggerConfigSchema.parse(this.current),
            resolvedPath: resolveLoggerPath(this.current),
            packageNames: [...packageNames].toSorted()
        };
    };

    public previewPath = async (input: { readonly path: string }): Promise<LoggerPathPreview> => {
        const { path } = LoggerPathRequestSchema.parse(input);
        const resolved = validateLoggerPath(resolveLoggerPath({ enabled: false, ...(path ? { path } : {}) }), undefined, {
            allowOutsideProfile: true
        });
        const oldPath = resolveLoggerPath(this.current);
        const { packageNames } = await this.read();
        return { path: resolved, ...previewLoggerCleanup(oldPath, packageNames, resolved) };
    };

    public save = async (input: LoggerSaveRequest): Promise<LoggerSettingsSnapshot> => {
        const request = LoggerSaveRequestSchema.parse(input);
        const { path, ...rest } = request.config;
        const config: LoggerConfig = { ...rest, ...(path?.trim() ? { path: path.trim() } : {}) };
        validateLoggerConfig(config);
        const previousPath = resolveLoggerPath(this.current);
        const nextPath = resolveLoggerPath(config);
        if (previousPath !== nextPath && !request.confirmPathChange) throw new Error('Logger path change requires confirmation');
        validateLoggerPath(nextPath, undefined, { allowOutsideProfile: request.confirmPathChange || nextPath === previousPath });
        const editor: ConfigEditor | undefined = this.context.get('configEditor');
        const entry = this.context.fiber?.entry ?? editor?.entries().find(row => hostNames.has(row.options.name));
        if (!editor || !entry) throw new Error('Logger configuration cannot be saved');
        const previousPackages = (await this.read()).packageNames;
        const service: DshLoggerService | undefined = this.context.get('dshLoggerService');
        const issuedPackages = service?.listPackageNames() ?? [];
        if (previousPath !== nextPath) {
            const preview = previewLoggerCleanup(previousPath, previousPackages, nextPath);
            if (
                request.cleanupPaths === undefined ||
                !isDeepStrictEqual([...new Set(request.cleanupPaths)].toSorted(), preview.deleted.toSorted())
            ) {
                throw new Error('Logger cleanup preview changed; preview the path again');
            }
        }
        await editor.edit(entry, (current, inherited) => {
            const actual = LoggerConfigSchema.parse({ ...defaultLoggerConfig(), ...inherited, ...current });
            if (!isDeepStrictEqual(actual, request.expectedConfig)) throw new Error('Logger configuration changed; reload settings');
            return { ...config };
        });
        this.current = config;
        let cleanupWarning: string | undefined;
        if (previousPath !== nextPath) {
            try {
                cleanupLoggerDirectory(previousPath, true, undefined, true, previousPackages, nextPath, request.cleanupPaths);
            } catch {
                const message = 'dsh-logger: settings saved but old log cleanup failed';
                console.error(message);
                this.context.logger.error(message);
                cleanupWarning = 'Logger settings saved, but old logs could not be fully removed';
            }
        }
        const snapshot = await this.read();
        return {
            ...snapshot,
            packageNames: [...new Set([...issuedPackages, ...snapshot.packageNames])].toSorted(),
            ...(cleanupWarning ? { cleanupWarning } : {})
        };
    };
}
