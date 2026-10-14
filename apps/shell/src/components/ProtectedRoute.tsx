import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ROLE_PM' | 'ROLE_VIEWER';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.app);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'ROLE_PM') {
    return (
      <div className="p-8 text-center text-slate-400">
        <h2 className="text-lg font-bold text-rose-400 mb-2">Access Restricted</h2>
        <p className="text-xs">
          Your current role (<span className="font-mono text-white">{user.role}</span>) does not
          have permissions to view this resource. Requires {requiredRole}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
