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
  useTheme,
  useMediaQuery,
  Collapse,
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
  ExpandLess,
  ExpandMore,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useAuth } from "../../store/AuthContext";
import ChangePasswordDialog from "../ChangePasswordDialog";
import NotificationMenu from "../NotificationMenu";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Dashboard", path: "/main", icon: <Dashboard /> },
  { label: "Standings", path: "/standings", icon: <Leaderboard /> },
  { label: "Matches", path: "/matches", icon: <CalendarMonth /> },
  { label: "Cup Bracket", path: "/cup-bracket", icon: <EmojiEvents /> },
  { label: "Hall of Fame", path: "/hall-of-fame", icon: <MilitaryTech /> },
  { label: "Auction Board", path: "/auction-results", icon: <HotelClass /> },
  {
    label: "My Fixtures",
    path: "/fixtures",
    icon: <SportsSoccer />,
    loginRequired: true,
    key: "fixtures",
  },
  {
    label: "My Team",
    path: "/my-squad",
    icon: <EmojiEvents />,
    loginRequired: true,
    key: "my-squad",
  },
  {
    label: "League Teams",
    path: "/clubs-squad",
    icon: <People />,
    loginRequired: true,
    key: "clubs-squad",
  },
  {
    label: "Auction",
    path: "/auction",
    icon: <Gavel />,
    loginRequired: true,
    key: "auction",
  },
  {
    label: "Transfer Market",
    path: "/transfer-board",
    icon: <Storefront />,
    loginRequired: true,
    key: "transfer-board",
  },
  {
    label: "Transfer Center",
    path: "/deal-center",
    icon: <Handshake />,
    loginRequired: true,
    key: "deal-center",
  },
  {
    label: "Admin",
    icon: <AdminPanelSettings />,
    key: "admin-group",
    children: [
      {
        label: "Manage Users",
        path: "/users",
        icon: <ManageAccounts />,
        key: "users",
      },
      {
        label: "Permissions",
        path: "/permissions",
        icon: <Security />,
        key: "permissions",
      },
      {
        label: "Auction Settings",
        path: "/admin/auction",
        icon: <Settings />,
        key: "admin-auction",
      },
      {
        label: "Data Management",
        path: "/admin/manage-data",
        icon: <Storage />,
        key: "admin-manage-data",
      },
      {
        label: "League Setting",
        path: "/admin/league-setting",
        icon: <EmojiEvents />,
        key: "admin-league-setting",
      },
      {
        label: "Announcements",
        path: "/announcements",
        icon: <Campaign />,
        key: "announcements",
      },
    ],
  },
];


const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, accessibleMenus } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDrawerExpanded = isMobile ? true : desktopOpen;

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

  const filterMenuItems = (items) => {
    return items
      .filter((item) => {
        // Public items (no key) are always shown
        if (!item.key) {
          if (item.loginRequired && !user) return false;
          return true;
        }

        // Admin group is shown if user is admin OR if it has children after filtering
        if (item.key === "admin-group") {
          if (user?.userLevel === "admin") return true;
          // We'll check children in the next step
          return true;
        }

        // Restricted items (with key) check against accessibleMenus
        if (user?.userLevel === "admin") return true;

        return (
          Array.isArray(accessibleMenus) && accessibleMenus.includes(item.key)
        );
      })
      .map((item) => {
        if (item.children) {
          const filteredChildren = filterMenuItems(item.children);
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return item;
      })
      .filter((item) => {
        // If it's a parent, only show if it has visible children OR user is admin
        if (item.children) {
          return item.children.length > 0 || user?.userLevel === "admin";
        }
        return true;
      });
  };

  const filteredNav = filterMenuItems(navItems);
  
  // Get current page title
  const getCurrentPageTitle = () => {
    // Flatten nav items including children
    const allItems = navItems.reduce((acc, item) => {
      acc.push(item);
      if (item.children) acc.push(...item.children);
      return acc;
    }, []);
    
    const current = allItems.find(item => item.path === location.pathname);
    return current?.label || "eTPL";
  };

  const pageTitle = getCurrentPageTitle();


  const drawer = (
    <Box>
      <Toolbar sx={{ justifyContent: isDrawerExpanded ? "flex-start" : "center", px: isDrawerExpanded ? 2 : 1.5, minHeight: 70 }}>
        <Typography
          variant="h5"
          fontWeight="900"
          sx={{
            background: "linear-gradient(90deg, #fff 0%, #6366f1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 1.5,
          }}
          noWrap
        >
          {isDrawerExpanded ? "eTPL" : "E"}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredNav.map((item) => {
          if (item.children) {
            return (
              <Box key={item.label}>
                <Tooltip
                  title={!isDrawerExpanded ? item.label : ""}
                  placement="right"
                >
                  <ListItem disablePadding sx={{ display: "block" }}>
                    <ListItemButton
                      onClick={() => setAdminOpen(!adminOpen)}
                      sx={{
                        minHeight: 48,
                        justifyContent: isDrawerExpanded ? "initial" : "center",
                        px: 2.5,
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: isDrawerExpanded ? 1.5 : "auto",
                          justifyContent: "center",
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                        }}
                        sx={{
                          opacity: isDrawerExpanded ? 1 : 0,
                          display: isDrawerExpanded ? "block" : "none",
                        }}
                      />
                      {isDrawerExpanded &&
                        (adminOpen ? <ExpandLess /> : <ExpandMore />)}
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
                <Collapse
                  in={adminOpen && isDrawerExpanded}
                  timeout="auto"
                  unmountOnExit
                >
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <Tooltip
                        key={child.path}
                        title={!isDrawerExpanded ? child.label : ""}
                        placement="right"
                      >
                        <ListItemButton
                          selected={location.pathname === child.path}
                          onClick={() => {
                            navigate(child.path);
                            if (isMobile) {
                              setMobileOpen(false);
                            }
                          }}
                          sx={{
                            minHeight: 44,
                            pl: isDrawerExpanded ? 4 : 2.5,
                            justifyContent: isDrawerExpanded
                              ? "initial"
                              : "center",
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0,
                              mr: isDrawerExpanded ? 1.5 : "auto",
                              justifyContent: "center",
                            }}
                          >
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              variant: "body2",
                              fontWeight:
                                location.pathname === child.path ? 700 : 500,
                            }}
                            sx={{
                              opacity: isDrawerExpanded ? 1 : 0,
                              display: isDrawerExpanded ? "block" : "none",
                            }}
                          />
                        </ListItemButton>
                      </Tooltip>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }

          return (
            <Tooltip
              title={!isDrawerExpanded ? item.label : ""}
              placement="right"
              key={item.path}
            >
              <ListItem disablePadding sx={{ display: "block" }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) {
                      setMobileOpen(false);
                    }
                  }}
                  sx={{
                    minHeight: 48,
                    justifyContent: isDrawerExpanded ? "initial" : "center",
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isDrawerExpanded ? 1.5 : "auto",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                    sx={{
                      opacity: isDrawerExpanded ? 1 : 0,
                      display: isDrawerExpanded ? "block" : "none",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
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
            onClick={() => {
              if (isMobile) {
                setMobileOpen(!mobileOpen);
              } else {
                setDesktopOpen(!desktopOpen);
              }
            }}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            fontWeight="800"
            sx={{
              flexGrow: 1,
              color: "white",
              letterSpacing: 1,
              ml: 1,
            }}
          >
            eTPL
          </Typography>

          {user && <NotificationMenu />}

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
          width: desktopOpen ? DRAWER_WIDTH : 65,
          flexShrink: 0,
          display: { xs: "none", sm: "block" },
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          "& .MuiDrawer-paper": {
            width: desktopOpen ? DRAWER_WIDTH : 65,
            boxSizing: "border-box",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: "hidden",
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
            "radial-gradient(circle at top right, rgba(99,102,241,0.05), transparent 40%), #f1f5f9",
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
