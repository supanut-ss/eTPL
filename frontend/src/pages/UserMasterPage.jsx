import { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Edit, Delete, Refresh, Person, ManageAccounts } from "@mui/icons-material";
import { getUsers, createUser, updateUser, deleteUser } from "../api/userApi";
import { useAuth } from "../store/AuthContext";

const LEVELS = ["admin", "user"];
const defaultForm = {
  userId: "",
  password: "",
  userLevel: "user",
  lineId: "",
  linePic: "",
  lineName: "",
};

const UserMasterPage = () => {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
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

  const validate = () => {
    const e = {};
    if (!editTarget && !form.userId.trim()) e.userId = "Please enter User ID";
    if (!editTarget && !form.password.trim())
      e.password = "Please enter password";
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
    } catch {
      showSnackbar("Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      field: "userId",
      headerName: "User ID",
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: "primary.main",
              fontSize: 12,
            }}
          >
            {params.value?.[0]?.toUpperCase()}
          </Avatar>
          {params.value}
        </Box>
      ),
    },
    {
      field: "userLevel",
      headerName: "Level",
      width: 110,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === "admin" ? "primary" : "default"}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    { field: "lineName", headerName: "LINE Name", flex: 1 },
    { field: "lineId", headerName: "LINE ID", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box display="flex" gap={0.5}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenEdit(params.row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              params.row.userId === currentUser?.userId
                ? "Cannot delete yourself"
                : "Delete"
            }
          >
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setDeleteTarget(params.row);
                  setDeleteDialogOpen(true);
                }}
                disabled={params.row.userId === currentUser?.userId}
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
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <ManageAccounts color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Manage Users
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MEMBER DATABASE • {rows.length} users
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>

          <Button
            variant="contained"
            disableElevation
            startIcon={<Add />}
            onClick={handleOpenAdd}
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
            Add User
          </Button>
        </Box>
      </Box>

      {/* DataGrid */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          getRowId={(row) => row.userId}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "grey.50",
              fontWeight: 700,
            },
            "& .MuiDataGrid-row:hover": { bgcolor: "primary.50" },
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
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
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              required={!editTarget}
              error={!!errors.password}
              helperText={errors.password}
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
