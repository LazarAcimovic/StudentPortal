import type { ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { RoleEnum } from '../../models/Enums';

interface RoleGateProps {
  allowed: RoleEnum | RoleEnum[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const { user } = useAuthStore();
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  if (!user || !allowedRoles.includes(user.userRole as RoleEnum)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
