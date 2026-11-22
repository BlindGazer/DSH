import type { InvocationDescriptor, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import { z } from 'zod';

export const LoggerSanitizerSchema = z.object({ keys: z.array(z.string()).optional(), paths: z.array(z.string()).optional() }).strict();
const policyFields = {
    enabled: z.boolean(),
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    maxFileBytes: z.number().int().min(1024).optional(),
    sanitizer: LoggerSanitizerSchema.optional()
};
export const LoggerPolicySchema = z.object(policyFields).strict();
export const LoggerConfigSchema = z
    .object({
        ...policyFields,
        enabled: z.boolean().default(false),
        level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
        maxFileBytes: z.number().int().min(1024).default(10485760),
        path: z.string().optional(),
        plugins: z.record(z.string(), LoggerPolicySchema).default({})
    })
    .strict();
export const LoggerSettingsSnapshotSchema = z
    .object({
        config: LoggerConfigSchema,
        resolvedPath: z.string(),
        packageNames: z.array(z.string()),
        cleanupWarning: z.string().optional()
    })
    .strict();
export const LoggerSaveRequestSchema = z
    .object({
        config: LoggerConfigSchema,
        expectedConfig: LoggerConfigSchema,
        confirmPathChange: z.boolean().default(false),
        cleanupPaths: z.array(z.string()).optional()
    })
    .strict();
export const LoggerPathRequestSchema = z.object({ path: z.string() }).strict();
export const LoggerPathPreviewSchema = z
    .object({
        path: z.string(),
        controlled: z.number().int(),
        unknown: z.number().int(),
        deleted: z.array(z.string()).default([]),
        preserved: z.array(z.string()).default([])
    })
    .strict();
export type LoggerSettingsSnapshot = z.infer<typeof LoggerSettingsSnapshotSchema>;
export type LoggerSaveRequest = z.infer<typeof LoggerSaveRequestSchema>;
export type LoggerPathRequest = z.infer<typeof LoggerPathRequestSchema>;
export type LoggerPathPreview = z.infer<typeof LoggerPathPreviewSchema>;
export interface LoggerSettingsRemote {
    read(): Promise<LoggerSettingsSnapshot>;
    save(request: LoggerSaveRequest): Promise<LoggerSettingsSnapshot>;
    previewPath(request: LoggerPathRequest): Promise<LoggerPathPreview>;
}
const codec = <T extends z.ZodType>(symbol: string, schema: T) => ({
    mode: 'strict' as const,
    typeSymbol: `@kalex/dsh-logger/remote#${symbol}`,
    create: () => schema
});
const descriptors: InvocationDescriptor[] = [
    {
        id: '@kalex/dsh-logger#settings/read',
        service: 'dshLoggerSettings',
        namespace: 'loggerSettings',
        method: 'read',
        invocation: { kind: 'direct' },
        parameters: [],
        result: codec('Snapshot', LoggerSettingsSnapshotSchema)
    },
    {
        id: '@kalex/dsh-logger#settings/save',
        service: 'dshLoggerSettings',
        namespace: 'loggerSettings',
        method: 'save',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'input', wire: 'input', source: 'json', codec: codec('SaveRequest', LoggerSaveRequestSchema) }],
        result: codec('Snapshot', LoggerSettingsSnapshotSchema)
    },
    {
        id: '@kalex/dsh-logger#settings/previewPath',
        service: 'dshLoggerSettings',
        namespace: 'loggerSettings',
        method: 'previewPath',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'input', wire: 'input', source: 'json', codec: codec('PathRequest', LoggerPathRequestSchema) }],
        result: codec('PathPreview', LoggerPathPreviewSchema)
    }
];
export const TYPERT_REMOTE = Object.freeze({ package: '@kalex/dsh-logger', descriptors }) satisfies TypertRemoteContribution;
export const TYPERT = Object.freeze({
    package: TYPERT_REMOTE.package,
    face: 'host',
    schemas: Object.freeze([]),
    model: Object.freeze({ services: Object.freeze([]), events: Object.freeze([]), objects: Object.freeze([]) }),
    invocations: descriptors
});
