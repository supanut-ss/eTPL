import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Edit, Delete, Refresh, Person, ManageAccounts, Badge, Visibility, VisibilityOff, Search, Clear } from "@mui/icons-material";
import { getUsers, createUser, updateUser, deleteUser, getClubLogos } from "../api/userApi";
import { useAuth } from "../store/AuthContext";
import auctionService from "../services/auctionService";
import { InputAdornment, Autocomplete } from "@mui/material";

const LEVELS = ["admin", "moderator", "user"];
const defaultForm = {
  userId: "",
  password: "",
  userLevel: "user",
  lineId: "",
  linePic: "",
  lineName: "",
  currentTeam: "",
  teamNickname: "",
  currentDivision: "",
};

const UserMasterPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [clubLogos, setClubLogos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        const uId = (row.userId || "").toLowerCase();
        const lName = (row.lineName || "").toLowerCase();
        const cTeam = (row.currentTeam || "").toLowerCase();
        const tNick = (row.teamNickname || "").toLowerCase();
        const cDiv = (row.currentDivision || "").toLowerCase();
        
        return (
          uId.includes(query) ||
          lName.includes(query) ||
          cTeam.includes(query) ||
          tNick.includes(query) ||
          cDiv.includes(query)
        );
      });
    }
    
    return result.sort((a, b) => {
      const divA = a.currentDivision || "";
      const divB = b.currentDivision || "";
      
      if (divA !== divB) {
        if (divA === "") return 1;
        if (divB === "") return -1;
        return divA.localeCompare(divB);
      }
      
      const userA = a.userId || "";
      const userB = b.userId || "";
      return userA.localeCompare(userB, undefined, { sensitivity: "accent", numeric: true });
    });
  }, [rows, searchQuery]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setRows(res.data.data || []);
    } catch {
      showSnackbar("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchClubLogos = useCallback(async () => {
    try {
      const res = await getClubLogos();
      setClubLogos(res.data || []);
    } catch (err) {
      console.error("Failed to load club logos", err);
    }
  }, []);

  useEffect(() => {
    fetchClubLogos();
  }, [fetchClubLogos]);

  const validate = () => {
    const e = {};
    if (!editTarget && !form.userId.trim()) e.userId = "Please enter User ID";
    if (!editTarget && !form.password.trim())
      e.password = "Please enter password";

    // Validate currentTeam uniqueness
    const teamVal = form.currentTeam?.trim();
    if (teamVal && teamVal.toLowerCase() !== "no team" && teamVal !== "—") {
      const isDuplicate = rows.some((row) => {
        // If editing, skip the current user being edited
        if (editTarget && row.userId === editTarget.userId) return false;
        return row.currentTeam?.trim().toLowerCase() === teamVal.toLowerCase();
      });
      if (isDuplicate) {
        e.currentTeam = "สโมสรนี้ถูกใช้งานโดยสมาชิกท่านอื่นแล้ว!";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleOpenAdd = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditTarget(row);
    setForm({
      userId: row.userId,
      password: "",
      userLevel: row.userLevel,
      lineId: row.lineId || "",
      linePic: row.linePic || "",
      lineName: row.lineName || "",
      currentTeam: row.currentTeam || "",
      teamNickname: row.teamNickname || "",
      currentDivision: row.currentDivision || "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateUser(editTarget.userId, form);
        showSnackbar("User updated successfully");
      } else {
        await createUser(form);
        showSnackbar("User added successfully");
      }
      setDialogOpen(false);
      fetchUsers();
      fetchClubLogos();
    } catch (err) {
      showSnackbar(err.response?.data?.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteUser(deleteTarget.userId);
      showSnackbar("User deleted successfully");
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      field: "userId",
      headerName: "User Identity",
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={2} sx={{ py: 1 }}>
          <Avatar
            src={params.row.linePic}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.soft",
              color: "primary.main",
              fontWeight: "bold",
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: "2px solid #fff"
            }}
          >
            {params.value?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {params.value}
            </Typography>
            {params.row.lineName && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>
                {params.row.lineName}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: "userLevel",
      headerName: "Access Role",
      width: 140,
      renderCell: (params) => {
        const level = params.value?.toLowerCase();
        let color = "default";
        let bgColor = "rgba(0,0,0,0.05)";
        let textColor = "#666";

        if (level === "admin") {
          bgColor = "rgba(25, 118, 210, 0.12)";
          textColor = "#1976d2";
        } else if (level === "moderator") {
          bgColor = "rgba(237, 108, 2, 0.12)";
          textColor = "#ed6c02";
        }

        return (
          <Chip
            label={level?.toUpperCase()}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              bgcolor: bgColor,
              color: textColor,
              border: "1px solid",
              borderColor: "transparent",
              borderRadius: "6px",
              height: 24
            }}
          />
        );
      },
    },
    {
      field: "lineId",
      headerName: "LINE Connection",
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" color={params.value ? "text.primary" : "text.disabled"}>
          {params.value || "—"}
        </Typography>
      )
    },
    {
      field: "currentTeam",
      headerName: "Current Team",
      width: 180,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Badge fontSize="small" sx={{ color: params.value ? 'primary.main' : 'text.disabled', fontSize: 18 }} />
          <Typography variant="body2" fontWeight={600}>
            {params.value || "No Team"}
          </Typography>
        </Box>
      )
    },
    {
      field: "teamNickname",
      headerName: "Nickname",
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" color={params.value ? "text.primary" : "text.disabled"}>
          {params.value || "—"}
        </Typography>
      )
    },
    {
      field: "currentDivision",
      headerName: "Division",
      width: 140,
      renderCell: (params) => {
        const div = params.value;
        if (!div) return <Typography variant="body2" color="text.disabled">—</Typography>;
        return (
          <Chip
            label={div}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: '0.65rem',
              bgcolor: div === "D1" ? "rgba(76, 175, 80, 0.12)" : "rgba(156, 39, 176, 0.12)",
              color: div === "D1" ? "#2e7d32" : "#9c27b0",
              border: "1px solid",
              borderColor: div === "D1" ? "rgba(76, 175, 80, 0.24)" : "rgba(156, 39, 176, 0.24)",
              borderRadius: "6px",
              height: 24
            }}
          />
        );
      }
    },
    {
      field: "actions",
      headerName: "Options",
      width: 120,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Tooltip title="Edit Profile">
            <IconButton
              size="small"
              onClick={() => handleOpenEdit(params.row)}
              sx={{
                color: "primary.main",
                transition: 'all 0.2s ease',
                "&:hover": {
                  bgcolor: "transparent",
                  color: "primary.dark",
                  transform: 'scale(1.2)',
                }
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              params.row.userId === currentUser?.userId
                ? "Self-deletion restricted"
                : "Remove User"
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  setDeleteTarget(params.row);
                  setDeleteDialogOpen(true);
                }}
                disabled={params.row.userId === currentUser?.userId}
                sx={{
                  color: "error.main",
                  transition: 'all 0.2s ease',
                  "&:hover": {
                    bgcolor: "transparent",
                    color: "error.dark",
                    transform: 'scale(1.2)',
                  }
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Section */}
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
          <ManageAccounts color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Member Control
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MANAGE USER ACCOUNTS AND ACCESS LEVELS • {searchQuery ? `${filteredAndSortedRows.length} OF ` : ""}{rows.length} TOTAL
            </Typography>
          </Box>
        </Box>


        <Button
          fullWidth={isMobile}
          variant="contained"
          disableElevation
          startIcon={<Add />}
          onClick={handleOpenAdd}
          sx={{
            borderRadius: '14px',
            textTransform: 'none',
            fontWeight: 800,
            px: 4,
            height: 48,
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(25, 118, 210, 0.25)',
            "&:hover": {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.35)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          Add New Member
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="ค้นหาตาม User ID, ชื่อ Line, ทีม หรือ Division..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            bgcolor: "background.paper",
            borderRadius: "14px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px",
              bgcolor: "background.paper",
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton onClick={() => setSearchQuery("")} edge="end" size="small">
                  <Clear />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* DataGrid Section */}
      <Paper elevation={0} sx={{
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: '0 12px 24px rgba(0,0,0,0.03)'
      }}>
        <DataGrid
          rows={filteredAndSortedRows}
          columns={columns}
          loading={loading}
          autoHeight
          getRowId={(row) => row.userId}
          rowHeight={72}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "rgba(0,0,0,0.02)",
              borderBottom: "1px solid",
              borderColor: "divider",
              color: "text.secondary",
              textTransform: "uppercase",
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid rgba(0,0,0,0.04)",
              "&:focus": { outline: "none" }
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "rgba(25, 118, 210, 0.02)",
              cursor: 'pointer'
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid",
              borderColor: "divider",
            }
          }}
        />
      </Paper>


      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editTarget ? "✏️ Edit User" : "➕ Add New User"}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={2}>
            <TextField
              label="User ID"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              fullWidth
              required
              disabled={!!editTarget}
              error={!!errors.userId}
              helperText={errors.userId}
              placeholder="e.g. john.doe"
            />
            <TextField
              label={
                editTarget
                  ? "New Password (leave blank to keep unchanged)"
                  : "Password"
              }
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              required={!editTarget}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="User Level"
              select
              value={form.userLevel}
              onChange={(e) => setForm({ ...form, userLevel: e.target.value })}
              fullWidth
            >
              {LEVELS.map((l) => (
                <MenuItem key={l} value={l}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Current Division"
              select
              value={form.currentDivision || ""}
              onChange={(e) => setForm({ ...form, currentDivision: e.target.value })}
              fullWidth
              helperText="เลือก Division สำหรับผู้เล่น D1/D2"
            >
              <MenuItem value="">— None —</MenuItem>
              <MenuItem value="D1">D1</MenuItem>
              <MenuItem value="D2">D2</MenuItem>
            </TextField>
            <Autocomplete
              options={clubLogos}
              value={form.currentTeam || null}
              onChange={(event, newValue) => {
                setForm((prev) => ({ ...prev, currentTeam: newValue || "" }));
              }}
              onInputChange={(event, newInputValue) => {
                setForm((prev) => ({ ...prev, currentTeam: newInputValue || "" }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Current Team"
                  helperText={errors.currentTeam || "Search and select a club logo"}
                  placeholder="Type to search..."
                  error={!!errors.currentTeam}
                />
              )}
              isOptionEqualToValue={(option, value) => option === value}
              fullWidth
              freeSolo
            />
            <TextField
              label="Team Nickname"
              value={form.teamNickname}
              onChange={(e) => setForm({ ...form, teamNickname: e.target.value })}
              fullWidth
              helperText="Nickname or short name for the team"
            />
            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                LINE Information (optional)
              </Typography>
            </Divider>
            <TextField
              label="LINE Name"
              value={form.lineName}
              onChange={(e) => setForm({ ...form, lineName: e.target.value })}
              fullWidth
            />
            <TextField
              label="LINE ID"
              value={form.lineId}
              onChange={(e) => setForm({ ...form, lineId: e.target.value })}
              fullWidth
            />
            <TextField
              label="LINE Picture URL"
              value={form.linePic}
              onChange={(e) => setForm({ ...form, linePic: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !saving && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ color: "error.main" }}>
          🗑️ Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user{" "}
            <strong>{deleteTarget?.userId}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={saving}
            startIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default UserMasterPage;
