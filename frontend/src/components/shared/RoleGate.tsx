import type { ReactNode } from 'react';
import { useUserStore } from '../../store/user/useUserStore';
import type { UserRole } from '../../shared/constants/constants';

interface RoleGateProps {
  allowed: UserRole | UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const currentUser = useUserStore((s) => s.currentUser);
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  if (!currentUser || !allowedRoles.includes(currentUser.userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
