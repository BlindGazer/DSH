export interface AdminPrincipal {
  id: string
  roles: readonly string[]
}

export function canManageUsers(principal: AdminPrincipal | undefined): boolean {
  return principal?.roles.includes('admin') === true
}
