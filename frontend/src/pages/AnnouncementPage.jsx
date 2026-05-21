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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Add, Campaign, Delete, Edit, Image, Refresh, Upload, Close, Facebook, Check, YouTube } from "@mui/icons-material";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
  updateAnnouncement,
  shareToFacebook,
} from "../api/announcementApi";
import {
  getHighlights,
  createHighlight,
  updateHighlight,
  toggleHighlight,
  deleteHighlight,
} from "../api/highlightApi";
import { uploadNewsImage } from "../api/uploadApi";
import { useAuth } from "../store/AuthContext";
import { getAnnouncementImageUrl } from "../utils/imageUtils";

const emptyForm = {
  announcement: "",
  announcer: "",
  imageUrl: "",
  isActive: true,
};

const DEFAULT_YOUTUBE_CHANNEL = "@iamcrazygamerch";

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

const normalizeYouTubeUrl = (value) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(www\.)?(youtube\.com|youtu\.be)\//i.test(raw)) return `https://${raw}`;
  return raw;
};

const getYouTubeVideoId = (value) => {
  const normalized = normalizeYouTubeUrl(value);
  if (!normalized) return "";

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();

    if (host.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) return watchId;

      const segments = url.pathname.split("/").filter(Boolean);
      const marker = segments.findIndex((s) => s === "embed" || s === "shorts" || s === "live");
      if (marker !== -1 && segments[marker + 1]) return segments[marker + 1];
    }
  } catch {
    return "";
  }

  return "";
};

const getYouTubeThumbnailUrl = (value) => {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "";
};

const getYouTubeWatchUrl = (value) => {
  const videoId = getYouTubeVideoId(value);
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  return normalizeYouTubeUrl(value);
};

const getYouTubeSubscribeUrl = (channelHandle) => {
  const raw = (channelHandle || DEFAULT_YOUTUBE_CHANNEL).trim();
  const handle = raw ? (raw.startsWith("@") ? raw : `@${raw}`) : DEFAULT_YOUTUBE_CHANNEL;
  return `https://www.youtube.com/${handle.replace(/\s+/g, "")}?sub_confirmation=1`;
};

const AnnouncementPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [eventItems, setEventItems] = useState([]);
  const [magazineItems, setMagazineItems] = useState([]);
  const [youtubeItems, setYoutubeItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [masterTab, setMasterTab] = useState(0); // 0 = News, 1 = Event, 2 = Magazine, 3 = YouTube
  const [uploading, setUploading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
      const [newsRes, eventRes, magRes, ytRes] = await Promise.all([
        getAnnouncements("News"),
        getAnnouncements("Event"),
        getAnnouncements("Magazine"),
        getHighlights().catch(() => ({ data: { data: [] } })),
      ]);
      setItems(newsRes.data.data || []);
      setEventItems(eventRes.data.data || []);
      setMagazineItems(magRes.data.data || []);
      setYoutubeItems(ytRes.data.data || []);
    } catch {
      showSnackbar("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      announcer: masterTab === 3 ? DEFAULT_YOUTUBE_CHANNEL : user?.userId || "",
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setForm({
      announcement: item.announcement || "",
      announcer:
        masterTab === 3
          ? item.announcer || DEFAULT_YOUTUBE_CHANNEL
          : item.announcer || user?.userId || "",
      imageUrl: item.imageUrl || "",
      isActive: Boolean(item.isActive),
      type: item.type || (masterTab === 3 ? "YouTube" : masterTab === 2 ? "Magazine" : masterTab === 1 ? "Event" : "News"),
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    const announcement = form.announcement.trim();
    if (!announcement) {
      showSnackbar("Title / message is required", "error");
      return;
    }

    // YouTube tab requires a URL
    if (masterTab === 3 && !form.imageUrl?.trim()) {
      showSnackbar("YouTube URL is required", "error");
      return;
    }

    try {
      if (masterTab === 3) {
        // ── YouTube Highlights ── use dedicated API
        const payload = {
          announcement,
          announcer: form.announcer?.trim() || DEFAULT_YOUTUBE_CHANNEL,
          imageUrl: form.imageUrl?.trim() || "",
          isActive: form.isActive,
        };
        if (editing) {
          await updateHighlight(editing.id, payload);
          showSnackbar("Highlight updated");
        } else {
          await createHighlight(payload);
          showSnackbar("Highlight created");
        }
      } else {
        // ── Announcements / Event / Magazine ── use announcement API
        const currentType = masterTab === 2 ? "Magazine" : masterTab === 1 ? "Event" : "News";
        const payload = {
          announcement,
          announcer: form.announcer?.trim() || user?.userId || "system",
          imageUrl: form.imageUrl?.trim() || "",
          isActive: form.isActive,
          type: currentType,
        };
        if (editing) {
          await updateAnnouncement(editing.id, payload);
          showSnackbar("Announcement updated");
        } else {
          await createAnnouncement(payload);
          showSnackbar("Announcement created");
        }
      }
      setOpenDialog(false);
      setForm(emptyForm);
      setEditing(null);
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Save failed";
      showSnackbar(msg, "error");
    }
  };

  const handleOpenYouTube = (item) => {
    const watchUrl = getYouTubeWatchUrl(item.imageUrl);
    if (!watchUrl) {
      showSnackbar("Invalid YouTube URL", "error");
      return;
    }

    const separator = watchUrl.includes("?") ? "&" : "?";
    const watchWithSubscribe = `${watchUrl}${separator}sub_confirmation=1`;
    window.open(watchWithSubscribe, "_blank", "noopener,noreferrer");

    const subscribeUrl = getYouTubeSubscribeUrl(item.announcer);
    window.open(subscribeUrl, "_blank", "noopener,noreferrer");
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
      if (masterTab === 3) {
        await toggleHighlight(item.id, !item.isActive);
      } else {
        await toggleAnnouncement(item.id, !item.isActive);
      }
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update status";
      showSnackbar(msg, "error");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      masterTab === 3 ? "Delete this highlight?" : "Delete this announcement?"
    );
    if (!confirmed) return;

    try {
      if (masterTab === 3) {
        await deleteHighlight(item.id);
        showSnackbar("Highlight deleted");
      } else {
        await deleteAnnouncement(item.id);
        showSnackbar("Announcement deleted");
      }
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Delete failed";
      showSnackbar(msg, "error");
    }
  };

  const handleShareFacebook = async (item) => {
    if (item.isSharedFacebook) return;
    
    const confirmed = window.confirm("Share this announcement to Facebook Page?");
    if (!confirmed) return;

    try {
      showSnackbar("Sharing to Facebook...", "info");
      await shareToFacebook(item.id);
      showSnackbar("Successfully shared to Facebook!");
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Share failed";
      showSnackbar(msg, "error");
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
            fullWidth={isMobile}
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
        <Tabs 
          value={masterTab} 
          onChange={(e, v) => setMasterTab(v)} 
          aria-label="master tabs"
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
        >
          <Tab label="System Announcements" icon={<Campaign />} iconPosition="start" />
          <Tab label="Event Updates" icon={<Image />} iconPosition="start" />
          <Tab label="AI Magazine" icon={<Image />} iconPosition="start" />
          <Tab label="YouTube Videos" icon={<YouTube />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Render Table Helper */}
      {(() => {
        let currentItems = [];
        let emptyMessage = "";
        let infoMessage = "";
        if (masterTab === 0) {
          currentItems = items;
          emptyMessage = "No announcements";
          infoMessage = "System announcements are displayed as text on the dashboard.";
        } else if (masterTab === 1) {
          currentItems = eventItems;
          emptyMessage = "No event updates found";
          infoMessage = "Event Updates are displayed in the Event box with an image and text.";
        } else if (masterTab === 2) {
          currentItems = magazineItems;
          emptyMessage = "No AI Magazine entries found";
          infoMessage = "AI Magazine entries are displayed in the top-left Magazine box on the dashboard.";
        } else if (masterTab === 3) {
          currentItems = youtubeItems;
          emptyMessage = "No YouTube videos added yet";
          infoMessage = "YouTube Videos are displayed as a 4-column grid section on the main page. Use the imageUrl field to store the YouTube link (e.g. https://youtu.be/VIDEO_ID). The title goes in the announcement field.";
        }

        return (
          <>
            <Alert severity="info" sx={{ mb: 2.5 }}>
              {infoMessage}
            </Alert>

            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.50" }}>
                      <TableCell sx={{ fontWeight: 700, width: "45%" }}>
                        Message / Title
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Announcer / Subtitle</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box display="flex" gap={2} alignItems="center">
                            {item.imageUrl && (
                              <Box
                                component="img"
                                src={masterTab === 3 ? getYouTubeThumbnailUrl(item.imageUrl) || "https://via.placeholder.com/160x90?text=YouTube" : getAnnouncementImageUrl(item.imageUrl)}
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
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {masterTab === 3 && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleOpenYouTube(item)}
                                startIcon={<YouTube fontSize="small" />}
                              >
                                Watch
                              </Button>
                            )}
                            <Button size="small" variant="outlined" onClick={() => handleOpenEdit(item)} startIcon={<Edit fontSize="small" />}>
                              Edit
                            </Button>
                            <Button size="small" variant="outlined" color={item.isActive ? "warning" : "success"} onClick={() => handleToggle(item)}>
                              {item.isActive ? "Hide" : "Show"}
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color={item.isSharedFacebook ? "success" : "primary"} 
                              onClick={() => handleShareFacebook(item)} 
                              disabled={item.isSharedFacebook}
                              startIcon={item.isSharedFacebook ? <Check fontSize="small" /> : <Facebook fontSize="small" />}
                            >
                              {item.isSharedFacebook ? "Shared" : "Share"}
                            </Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(item)} startIcon={<Delete fontSize="small" />}>
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}

                    {currentItems.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                          <Typography color="text.secondary">
                            {emptyMessage}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        );
      })()}



      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editing 
            ? (masterTab === 3 ? "Edit YouTube Video" : masterTab === 2 ? "Edit Magazine Entry" : masterTab === 1 ? "Edit Event Update" : "Edit Announcement") 
            : (masterTab === 3 ? "Add YouTube Video" : masterTab === 2 ? "Create Magazine Entry" : masterTab === 1 ? "Create Event Update" : "Create Announcement")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label={masterTab === 3 ? "Video Title" : masterTab === 2 ? "Magazine Title" : masterTab === 1 ? "Event Title / Message" : "Announcement message"}
              multiline={masterTab !== 2 && masterTab !== 3}
              minRows={(masterTab !== 2 && masterTab !== 3) ? 4 : 1}
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
              label={masterTab === 3 ? "Channel Handle (สำหรับปุ่ม Subscribe)" : masterTab === 2 ? "Magazine Subtitle" : "Announcer (Optional)"}
              placeholder={masterTab === 3 ? "@channelname  (ใส่ @ นำหน้า เพื่อแสดงปุ่ม Subscribe)" : ""}
              helperText={masterTab === 3 ? "ใส่ @channelname เช่น @iamcrazygamerch เพื่อให้ผู้ชมกด Subscribe ได้ทันที" : ""}
              value={form.announcer}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  announcer: event.target.value,
                }))
              }
              fullWidth
            />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                {masterTab === 3 ? "YOUTUBE URL" : masterTab === 2 ? "MAGAZINE IMAGE" : masterTab === 1 ? "EVENT COVER IMAGE" : "NEWS IMAGE"}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label={masterTab === 3 ? "YouTube URL" : "Image URL"}
                    placeholder={masterTab === 3 ? "https://youtu.be/VIDEO_ID หรือ https://www.youtube.com/watch?v=..." : "https://example.com/image.jpg"}
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
                {masterTab !== 3 && (
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
                )}
              </Stack>
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
                    src={masterTab === 3 ? getYouTubeThumbnailUrl(form.imageUrl) || "https://via.placeholder.com/400x200?text=Invalid+YouTube+URL" : getAnnouncementImageUrl(form.imageUrl)} 
                    sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 2, border: '2px solid', borderColor: 'divider', mt: 0.5 }}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL'; }}
                  />
                </Box>
              )}
            </Box>
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
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ fontWeight: 'bold' }}>Cancel</Button>
          <Button 
            fullWidth={isMobile}
            variant="contained" 
            onClick={handleSave}
            sx={{ borderRadius: 2, fontWeight: 'bold', px: 4 }}
          >
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
