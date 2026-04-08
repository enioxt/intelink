export type UserRole = 'admin' | 'analyst' | 'viewer';
export type SystemRole = UserRole;

export function useRole(): { role: UserRole; can: (action: string) => boolean } {
  // TODO: derive from JWT claims
  const role: UserRole = 'analyst';

  const permissions: Record<UserRole, string[]> = {
    admin: ['read', 'write', 'delete', 'admin'],
    analyst: ['read', 'write'],
    viewer: ['read'],
  };

  const can = (action: string) => permissions[role]?.includes(action) ?? false;

  return { role, can };
}
