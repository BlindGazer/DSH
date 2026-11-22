interface FieldErrorProps {
    readonly error: string | undefined;
}

export function FieldError({ error }: FieldErrorProps) {
    return error ? <span className="dsh-field-error">{error}</span> : null;
}
