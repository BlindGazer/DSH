export function SwitchControl({ checked, onChange, disabled = false, labelledBy }) {
  return <button type="button" role="switch" aria-labelledby={labelledBy} aria-checked={checked} className="ar-settings-switch" disabled={disabled} onClick={() => onChange(!checked)}><span /></button>
}
