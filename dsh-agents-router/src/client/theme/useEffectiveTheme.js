import { useEffect, useState } from 'react'

export function detectHostTheme(anchorEl) {
  if (typeof document === 'undefined') return 'dark'
  const roots = []
  for (let element = anchorEl?.parentElement; element && element !== document; element = element.parentElement) {
    if (!element.matches?.('.ar-root, .ar-settings-root') && element.matches?.('[data-theme], [data-color-scheme], .dark, .light')) roots.push(element)
  }
  roots.push(document.documentElement, document.body)
  for (const element of roots.filter(Boolean)) {
    const theme = (element.getAttribute?.('data-theme') || element.getAttribute?.('data-color-scheme') || element.getAttribute?.('data-mode') || '').toLowerCase()
    if (theme === 'light' || theme === 'dark') return theme
    if (element.classList?.contains('light')) return 'light'
    if (element.classList?.contains('dark')) return 'dark'
    const colorScheme = element.style?.colorScheme || (typeof getComputedStyle === 'function' ? getComputedStyle(element).colorScheme : '')
    if (colorScheme === 'light' || colorScheme === 'dark') return colorScheme
  }
  const probe = anchorEl?.parentElement || document.body
  if (probe && typeof getComputedStyle === 'function') {
    for (let element = probe; element && element !== document; element = element.parentElement) {
      const color = parseRgb(getComputedStyle(element).backgroundColor)
      if (color && color.a > 0.2) return luminance(color) > 140 ? 'light' : 'dark'
    }
    const text = parseRgb(getComputedStyle(document.body).color)
    if (text) return luminance(text) < 100 ? 'light' : 'dark'
  }
  return window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark'
}

export function useEffectiveTheme(preference = 'auto', rootRef) {
  const explicit = preference === 'light' || preference === 'dark' ? preference : undefined
  const [theme, setTheme] = useState(() => explicit ?? detectHostTheme(rootRef?.current))
  useEffect(() => {
    if (explicit) { setTheme(explicit); return undefined }
    const update = () => setTheme(detectHostTheme(rootRef?.current))
    const observer = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(update)
    for (const element of [document.documentElement, document.body]) {
      observer?.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme', 'data-mode'] })
    }
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    media?.addEventListener?.('change', update)
    update()
    return () => { observer?.disconnect(); media?.removeEventListener?.('change', update) }
  }, [explicit, rootRef])
  return explicit ?? theme
}

function parseRgb(value) {
  const match = /rgba?\((\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\)/i.exec(value)
  return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) } : undefined
}

function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
