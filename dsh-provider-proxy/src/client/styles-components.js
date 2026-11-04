}
.kpp-dropdown-item {
  width: 100%;
  box-sizing: border-box;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  background: transparent;
  color: var(--dsh-ui-text, #f2f2f5) !important;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpp-dropdown-item:hover {
  background: var(--dsh-ui-hover);
  color: var(--dsh-ui-text) !important;
}
.kpp-dropdown-item-active {
  background: var(--dsh-ui-info-soft);
  color: var(--dsh-ui-text) !important;
  font-weight: 600;
}
.kpp-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--dsh-ui-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.kpp-modal {
  width: min(760px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: var(--dsh-ui-bg-modal, #1b1b1e);
  color: var(--dsh-ui-text, #f2f2f5);
  border: 1px solid var(--dsh-ui-border-strong);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.kpp-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--dsh-ui-border);
}
.kpp-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
.kpp-modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.kpp-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kpp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kpp-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.kpp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kpp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--dsh-ui-border);
  background: var(--dsh-ui-elevated);
}
.kpp-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--dsh-ui-border-strong);
  background: var(--dsh-ui-surface);
}
.kpp-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px 125px;
  gap: 10px;
  align-items: end;
}
.kpp-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.kpp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.kpp-label {
  color: var(--dsh-ui-muted);
  font-weight: 500;
}
.kpp-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.kpp-alert {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.kpp-alert-warn {
  background: var(--dsh-ui-warning-soft);
  border: 1px solid var(--dsh-ui-warning);
  color: var(--dsh-ui-warning);
}
.kpp-alert-ok {
  background: var(--dsh-ui-success-soft);
  border: 1px solid var(--dsh-ui-success);
  color: var(--dsh-ui-success);
}
.kpp-alert-err {
  background: var(--dsh-ui-danger-soft);
  border: 1px solid var(--dsh-ui-danger);
  color: var(--dsh-ui-danger);
}
.kpp-host-sub {
  font-size: 11px;
  color: var(--dsh-ui-tertiary);
}
/*__KPP_THEME_STYLES__*/
`;
