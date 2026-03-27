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

// รายการ menus ที่ตรงกับ backend PermissionService.AllMenus
const ALL_MENUS = [
  { key: "dashboard", label: "Dashboard", description: "หน้าหลัก/ภาพรวมระบบ" },
  { key: "users", label: "จัดการผู้ใช้", description: "เพิ่ม แก้ไข ลบ user" },
  {
    key: "permissions",
    label: "จัดการสิทธิ์",
    description: "กำหนดสิทธิ์การเข้าถึงเมนู",
  },
];

const ALL_LEVELS = ["admin", "user"];

const LEVEL_COLORS = {
  admin: "primary",
  user: "default",
};

// admin กับ dashboard lock ไว้ ห้ามแก้
const isLocked = (menuKey, userLevel) =>
  menuKey === "dashboard" ||
  (menuKey === "permissions" && userLevel === "admin") ||
  (menuKey === "users" && userLevel === "admin");

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
      // ถ้ายังไม่มีข้อมูล seed default
      ALL_MENUS.forEach(({ key }) => {
        ALL_LEVELS.forEach((level) => {
          const k = buildKey(key, level);
          if (!(k in map)) {
            map[k] = level === "admin" || key === "dashboard";
          }
        });
      });
      setMatrix(map);
    } catch {
      showSnackbar("โหลดข้อมูลสิทธิ์ไม่สำเร็จ", "error");
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
          permissions.push({
            menuKey: key,
            userLevel: level,
            canAccess: matrix[buildKey(key, level)] ?? false,
          });
        });
      });
      await updatePermissions(permissions);
      showSnackbar("บันทึกสิทธิ์สำเร็จ ✅");
    } catch {
      showSnackbar("บันทึกไม่สำเร็จ", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Security color="primary" />
          <Typography variant="h5" fontWeight="bold">
            จัดการสิทธิ์การเข้าถึง
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : <Save />
          }
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <strong>หมายเหตุ:</strong> Dashboard เข้าได้ทุก Level • Admin
        เข้าได้ทุกเมนูที่ล็อกไว้ • การเปลี่ยนแปลงจะมีผลเมื่อ user login
        ครั้งถัดไป
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
                    เมนู
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
                      const checked = matrix[buildKey(key, level)] ?? false;
                      return (
                        <TableCell key={level} align="center">
                          <Tooltip
                            title={
                              locked
                                ? "ค่าตายตัว ไม่สามารถเปลี่ยนได้"
                                : checked
                                  ? "คลิกเพื่อปิดสิทธิ์"
                                  : "คลิกเพื่อเปิดสิทธิ์"
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
            <Typography variant="caption">เข้าถึงได้</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Checkbox checked={false} disabled size="small" />
            <Typography variant="caption">ไม่มีสิทธิ์</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Checkbox checked disabled size="small" sx={{ opacity: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              ล็อก (ไม่สามารถเปลี่ยนได้)
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
