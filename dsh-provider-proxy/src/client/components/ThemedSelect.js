    function sanitizeHost(input) {
      if (typeof input !== 'string') return '';
      let v = input.trim();
      if (!v) return '';
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) {
        try {
          return new URL(v).hostname;
        } catch {
          v = v.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
        }
      }
      v = v.split('/')[0] || v;
      const idx = v.indexOf(':');
      if (idx > 0 && !v.startsWith('[')) return v.slice(0, idx);
      return v;
    }

    /**
     * Custom themed dropdown (`KppSelect`) that renders its menu in DOM so dark-theme
     * option text is always crisp and visible (avoiding Chromium native `<option>` white popup bug).
     */
    function KppSelect({ value, options, onChange, ariaLabel, fullWidth = false, disabled = false }) {
      const [open, setOpen] = useState(false);
      const rootRef = useRef ? useRef(null) : { current: null };
      const selected = (options || []).find((o) => o.value === value) || (options || [])[0] || { value: '', label: '' };

      useEffect(() => {
        if (!open || typeof document === 'undefined') return;
        const onDocMouseDown = (e) => {
          if (rootRef.current && !rootRef.current.contains(e.target)) {
            setOpen(false);
          }
        };
        document.addEventListener('mousedown', onDocMouseDown, true);
        return () => document.removeEventListener('mousedown', onDocMouseDown, true);
      }, [open]);

      return jsxs('div', {
        ref: rootRef,
        className: `kpp-dropdown${fullWidth ? ' kpp-dropdown-full' : ''}`,
        children: [
          jsxs('button', {
            type: 'button',
            className: 'kpp-dropdown-trigger',
            'aria-label': ariaLabel,
            'aria-expanded': open,
            disabled,
            onClick: () => !disabled && setOpen((prev) => !prev),
            children: [
              jsx('span', {
                style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                children: selected.label
              }),
              jsx('svg', {
                width: 14,
                height: 14,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'aria-hidden': true,
                children: jsx('path', { d: open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6' })
              })
            ]
          }),
          open
            ? jsx('div', {
                className: 'kpp-dropdown-menu',
                role: 'listbox',
                children: (options || []).map((opt) => {
                  const isActive = opt.value === value;
                  return jsxs(
                    'button',
                    {
                      type: 'button',
                      role: 'option',
                      'aria-selected': isActive,
                      className: `kpp-dropdown-item${isActive ? ' kpp-dropdown-item-active' : ''}`,
                      onClick: () => {
                        setOpen(false);
                        if (opt.value !== value) {
                          onChange?.(opt.value);
                        }
                      },
                      children: [
                        jsx('span', { children: opt.label }),
                        isActive ? jsx('span', { children: '✓' }) : null
                      ]
                    },
                    String(opt.value)
                  );
                })
              })
            : null
        ]
      });
    }
