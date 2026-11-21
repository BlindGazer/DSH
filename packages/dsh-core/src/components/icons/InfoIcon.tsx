interface InfoIconProps {
    width?: number;
    height?: number;
}

export default function InfoIcon({ width = 16, height = 16 }: InfoIconProps) {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            role="img"
            aria-label="Информация">
            <title>Информация</title>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10v6" strokeLinecap="round" />
            <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}
