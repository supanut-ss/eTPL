import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Campaign, Delete, Edit, Refresh } from "@mui/icons-material";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
  updateAnnouncement,
} from "../api/announcementApi";
import { useAuth } from "../store/AuthContext";

const emptyForm = {
  announcement: "",
  announcer: "",
  isActive: true,
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AnnouncementPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAnnouncements();
      setItems(res.data.data || []);
    } catch {
      showSnackbar("Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, announcer: user?.userId || "" });
    setOpenDialog(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setForm({
      announcement: item.announcement || "",
      announcer: item.announcer || user?.userId || "",
      isActive: Boolean(item.isActive),
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    const announcement = form.announcement.trim();
    if (!announcement) {
      showSnackbar("Announcement message is required", "error");
      return;
    }

    try {
      if (editing) {
        await updateAnnouncement(editing.id, {
          announcement,
          announcer: form.announcer?.trim() || user?.userId || "system",
          isActive: form.isActive,
        });
        showSnackbar("Announcement updated");
      } else {
        await createAnnouncement({
          announcement,
          announcer: form.announcer?.trim() || user?.userId || "system",
          isActive: form.isActive,
        });
        showSnackbar("Announcement created");
      }
      setOpenDialog(false);
      setForm(emptyForm);
      setEditing(null);
      await loadData();
    } catch {
      showSnackbar("Save failed", "error");
    }
  };

  const handleToggle = async (item) => {
    try {
      await toggleAnnouncement(item.id, !item.isActive);
      await loadData();
    } catch {
      showSnackbar("Failed to update status", "error");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;

    try {
      await deleteAnnouncement(item.id);
      showSnackbar("Announcement deleted");
      await loadData();
    } catch {
      showSnackbar("Delete failed", "error");
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
          <Campaign color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Manage Announcements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              NEWS & UPDATES
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={1}>

          <Button
            variant="contained"
            disableElevation
            startIcon={<Add />}
            onClick={handleOpenCreate}
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
            Add Announcement
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2.5 }}>
        Active announcements are shown on the dashboard and rotate automatically
        when multiple messages exist.
      </Alert>

      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 700, width: "45%" }}>
                  Message
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Announcer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {item.announcement}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.announcer || "-"}</TableCell>
                  <TableCell>{formatDateTime(item.createDate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.isActive ? "Active" : "Hidden"}
                      color={item.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="flex-end"
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenEdit(item)}
                        startIcon={<Edit fontSize="small" />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color={item.isActive ? "warning" : "success"}
                        onClick={() => handleToggle(item)}
                      >
                        {item.isActive ? "Hide" : "Show"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(item)}
                        startIcon={<Delete fontSize="small" />}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">
                      No announcements
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing ? "Edit announcement" : "Create announcement"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label="Announcement message"
              multiline
              minRows={4}
              value={form.announcement}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  announcement: event.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Announcer"
              value={form.announcer}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, announcer: event.target.value }))
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                />
              }
              label="Show on dashboard"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ minWidth: 240 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AnnouncementPage;
