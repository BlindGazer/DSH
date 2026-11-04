    const STYLE_ID = '@kalex/dsh-provider-proxy/styles';
    const CSS_TEXT = `
.kpp-locale-settings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--dsh-ui-border);
  color: var(--dsh-ui-text);
}
.kpp-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px;
  padding: 8px;
  border: 1px solid var(--dsh-ui-border);
  border-radius: 8px;
}
.kpp-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid var(--dsh-ui-border-strong);
  background: var(--dsh-ui-elevated);
  color: var(--dsh-ui-text, #f2f2f5);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.kpp-btn:hover:not(:disabled) {
  background: var(--dsh-ui-hover);
}
.kpp-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.kpp-btn-primary {
  background: var(--dsh-ui-accent) !important;
  color: var(--dsh-ui-on-accent) !important;
  border-color: var(--dsh-ui-accent-hover) !important;
  font-weight: 600;
}
.kpp-btn-primary:hover:not(:disabled) {
  background: var(--dsh-ui-accent-hover) !important;
  color: var(--dsh-ui-on-accent) !important;
}
.kpp-btn-danger {
  color: var(--dsh-ui-danger) !important;
  border-color: var(--dsh-ui-danger) !important;
  background: var(--dsh-ui-danger-soft);
}
.kpp-btn-danger:hover:not(:disabled) {
  background: var(--dsh-ui-danger-soft);
}
.kpp-btn-sm {
  padding: 0 10px;
  font-size: 12px;
  border-radius: 6px;
}
.kpp-card-bar {
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid var(--dsh-ui-border);
  border-radius: 8px;
  background: var(--dsh-ui-surface);
  font-size: 12px;
}
.kpp-card-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.kpp-card-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.kpp-card-bar .kpp-card-left > .kpp-badge {
  box-sizing: border-box;
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
}
.kpp-card-bar .kpp-dropdown {
  flex: 1;
  min-width: 0;
}
.kpp-card-bar .kpp-dropdown-trigger {
  box-sizing: border-box;
  height: 32px;
}
.kpp-btn-icon {
  width: 32px;
  padding: 0;
}
.kpp-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--dsh-ui-border);
}
.kpp-badge-direct {
  color: var(--dsh-ui-muted);
}
.kpp-badge-proxy {
  color: var(--dsh-ui-info);
  background: var(--dsh-ui-info-soft);
  border-color: var(--dsh-ui-border-strong);
}
.kpp-badge-warn {
  color: var(--dsh-ui-warning);
  background: var(--dsh-ui-warning-soft);
  border-color: var(--dsh-ui-warning);
}
.kpp-select, .kpp-input {
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--dsh-ui-border-strong);
  background-color: var(--dsh-ui-elevated, #242428);
  color: var(--dsh-ui-text, #f2f2f5);
  font-size: 12px;
  outline: none;
  color-scheme: light dark;
}
.kpp-select option {
  background-color: var(--dsh-ui-elevated, #242428);
  color: var(--dsh-ui-text, #f2f2f5);
}
.kpp-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 13px;
  padding: 6px 10px;
}
.kpp-input:focus {
  border-color: var(--dsh-ui-accent);
}
.kpp-dropdown {
  position: relative;
  display: inline-block;
  min-width: 170px;
}
.kpp-dropdown-full {
  display: block;
  width: 100%;
  min-width: 0;
}
.kpp-dropdown-trigger {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--dsh-ui-border-strong);
  background: var(--dsh-ui-elevated, #242428);
  color: var(--dsh-ui-text, #f2f2f5);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.kpp-dropdown-trigger:hover:not(:disabled) {
  border-color: var(--dsh-ui-accent);
}
.kpp-dropdown-menu {
  position: absolute;
  right: 0;
  left: 0;
  top: calc(100% + 4px);
  z-index: 10020;
  max-height: 220px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid var(--dsh-ui-border-strong);
  background: var(--dsh-ui-surface, #1c1c1f);
  color: var(--dsh-ui-text, #f2f2f5);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
