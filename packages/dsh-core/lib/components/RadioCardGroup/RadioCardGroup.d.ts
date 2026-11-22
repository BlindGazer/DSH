export interface RadioCardGroupProps<T extends string> {
    readonly name: string;
    readonly label: string;
    readonly value: T;
    readonly options: readonly {
        readonly value: T;
        readonly label: string;
        readonly description: string;
    }[];
    readonly onChange: (value: T) => void;
    readonly disabled?: boolean;
    readonly className?: string;
}
export declare function RadioCardGroup<T extends string>({ name, label, value, options, onChange, disabled, className }: RadioCardGroupProps<T>): import("react").JSX.Element;
