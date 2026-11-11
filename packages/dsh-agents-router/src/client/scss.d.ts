declare module '*.module.scss' {
    const classes: Readonly<Record<string, string>>;
    export default classes;
}

declare module '*.module.scss?inline' {
    const cssText: string;
    export default cssText;
}
