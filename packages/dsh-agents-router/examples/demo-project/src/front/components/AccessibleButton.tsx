export interface AccessibleButtonProps {
    label: string;
    disabled?: boolean;
}

export function accessibleButtonLabel(props: AccessibleButtonProps): string {
    return props.label.trim();
}
