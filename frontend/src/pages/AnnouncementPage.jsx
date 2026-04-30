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
  Tabs,
  Tab,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Add, Campaign, Delete, Edit, Image, Refresh, Upload, Close } from "@mui/icons-material";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
  updateAnnouncement,
} from "../api/announcementApi";
import { uploadNewsImage } from "../api/uploadApi";
import { useAuth } from "../store/AuthContext";
import { getAnnouncementImageUrl } from "../utils/imageUtils";

const emptyForm = {
  announcement: "",
  announcer: "",
  imageUrl: "",
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
  const [tabValue, setTabValue] = useState(0);
  const [uploading, setUploading] = useState(false);
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
      imageUrl: item.imageUrl || "",
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
          imageUrl: form.imageUrl?.trim() || "",
          isActive: form.isActive,
        });
        showSnackbar("Announcement updated");
      } else {
        await createAnnouncement({
          announcement,
          announcer: form.announcer?.trim() || user?.userId || "system",
          imageUrl: form.imageUrl?.trim() || "",
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar("File size too large (max 5MB)", "error");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadNewsImage(file);
      const url = res.data.data.url;
      // In development, the API might return a relative path. 
      // We should prepend the API base URL if needed, but let's see.
      // Usually, the frontend handles relative paths if hosted together.
      setForm(prev => ({ ...prev, imageUrl: url }));
      showSnackbar("Image uploaded successfully");
    } catch (err) {
      showSnackbar("Upload failed", "error");
      console.error(err);
    } finally {
      setUploading(false);
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
        mb: 4,
        px: { xs: 1, sm: 0 }
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} aria-label="announcement tabs">
          <Tab label="Text Announcements" icon={<Campaign />} iconPosition="start" />
          <Tab label="News Media (Graphic)" icon={<Image />} iconPosition="start" />
        </Tabs>
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
              {items
                .filter(item => tabValue === 0 ? !item.imageUrl : !!item.imageUrl)
                .map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box display="flex" gap={2} alignItems="center">
                      {item.imageUrl && (
                        <Box
                          component="img"
                          src={getAnnouncementImageUrl(item.imageUrl)}
                          sx={{ width: 80, height: 45, borderRadius: 1, objectFit: 'cover', border: '1px solid #ddd' }}
                        />
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {item.announcement}
                      </Typography>
                    </Box>
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
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                NEWS IMAGE (GRAPHIC)
              </Typography>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Image URL"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        imageUrl: event.target.value,
                      }))
                    }
                    fullWidth
                    size="small"
                  />
                </Box>
                <Box>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="raised-button-file"
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="raised-button-file">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={uploading ? <CircularProgress size={20} /> : <Upload />}
                      disabled={uploading}
                      sx={{ height: 40, borderRadius: 2 }}
                    >
                      Upload
                    </Button>
                  </label>
                </Box>
              </Stack>
            </Box>

            {form.imageUrl && (
              <Box sx={{ mt: 1, position: 'relative' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>PREVIEW:</Typography>
                  <Button 
                    size="small" 
                    color="error" 
                    startIcon={<Close />} 
                    onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))}
                    sx={{ fontSize: 10 }}
                  >
                    Remove Image
                  </Button>
                </Box>
                <Box 
                  component="img" 
                  src={getAnnouncementImageUrl(form.imageUrl)} 
                  sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 2, border: '2px solid', borderColor: 'divider', mt: 0.5 }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL'; }}
                />
              </Box>
            )}

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
