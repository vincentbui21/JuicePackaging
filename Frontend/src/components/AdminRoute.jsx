import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" />;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    if (decoded.exp < now) {
      localStorage.removeItem("token");
      return <Navigate to="/" />;
    }

    // TODO: replace this with a real role/permission check once roles exist.
    const isAdmin = decoded?.id === "admin";
    if (!isAdmin) return <Navigate to="/dashboard" />;
  } catch (err) {
    localStorage.removeItem("token");
    return <Navigate to="/" />;
  }

  return children;
}

export default AdminRoute;
