interface CloseIconProps {
    readonly size?: number;
}
export default function CloseIcon({ size = 16 }: CloseIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    );
}
