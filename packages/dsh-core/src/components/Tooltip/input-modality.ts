export const INPUT_MODALITY_ATTRIBUTE = 'data-input-modality';
let pointer = false;
if (typeof window !== 'undefined') {
    window.addEventListener(
        'pointerdown',
        () => {
            pointer = true;
            document.documentElement.setAttribute(INPUT_MODALITY_ATTRIBUTE, 'pointer');
        },
        true
    );
    window.addEventListener(
        'keydown',
        event => {
            pointer = false;
            if (!event.isComposing) document.documentElement.setAttribute(INPUT_MODALITY_ATTRIBUTE, 'keyboard');
        },
        true
    );
}
export function pointerModality(): boolean {
    return pointer;
}
