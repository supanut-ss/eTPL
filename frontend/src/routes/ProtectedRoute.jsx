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

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.userLevel !== requiredRole) {
    return <Navigate to="/main" replace />;
  }

  return children;
};

export default ProtectedRoute;
