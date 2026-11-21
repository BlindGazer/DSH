import { cx } from '../../utils/classNames.js';

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

export function RadioCardGroup<T extends string>({
    name,
    label,
    value,
    options,
    onChange,
    disabled = false,
    className
}: RadioCardGroupProps<T>) {
    return (
        <fieldset className={cx('dsh-radio-card-group', className)} disabled={disabled}>
            <legend className="dsh-radio-card-legend">{label}</legend>
            <div className="dsh-radio-card-options">
                {options.map(option => (
                    <label key={option.value} className="dsh-radio-card">
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            aria-label={option.label}
                            aria-describedby={`${name}-${option.value}-description`}
                            onChange={() => onChange(option.value)}
                        />
                        <span className="dsh-radio-card-content">
                            <span className="dsh-radio-card-title">{option.label}</span>
                            <span className="dsh-radio-card-description" id={`${name}-${option.value}-description`}>
                                {option.description}
                            </span>
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
