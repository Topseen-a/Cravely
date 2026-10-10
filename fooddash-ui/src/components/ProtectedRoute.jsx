import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/hooks';

// Wraps pages that need a login. staffOnly also requires the staff role.
export default function ProtectedRoute({ children, staffOnly = false, customerOnly = false }) {
  const { user, isStaff } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (staffOnly && !isStaff) return <Navigate to="/" replace />;
  if (customerOnly && isStaff) return <Navigate to="/staff" replace />;
  return children;
}
