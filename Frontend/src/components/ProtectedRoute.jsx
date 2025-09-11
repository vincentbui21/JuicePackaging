import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // only if your version supports named export

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("token");
    if (!token) return <Navigate to="/" />;

    try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        if (decoded.exp < now) {
        localStorage.removeItem("token");
        return <Navigate to="/" />;
        }
    } catch (err) {
        localStorage.removeItem("token");
        return <Navigate to="/" />;
    }

    return children;
}

export default ProtectedRoute;
