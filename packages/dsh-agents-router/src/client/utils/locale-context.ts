let hostLocale: string | undefined;

export function setHostLocale(value?: string): void {
    hostLocale = value;
}

export function getHostLocale(): string | undefined {
    return hostLocale;
}
