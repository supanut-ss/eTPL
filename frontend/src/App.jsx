import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { SnackbarProvider } from "notistack";
import theme from "./theme/theme";
import { AuthProvider } from "./store/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import UserMasterPage from "./pages/UserMasterPage";
import PermissionPage from "./pages/PermissionPage";
import AnnouncementPage from "./pages/AnnouncementPage";
import FixturePage from "./pages/FixturePage";
import StandingPage from "./pages/StandingPage";
import PublicMatchesPage from "./pages/PublicMatchesPage";
import AuctionPage from "./pages/AuctionPage";
import AdminAuctionPage from "./pages/AdminAuctionPage";
import MySquadPage from "./pages/MySquadPage";
import ClubSquadPage from "./pages/ClubSquadPage";
import TransferBoardPage from "./pages/TransferBoardPage";
import MarketOverviewPage from "./pages/MarketOverviewPage";
import CompletedAuctionPage from "./pages/CompletedAuctionPage";
import HallOfFamePage from "./pages/HallOfFamePage";
import AdminDataPage from "./pages/AdminDataPage";
import AdminLeagueSetting from "./pages/AdminLeagueSetting";

import LineCallbackPage from "./pages/LineCallbackPage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/line/callback" element={<LineCallbackPage />} />
            <Route path="/" element={<Navigate to="/main" replace />} />

            {/* AppLayout wraps all app pages */}
            <Route path="/" element={<AppLayout />}>
              {/* Public — no login required */}
              <Route path="main" element={<MainPage />} />
              <Route path="standings" element={<StandingPage />} />
              <Route path="matches" element={<PublicMatchesPage />} />
              <Route path="auction-results" element={<CompletedAuctionPage />} />
              <Route path="hall-of-fame" element={<HallOfFamePage />} />

              {/* Login required */}
              <Route
                path="fixtures"
                element={
                  <ProtectedRoute>
                    <FixturePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="auction"
                element={
                  <ProtectedRoute>
                    <AuctionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-squad"
                element={
                  <ProtectedRoute>
                    <MySquadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clubs-squad"
                element={
                  <ProtectedRoute>
                    <ClubSquadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="transfer-board"
                element={
                  <ProtectedRoute>
                    <TransferBoardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="deal-center"
                element={
                  <ProtectedRoute>
                    <MarketOverviewPage />
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
              <Route
                path="announcements"
                element={
                  <ProtectedRoute requiredRole={["admin", "moderator"]}>
                    <AnnouncementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/auction"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminAuctionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/manage-data"
                element={
                  <ProtectedRoute requiredRole={["admin", "moderator"]}>
                    <AdminDataPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/league-setting"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLeagueSetting />
                  </ProtectedRoute>
                }
              />

            </Route>

              <Route path="*" element={<Navigate to="/main" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
