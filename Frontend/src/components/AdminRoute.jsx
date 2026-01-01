import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function AdminRoute({ children, requirePermission = null }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" />;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userPermissions");
      localStorage.removeItem("role");
      return <Navigate to="/" />;
    }

    // Check user role and permissions
    const permissionsStr = localStorage.getItem("userPermissions");
    if (permissionsStr) {
      const permissions = JSON.parse(permissionsStr);
      
      // If no specific permission required, check if user is admin
      if (!requirePermission) {
        if (permissions.role !== 'admin') {
          return <Navigate to="/dashboard" />;
        }
      } else {
        // Check for specific permission or admin role
        const hasPermission = permissions[requirePermission] === 1 || permissions.role === 'admin';
        if (!hasPermission) {
          return <Navigate to="/dashboard" />;
        }
      }
    } else {
      // No permissions found, redirect to dashboard
      return <Navigate to="/dashboard" />;
    }
  } catch (err) {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("role");
    return <Navigate to="/" />;
  }

  return children;
}

export default AdminRoute;
