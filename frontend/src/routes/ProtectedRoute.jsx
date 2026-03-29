import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { CircularProgress, Box } from "@mui/material";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Admin-only pages: must be logged in AND have the right role
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.userLevel !== requiredRole) {
    return <Navigate to="/main" replace />;
  }

  return children;
};

export default ProtectedRoute;
