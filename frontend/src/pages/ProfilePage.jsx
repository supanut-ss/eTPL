import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Container,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Link,
  LinearProgress,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Edit,
  Save,
  Lock,
  Person,
  Home,
  Shield,
  CheckCircle,
  PhotoCamera,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { updateUser } from "../api/userApi";
import { uploadProfileImage } from "../api/uploadApi";
import auctionService from "../services/auctionService";
import { getLogoUrl } from "../utils/imageUtils";
import { API_BASE_URL } from "../api/axiosInstance";

const ProfilePage = () => {
  const { user, updateUserData } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clubs, setClubs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    lineName: user?.lineName || "",
    lineId: user?.lineId || "",
    linePic: user?.linePic || "",
    password: "",
    confirmPassword: "",
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    auctionService.getClubs().then((res) => setClubs(res.data || res || []));
  }, []);

  const teamLogo = user?.currentTeam
    ? (clubs || []).find(
        (c) => (c.teamName || "").trim().toLowerCase() === (user.currentTeam || "").trim().toLowerCase()
      )?.linePic || getLogoUrl(user.currentTeam)
    : null;

  const isLevel = (lvl) => (user?.userLevel || "").toLowerCase() === lvl.toLowerCase();

  const currentAvatarSrc = previewUrl || form.linePic || user?.linePic || null;
  const resolvedAvatar = currentAvatarSrc
    ? currentAvatarSrc.startsWith("/") ? `${API_BASE_URL}${currentAvatarSrc}` : currentAvatarSrc
    : null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setSnackbar({ open: true, message: "Only JPG, PNG, or WEBP allowed.", severity: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({ open: true, message: "Image must be under 5MB.", severity: "error" });
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setUploadProgress(0);
    try {
      const interval = setInterval(() => setUploadProgress((p) => Math.min(p + 25, 85)), 120);
      const res = await uploadProfileImage(file);
      clearInterval(interval);
      setUploadProgress(100);
      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        setForm((prev) => ({ ...prev, linePic: url }));
        setSnackbar({ open: true, message: "Photo uploaded! Click Save Changes to confirm.", severity: "success" });
      }
    } catch (err) {
      setPreviewUrl(null);
      setSnackbar({ open: true, message: "Upload failed. Please try again.", severity: "error" });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      setSnackbar({ open: true, message: "Passwords do not match.", severity: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        lineName: form.lineName, 
        linePic: form.linePic,
        ...(form.password ? { password: form.password } : {})
      };
      await updateUser(user.userId, payload);
      const updatedUser = { ...user, ...payload };
      delete updatedUser.password;
      updateUserData(updatedUser);
      setSnackbar({ open: true, message: "Saved successfully!", severity: "success" });
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || "Failed to save", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      lineName: user?.lineName || "",
      lineId: user?.lineId || "",
      linePic: user?.linePic || "",
      password: "",
      confirmPassword: "",
    });
    setPreviewUrl(null);
  };

  const levelColor = isLevel("admin") ? "#d1ad73" : isLevel("mod") || isLevel("moderator") ? "#818cf8" : "#60a5fa";
  const levelBg = isLevel("admin") ? "#0f172a" : isLevel("mod") || isLevel("moderator") ? "#312e81" : "#1e40af";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#eef2f7", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <Box sx={{
        px: { xs: 2, md: 5 },
        py: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        bgcolor: "white",
      }}>
        <Link component={RouterLink} to="/" underline="none" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: 13, fontWeight: 600, "&:hover": { color: "#0f172a" } }}>
          <Home sx={{ fontSize: 15 }} /> Home
        </Link>
        <Typography sx={{ color: "#cbd5e1", mx: 0.5 }}>/</Typography>
        <Typography sx={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Settings</Typography>
        <Typography sx={{ color: "#cbd5e1", mx: 0.5 }}>/</Typography>
        <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 700 }}>Profile Settings</Typography>
      </Box>

      <Container maxWidth="md" sx={{ py: 5, flex: 1 }}>
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)", minHeight: 600 }}>
          <Box sx={{ bgcolor: "white", p: { xs: 3, md: 6 }, display: "flex", flexDirection: "column" }}>
            {/* Section title */}
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 4 }}>
              <Box>
                <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ letterSpacing: -0.5 }}>
                  Manage Profile
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Update your personal details and account security.
                </Typography>
              </Box>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Avatar + name row */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4, pb: 4, borderBottom: "1px solid #f1f5f9" }}>
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                  <Avatar
                    src={resolvedAvatar}
                    sx={{
                      width: 90,
                      height: 90,
                      border: "4px solid #e2e8f0",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                      bgcolor: "#f1f5f9",
                      fontSize: 32,
                      fontWeight: 900,
                      color: "#94a3b8",
                    }}
                  >
                    {user?.lineName?.[0] || <Person />}
                  </Avatar>

                  {uploading && (
                    <Box sx={{ position: "absolute", inset: -3, borderRadius: "50%", border: "2px solid #e2e8f0", overflow: "hidden" }}>
                      <LinearProgress sx={{ height: 2, position: "absolute", bottom: 0, left: 0, right: 0, bgcolor: "transparent", "& .MuiLinearProgress-bar": { bgcolor: "#2563eb" } }} variant="determinate" value={uploadProgress} />
                    </Box>
                  )}

                  <Tooltip title="Change photo">
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      size="small"
                      sx={{
                        position: "absolute",
                        bottom: 2,
                        right: -2,
                        width: 28,
                        height: 28,
                        bgcolor: "white",
                        border: "1.5px solid #e2e8f0",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        "&:hover": { bgcolor: "#f8fafc", borderColor: "#2563eb" },
                      }}
                    >
                      {uploading
                        ? <CircularProgress size={12} sx={{ color: "#2563eb" }} />
                        : <PhotoCamera sx={{ fontSize: 14, color: "#475569" }} />
                      }
                    </IconButton>
                  </Tooltip>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFileSelect} />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h6" fontWeight={800} color="#0f172a">
                      {form.lineName || user?.lineName || "Manager"}
                    </Typography>
                    <Chip
                      label={user?.userLevel?.toUpperCase()}
                      size="small"
                      sx={{ fontWeight: 800, fontSize: 9, letterSpacing: 0.5, bgcolor: levelBg, color: levelColor, borderRadius: "5px", height: 20 }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {teamLogo
                      ? <Box component="img" src={teamLogo} sx={{ width: 16, height: 16, objectFit: "contain" }} />
                      : <Shield sx={{ fontSize: 14, color: "#94a3b8" }} />
                    }
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {user?.currentTeam || "Free Agent"} · eTPL Manager
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, bgcolor: "#f0fdf4", borderRadius: 2 }}>
                  <CheckCircle sx={{ fontSize: 16, color: "#10b981" }} />
                  <Typography variant="caption" fontWeight={700} color="#10b981">Status Active</Typography>
                </Box>
              </Box>

              {/* Form Fields */}
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                    Account Details
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} color="#374151" sx={{ display: "block", mb: 0.8, letterSpacing: 0.2 }}>
                    Display Name
                  </Typography>
                  <TextField
                    fullWidth size="small" name="lineName" value={form.lineName}
                    onChange={handleChange} placeholder="Your display name"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} color="#374151" sx={{ display: "block", mb: 0.8, letterSpacing: 0.2 }}>
                    User ID
                  </Typography>
                  <TextField
                    fullWidth size="small" value={user?.userId || ""}
                    disabled
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} color="#374151" sx={{ display: "block", mb: 0.8, letterSpacing: 0.2 }}>
                    Current Team
                  </Typography>
                  <TextField
                    fullWidth size="small" value={user?.currentTeam || "Free Agent"}
                    disabled
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} color="#374151" sx={{ display: "block", mb: 0.8, letterSpacing: 0.2 }}>
                    Member Level
                  </Typography>
                  <TextField
                    fullWidth size="small" value={user?.userLevel || ""}
                    disabled
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                  />
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 3 }} />
                  <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                    Security Settings
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} color="#374151" sx={{ display: "block", mb: 0.8, letterSpacing: 0.2 }}>
                    New Password
                  </Typography>
                  <TextField
                    fullWidth size="small" name="password" type="password"
                    value={form.password} onChange={handleChange} placeholder="••••••••"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} color="#374151" sx={{ display: "block", mb: 0.8, letterSpacing: 0.2 }}>
                    Confirm Password
                  </Typography>
                  <TextField
                    fullWidth size="small" name="confirmPassword" type="password"
                    value={form.confirmPassword} onChange={handleChange} placeholder="••••••••"
                    error={form.confirmPassword && form.password !== form.confirmPassword}
                    helperText={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords do not match" : ""}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>

              {/* Actions */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 6, pt: 4, borderTop: "1px solid #f1f5f9" }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{
                    px: 4, py: 1.1, borderRadius: 2.5, fontWeight: 700, textTransform: "none", fontSize: 14,
                    bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" },
                    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="text"
                  sx={{ px: 2, py: 1.1, borderRadius: 2.5, fontWeight: 600, textTransform: "none", fontSize: 14, color: "#64748b", "&:hover": { bgcolor: "#f8fafc" } }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2.5, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
