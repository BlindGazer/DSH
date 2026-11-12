import { SwitchControl } from '@kalex/dsh-core';

export interface SettingRowProps {
    readonly id: string;
    readonly label: string;
    readonly note: string;
    readonly checked: boolean;
    readonly disabled: boolean;
    readonly onChange: (checked: boolean) => void;
}

export function SettingRow({ id, label, note, checked, disabled, onChange }: SettingRowProps) {
    const labelId = `workspace-manager-${id}`;
    return (
        <div className="addir-setting">
            <div>
                <span id={labelId}>{label}</span>
                <p>{note}</p>
            </div>
            <SwitchControl checked={checked} onChange={onChange} disabled={disabled} labelledBy={labelId} />
        </div>
    );
}
