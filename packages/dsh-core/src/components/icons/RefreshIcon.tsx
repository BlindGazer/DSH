interface RefreshIconProps {
    readonly size?: number;
}

export default function RefreshIcon({ size = 16 }: RefreshIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false">
            <path d="M20 4v5h-5M20 9a8.5 8.5 0 1 0 0 6" />
        </svg>
    );
}
