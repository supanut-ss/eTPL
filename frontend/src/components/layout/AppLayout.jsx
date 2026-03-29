import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Button,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Logout,
  Security,
  SportsSoccer,
  Leaderboard,
  CalendarMonth,
  LockReset,
} from "@mui/icons-material";
import { useAuth } from "../../store/AuthContext";
import ChangePasswordDialog from "../ChangePasswordDialog";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Dashboard", path: "/main", icon: <Dashboard /> },
  { label: "Standings", path: "/standings", icon: <Leaderboard /> },
  { label: "Matches", path: "/matches", icon: <CalendarMonth /> },
  {
    label: "Fixtures",
    path: "/fixtures",
    icon: <SportsSoccer />,
    loginRequired: true,
  },
  { label: "Manage Users", path: "/users", icon: <People />, adminOnly: true },
  {
    label: "Permissions",
    path: "/permissions",
    icon: <Security />,
    adminOnly: true,
  },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = () => {
    setAnchorEl(null);
    setChangePasswordOpen(true);
  };

  const filteredNav = navItems.filter((item) => {
    if (item.adminOnly && user?.userLevel !== "admin") return false;
    if (item.loginRequired && !user) return false;
    return true;
  });

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" fontWeight="bold" color="primary">
          eTPL
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredNav.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            eTPL
          </Typography>

          {user ? (
            <>
              <Tooltip title={user?.userId}>
                <IconButton
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  color="inherit"
                >
                  <Avatar
                    src={user?.linePic || ""}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "secondary.main",
                      fontSize: 14,
                    }}
                  >
                    {!user?.linePic && user?.userId?.[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem disabled>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      src={user?.linePic || ""}
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "secondary.main",
                        fontSize: 14,
                      }}
                    >
                      {!user?.linePic && user?.userId?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        lineHeight={1.2}
                      >
                        {user?.userId}
                      </Typography>
                      {user?.lineName && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          lineHeight={1.2}
                        >
                          {user.lineName}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleChangePassword}>
                  <LockReset sx={{ mr: 1 }} fontSize="small" />
                  Change Password
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 1 }} fontSize="small" />
                  Logout
                </MenuItem>
              </Menu>
              <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                user={user}
              />
            </>
          ) : (
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              sx={{ borderColor: "rgba(255,255,255,0.5)", color: "white" }}
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Drawer — Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Drawer — Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          backgroundColor: "background.default",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AppLayout;
