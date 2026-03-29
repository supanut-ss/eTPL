import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import theme from "./theme/theme";
import { AuthProvider } from "./store/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import UserMasterPage from "./pages/UserMasterPage";
import PermissionPage from "./pages/PermissionPage";
import FixturePage from "./pages/FixturePage";
import StandingPage from "./pages/StandingPage";
import PublicMatchesPage from "./pages/PublicMatchesPage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/main" replace />} />

            {/* AppLayout wraps all app pages */}
            <Route path="/" element={<AppLayout />}>
              {/* Public — no login required */}
              <Route path="main" element={<MainPage />} />
              <Route path="standings" element={<StandingPage />} />
              <Route path="matches" element={<PublicMatchesPage />} />

              {/* Login required */}
              <Route
                path="fixtures"
                element={
                  <ProtectedRoute>
                    <FixturePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin-only pages */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <UserMasterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="permissions"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <PermissionPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/main" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
