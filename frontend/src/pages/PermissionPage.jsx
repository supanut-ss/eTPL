import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import { Security, Save, Info } from "@mui/icons-material";
import { getPermissions, updatePermissions } from "../api/permissionApi";

// List of menus matching backend PermissionService.AllMenus
const ALL_MENUS = [
  { key: "dashboard", label: "Dashboard", description: "Home / System overview" },
  { key: "standings", label: "Standings", description: "League table and rank" },
  { key: "matches", label: "Matches", description: "Public match history" },
  { key: "fixtures", label: "Fixtures", description: "Match reporting for players" },
  { key: "auction", label: "Auction Market", description: "Normal auction system" },
  { key: "transfer-board", label: "Transfer Market", description: "Private offer search" },
  { key: "deal-center", label: "Deal Center", description: "Manage incoming/outgoing offers" },
  { key: "my-squad", label: "My Squad", description: "Personal squad management" },
  { key: "users", label: "Manage Users", description: "Add, edit, delete users" },
  { key: "announcements", label: "Announcements", description: "Manage news and updates" },
  { key: "admin-auction", label: "Auction Settings", description: "System financial & timer rules" },
  { key: "permissions", label: "Permissions", description: "Define menu access permissions" },
];

const ALL_LEVELS = ["admin", "user"];

const LEVEL_COLORS = {
  admin: "primary",
  user: "default",
};

// dashboard is accessible by all; fixture access is admin-only; other admin menus stay locked for admin level
const isLocked = (menuKey, userLevel) =>
  menuKey === "dashboard" || userLevel === "admin";

const getFixedValue = (menuKey, userLevel) => {
  if (menuKey === "dashboard") return true;
  if (userLevel === "admin") return true;
  return null;
};

const PermissionPage = () => {
  const [matrix, setMatrix] = useState({}); // { "dashboard|admin": true, ... }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const buildKey = (menuKey, userLevel) => `${menuKey}|${userLevel}`;

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPermissions();
      const perms = res.data.data || [];
      const map = {};
      perms.forEach((p) => {
        map[buildKey(p.menuKey, p.userLevel)] = p.canAccess;
      });
      // if no data yet, seed defaults
      ALL_MENUS.forEach(({ key }) => {
        ALL_LEVELS.forEach((level) => {
          const k = buildKey(key, level);
          const fixedValue = getFixedValue(key, level);
          if (fixedValue !== null) {
            map[k] = fixedValue;
            return;
          }
          if (!(k in map)) {
            map[k] = level === "admin" || key === "dashboard";
          }
        });
      });
      setMatrix(map);
    } catch {
      showSnackbar("Failed to load permissions", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const handleToggle = (menuKey, userLevel) => {
    if (isLocked(menuKey, userLevel)) return;
    const k = buildKey(menuKey, userLevel);
    setMatrix((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const permissions = [];
      ALL_MENUS.forEach(({ key }) => {
        ALL_LEVELS.forEach((level) => {
          const fixedValue = getFixedValue(key, level);
          permissions.push({
            menuKey: key,
            userLevel: level,
            canAccess: fixedValue ?? matrix[buildKey(key, level)] ?? false,
          });
        });
      });
      await updatePermissions(permissions);
      showSnackbar("Permissions saved ✅");
    } catch {
      showSnackbar("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Security color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Access Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ROLE MANAGEMENT
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          disableElevation
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : <Save />
          }
          onClick={handleSave}
          disabled={saving || loading}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            height: 42,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
            transition: 'all 0.2s',
            "&:hover": { 
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)',
            },
          }}
        >
          {saving ? "Saving..." : "Save Permissions"}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <strong>Note:</strong> Dashboard is accessible by all levels • Admin can
        access all locked menus • Changes take effect on the user's next login
      </Alert>

      {/* Permission Matrix Table */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={8}
          >
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 700, width: 260 }}>
                    Menu
                  </TableCell>
                  {ALL_LEVELS.map((level) => (
                    <TableCell
                      key={level}
                      align="center"
                      sx={{ fontWeight: 700, minWidth: 120 }}
                    >
                      <Chip
                        label={level}
                        color={LEVEL_COLORS[level]}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ALL_MENUS.map(({ key, label, description }, idx) => (
                  <TableRow
                    key={key}
                    sx={{
                      bgcolor: idx % 2 === 0 ? "white" : "grey.50",
                      "&:hover": { bgcolor: "primary.50" },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {description}
                      </Typography>
                    </TableCell>
                    {ALL_LEVELS.map((level) => {
                      const locked = isLocked(key, level);
                      const fixedValue = getFixedValue(key, level);
                      const checked = fixedValue ?? matrix[buildKey(key, level)] ?? false;
                      return (
                        <TableCell key={level} align="center">
                          <Tooltip
                            title={
                              locked
                                ? "Fixed value, cannot be changed"
                                : checked
                                  ? "Click to disable"
                                  : "Click to enable"
                            }
                          >
                            <span>
                              <Checkbox
                                checked={checked}
                                disabled={locked}
                                onChange={() => handleToggle(key, level)}
                                color={
                                  level === "admin" ? "primary" : "success"
                                }
                                sx={{ "& .MuiSvgIcon-root": { fontSize: 28 } }}
                              />
                            </span>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Divider />
        <Box
          px={3}
          py={1.5}
          display="flex"
          gap={2}
          alignItems="center"
          bgcolor="grey.50"
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            <Checkbox checked disabled size="small" />
            <Typography variant="caption">Accessible</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Checkbox checked={false} disabled size="small" />
            <Typography variant="caption">No access</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Checkbox checked disabled size="small" sx={{ opacity: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Locked (cannot be changed)
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ minWidth: 250 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PermissionPage;
