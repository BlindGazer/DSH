const PREFIX = '/agents-router'

export async function request(route, options) {
  const response = await fetch(`${PREFIX}${route}`, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
  return body
}
