export function parseNameList(value) {
  return value.split(/\r?\n/)
}

export function cleanNameList(names) {
  return names.map((name) => name.trim()).filter(Boolean)
}
