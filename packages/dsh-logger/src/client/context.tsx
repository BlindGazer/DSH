import { type DshLogger, NOOP_LOGGER } from '@kalex/dsh-logger-core';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_LEVEL, DEFAULT_MAX_FILE_BYTES, defaultLoggerConfig, type LoggerConfig } from '../shared/index.ts';

export interface LoggerSettingsContextValue {
    readonly config: LoggerConfig;
    readonly updateConfig: (config: LoggerConfig) => void;
    readonly requestPathChange: (path: string) => boolean;
}

export interface LoggerSettingsProviderProps {
    readonly children: ReactNode;
    readonly initialConfig?: LoggerConfig;
    readonly confirmPathChange?: (path: string) => boolean;
}

export interface ClientLoggerService {
    readonly getLogger: (context: { readonly packageName: string }, source: 'client') => DshLogger;
}

export interface DshLoggerProviderProps {
    readonly children: ReactNode;
    readonly packageName: string;
    readonly service?: ClientLoggerService;
}

const noopContext: LoggerSettingsContextValue = {
    config: { enabled: false, level: DEFAULT_LEVEL, maxFileBytes: DEFAULT_MAX_FILE_BYTES },
    updateConfig: () => undefined,
    requestPathChange: () => false
};

const LoggerSettingsContext = createContext<LoggerSettingsContextValue>(noopContext);
const DshLoggerContext = createContext<DshLogger>(NOOP_LOGGER);

export function LoggerSettingsProvider(props: LoggerSettingsProviderProps): ReactNode {
    const [config, setConfig] = useState<LoggerConfig>(props.initialConfig ?? defaultLoggerConfig());
    const requestPathChange = useCallback(
        (path: string): boolean => {
            if (props.confirmPathChange?.(path) !== true) return false;
            setConfig(current => ({ ...current, path }));
            return true;
        },
        [props]
    );
    const value = useMemo<LoggerSettingsContextValue>(
        () => ({
            config,
            updateConfig: setConfig,
            requestPathChange
        }),
        [config, requestPathChange]
    );
    return <LoggerSettingsContext.Provider value={value}>{props.children}</LoggerSettingsContext.Provider>;
}

export function useLoggerSettings(): LoggerSettingsContextValue {
    return useContext(LoggerSettingsContext);
}

/** Возвращает scoped logger, выданный Client Service. */
export function DshLoggerProvider(props: DshLoggerProviderProps): ReactNode {
    const [logger] = useState<DshLogger>(() => props.service?.getLogger({ packageName: props.packageName }, 'client') ?? NOOP_LOGGER);
    return <DshLoggerContext.Provider value={logger}>{props.children}</DshLoggerContext.Provider>;
}

export function useDshLogger(): DshLogger {
    return useContext(DshLoggerContext);
}
