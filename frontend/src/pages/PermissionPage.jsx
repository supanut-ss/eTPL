import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
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
import { Security, Save, Info, ExpandLess, ExpandMore } from "@mui/icons-material";
import { getPermissions, updatePermissions } from "../api/permissionApi";
import { useMediaQuery, useTheme } from "@mui/material";

// Grouped menus matching side menu structure in AppLayout
const MENU_GROUPS = [
  {
    label: "Transfer",
    children: [
      { key: "auction", label: "Auction" },
      { key: "transfer-board", label: "Transfer Market" },
      { key: "deal-center", label: "Transfer Center" },
    ]
  },
  {
    label: "My Club",
    children: [
      { key: "fixtures", label: "My Fixtures" },
      { key: "my-squad", label: "My Team" },
      { key: "pitch-view", label: "Pitch View" },
      { key: "clubs-squad", label: "League Teams" },
    ]
  },
  {
    label: "Admin",
    children: [
      { key: "users", label: "Manage Users" },
      { key: "permissions", label: "Permissions" },
      { key: "admin-auction", label: "Auction Settings" },
      { key: "admin-active-auctions", label: "Manage Active Auctions" },
      { key: "admin-manage-data", label: "Data Management" },
      { key: "admin-sponsors", label: "Manage Sponsors" },
      { key: "admin-league-setting", label: "League Setting" },
      { key: "admin-league-ops", label: "League Ops" },
      { key: "announcements", label: "Announcements" },
    ]
  }
];

const ALL_MENUS = MENU_GROUPS.flatMap(g => g.children);

const ALL_LEVELS = ["admin", "moderator", "user"];

const LEVEL_COLORS = {
  admin: "primary",
  moderator: "warning",
  user: "default",
};


// admin level is always locked to 'true'
const isLocked = (menuKey, userLevel) => userLevel === "admin";

const getFixedValue = (menuKey, userLevel) => {
  if (userLevel === "admin") return true;
  return null;
};

const buildKey = (menuKey, userLevel) => `${menuKey}|${userLevel}`;


const PermissionPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [matrix, setMatrix] = useState({}); // { "dashboard|admin": true, ... }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [expandedGroups, setExpandedGroups] = useState({
    "Transfer": true,
    "My Club": true,
    "Admin": true
  });

  const toggleGroup = (groupLabel) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const handleGroupToggle = (group, level, isChecked) => {
    setMatrix(prev => {
      const next = { ...prev };
      group.children.forEach(child => {
        if (!isLocked(child.key, level)) {
          next[buildKey(child.key, level)] = isChecked;
        }
      });
      return next;
    });
  };

  const getGroupStatus = (group, level) => {
    const activeChildren = group.children;
    if (activeChildren.length === 0) return { checked: false, indeterminate: false };
    
    let checkedCount = 0;
    let unlockedCount = 0;
    
    activeChildren.forEach(child => {
      const locked = isLocked(child.key, level);
      const fixedValue = getFixedValue(child.key, level);
      const checked = fixedValue ?? matrix[buildKey(child.key, level)] ?? false;
      
      if (checked) checkedCount++;
      if (!locked) unlockedCount++;
    });
    
    return {
      checked: checkedCount === activeChildren.length,
      indeterminate: checkedCount > 0 && checkedCount < activeChildren.length
    };
  };

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

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
            map[k] = level === "admin";
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
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: 4,
        px: { xs: 1, sm: 0 }
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
          fullWidth={isMobile}
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
          <TableContainer 
            sx={{ 
              overflowX: 'auto',
              maxHeight: 'calc(100vh - 340px)',
              '&::-webkit-scrollbar': { width: 8, height: 8 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.08)', borderRadius: 4 }
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 1000, bgcolor: "grey.50", width: 260, py: 1.5 }}>
                    Menu
                  </TableCell>
                  {ALL_LEVELS.map((level) => (
                    <TableCell
                      key={level}
                      align="center"
                      sx={{ fontWeight: 1000, bgcolor: "grey.50", minWidth: 120, py: 1.5 }}
                    >
                      <Chip
                        label={level}
                        color={LEVEL_COLORS[level]}
                        size="small"
                        sx={{ fontWeight: 1000 }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {MENU_GROUPS.map((group) => (
                  <React.Fragment key={group.label}>
                    {/* Parent Group Row */}
                    <TableRow sx={{ bgcolor: "grey.100", '&:hover': { bgcolor: "grey.200" } }}>
                      <TableCell sx={{ py: 0.5 }}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <IconButton size="small" onClick={() => toggleGroup(group.label)} sx={{ p: 0.25, mr: 0.5 }}>
                            {expandedGroups[group.label] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                          </IconButton>
                          <Typography variant="body2" fontWeight="1000" color="primary.main" sx={{ letterSpacing: 0.5 }}>
                            {group.label.toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      {ALL_LEVELS.map((level) => {
                        const { checked, indeterminate } = getGroupStatus(group, level);
                        const isLevelAdmin = level === "admin";
                        return (
                          <TableCell key={level} align="center" sx={{ py: 0.5 }}>
                            <Checkbox
                              checked={checked}
                              indeterminate={indeterminate}
                              disabled={isLevelAdmin}
                              onChange={(e) => handleGroupToggle(group, level, e.target.checked)}
                              size="small"
                              color="primary"
                              sx={{ p: 0.5 }}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    {/* Children Rows */}
                    {expandedGroups[group.label] && group.children.map((child, idx) => (
                      <TableRow
                        key={child.key}
                        sx={{
                          bgcolor: idx % 2 === 0 ? "white" : "grey.50",
                          "&:hover": { bgcolor: "primary.50" },
                          "& td": { py: 0.25 }
                        }}
                      >
                        <TableCell sx={{ py: 0.25, pl: 5 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.9rem', lineHeight: 1 }}>
                              └─
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="text.primary">
                              {child.label}
                            </Typography>
                          </Box>
                        </TableCell>
                        {ALL_LEVELS.map((level) => {
                          const locked = isLocked(child.key, level);
                          const fixedValue = getFixedValue(child.key, level);
                          const checked = fixedValue ?? matrix[buildKey(child.key, level)] ?? false;
                          return (
                            <TableCell key={level} align="center" sx={{ py: 0.25 }}>
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
                                    onChange={() => handleToggle(child.key, level)}
                                    color={
                                      level === "admin" ? "primary" : "success"
                                    }
                                    size="small"
                                    sx={{ p: 0.5 }}
                                  />
                                </span>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </React.Fragment>
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
