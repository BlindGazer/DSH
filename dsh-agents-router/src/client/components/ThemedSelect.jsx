import { useEffect, useRef, useState } from 'react'

export function ThemedSelect({ value, options, onChange, ariaLabel, disabled = false }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', closeOutside, true)
    return () => document.removeEventListener('mousedown', closeOutside, true)
  }, [open])
  const move = (delta) => setActiveIndex((index) => (index + delta + options.length) % options.length)
  const onKeyDown = (event) => {
    if (event.key === 'Escape') { setOpen(false); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { setActiveIndex(selectedIndex); setOpen(true) } else move(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (!open) { setActiveIndex(selectedIndex); setOpen(true) }
      else { onChange(options[activeIndex].value); setOpen(false) }
    }
  }
  return <div className="ar-themed-select" ref={rootRef}>
    <button type="button" className="ar-themed-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onKeyDown={onKeyDown} onClick={() => { setActiveIndex(selectedIndex); setOpen(!open) }}>
      <span>{options[selectedIndex]?.label}</span><span aria-hidden="true">{open ? '▴' : '▾'}</span>
    </button>
    {open ? <div className="ar-themed-select-menu" role="listbox" aria-label={ariaLabel}>{options.map((option, index) => <button type="button" role="option" aria-selected={index === selectedIndex} className={index === activeIndex ? 'active' : ''} key={option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}</div> : null}
  </div>
}
