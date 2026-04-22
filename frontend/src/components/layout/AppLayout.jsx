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
  Login,
  Campaign,
  AttachMoney,
  EmojiEvents,
  Storefront,
  Handshake,
  ManageAccounts,
  Gavel,
  Settings,
  HotelClass,
  MilitaryTech,
  Storage,
} from "@mui/icons-material";
import { useAuth } from "../../store/AuthContext";
import ChangePasswordDialog from "../ChangePasswordDialog";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Dashboard", path: "/main", icon: <Dashboard /> },
  { label: "Standings", path: "/standings", icon: <Leaderboard /> },
  { label: "Matches", path: "/matches", icon: <CalendarMonth /> },
  { label: "Hall of Fame", path: "/hall-of-fame", icon: <MilitaryTech /> },
  { label: "Auction Board", path: "/auction-results", icon: <HotelClass /> },
  {
    label: "My Fixtures",
    path: "/fixtures",
    icon: <SportsSoccer />,
    loginRequired: true,
  },
  {
    label: "My Team",
    path: "/my-squad",
    icon: <EmojiEvents />,
    loginRequired: true,
  },
   {
    label: "League Teams",
    path: "/clubs-squad",
    icon: <People />,
    loginRequired: true,
  },
  {
    label: "Auction",
    path: "/auction",
    icon: <Gavel />,
    loginRequired: true,
  },
  {
    label: "Transfer Market",
    path: "/transfer-board",
    icon: <Storefront />,
    loginRequired: true,
  },
  {
    label: "Transfer Center",
    path: "/deal-center",
    icon: <Handshake />,
    loginRequired: true,
  },
  { label: "Manage Users", path: "/users", icon: <ManageAccounts />, adminOnly: true },
  {
    label: "Permissions",
    path: "/permissions",
    icon: <Security />,
    adminOnly: true,
  },
  {
    label: "Auction Settings",
    path: "/admin/auction",
    icon: <Settings />,
    adminOnly: true,
  },
  {
    label: "Data Management",
    path: "/admin/manage-data",
    icon: <Storage />,
    adminOnly: true,
  },
  {
    label: "Announcements",
    path: "/announcements",
    icon: <Campaign />,
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

  const handleLogin = () => {
    setAnchorEl(null);
    navigate("/login");
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

          <>
            <Tooltip title={user?.userId || "Profile"}>
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
                  {(user?.userId || "G")[0]?.toUpperCase()}
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
                    {(user?.userId || "G")[0]?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      lineHeight={1.2}
                    >
                      {user?.userId || "Guest"}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      lineHeight={1.2}
                    >
                      {user?.lineName ||
                        (user ? user?.userLevel : "Not signed in")}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <Divider />

              {user ? (
                <>
                  <MenuItem onClick={handleChangePassword}>
                    <LockReset sx={{ mr: 1 }} fontSize="small" />
                    Change Password
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Logout sx={{ mr: 1 }} fontSize="small" />
                    Logout
                  </MenuItem>
                </>
              ) : (
                <MenuItem onClick={handleLogin}>
                  <Login sx={{ mr: 1 }} fontSize="small" />
                  Sign In
                </MenuItem>
              )}
            </Menu>

            {user && (
              <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                user={user}
              />
            )}
          </>
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
          px: { xs: 1.5, sm: 2.5, lg: 3.5 },
          py: { xs: 2, sm: 2.5, lg: 3 },
          mt: 8,
          minHeight: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          background:
            "radial-gradient(circle at top right, rgba(99,102,241,0.08), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 1680, mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
