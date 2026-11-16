declare module '*.module.scss' {
    const styles: Readonly<Record<string, string>>;
    export default styles;
}

declare module '*.module.scss?inline' {
    const styles: string;
    export default styles;
}
