import { useRef } from 'react';

export function useNotificationCopy(text: string) {
    const textRef = useRef<HTMLDivElement>(null);
    const select = (): void => {
        const element = textRef.current;
        if (!element) return;
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    };
    const copy = (): void => {
        if (!navigator.clipboard) {
            select();
            return;
        }
        void navigator.clipboard.writeText(text).catch(select);
    };
    return { copy, textRef };
}
