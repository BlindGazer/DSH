export function parseNameList(value: string): string[] {
    return value.split(/\r?\n/);
}

export function cleanNameList(names: readonly string[]): string[] {
    return names.map(name => name.trim()).filter(Boolean);
}
