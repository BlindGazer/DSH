interface ProxyDispatchOptions {
    readonly origin?: string | URL;
    readonly path?: string;
    readonly headers?: string[] | Record<string, string>;
    readonly [key: string]: object | string | undefined;
}
export interface UndiciDispatcherLike {
    close?(): Promise<void>;
    destroy?(): Promise<void>;
    dispatch?(options: ProxyDispatchOptions, handler: object): boolean;
}
interface ProxyAgentDispatcherLike extends UndiciDispatcherLike {
    dispatch(options: ProxyDispatchOptions, handler: object): boolean;
}
interface ProxyAgentConstructor {
    new (options: Record<string, object | string | undefined>): ProxyAgentDispatcherLike;
    readonly prototype: ProxyAgentDispatcherLike;
}
type UndiciOptionFunction = (...args: never[]) => void;
export interface UndiciModuleLike {
    readonly ProxyAgent: ProxyAgentConstructor;
    readonly Agent: new (options: Record<string, object | UndiciOptionFunction | undefined>) => UndiciDispatcherLike;
    readonly fetch: (input: string | URL, init?: Record<string, object | string | undefined>) => Promise<Response>;
}
export type UndiciLoader = () => Promise<UndiciModuleLike>;
type UndiciModuleResolver = () => Promise<UndiciModuleLike>;
export declare function createUndiciLoader(resolveModule?: UndiciModuleResolver): UndiciLoader;
export declare function loadUndici(): Promise<UndiciModuleLike>;
export {};
