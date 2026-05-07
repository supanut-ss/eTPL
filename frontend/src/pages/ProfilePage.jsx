import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Divider,
  Container,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  Edit,
  PhotoCamera,
  Save,
  Lock,
  Person,
  CheckCircle,
  Home,
  Shield,
  Badge,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { updateUser } from "../api/userApi";
import { panelSx } from "./main/components/shared/designTokens";

const ProfilePage = () => {
  const { user, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    lineName: user?.lineName || "",
    lineId: user?.lineId || "",
    linePic: user?.linePic || "",
    password: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateUser(user.userId, form);
      const updatedUser = { ...user, ...form };
      delete updatedUser.password;
      
      updateUserData(updatedUser);
      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });
      setForm({ ...form, password: "" });
    } catch (error) {
      console.error("Update failed:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to update profile",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", pb: 10 }}>
      {/* Hero Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          pt: 10,
          pb: 12,
          mb: -8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.15,
            background: "radial-gradient(circle at 70% 50%, #6366f1, transparent 30%), radial-gradient(circle at 30% 50%, #d1ad73, transparent 30%)",
          }}
        />
        <Container maxWidth="lg">
          <Breadcrumbs 
            sx={{ color: "rgba(255,255,255,0.5)", mb: 2 }}
            separator={<Typography sx={{ color: "rgba(255,255,255,0.3)" }}>•</Typography>}
          >
            <Link component={RouterLink} to="/" sx={{ color: "inherit", display: "flex", alignItems: "center", textDecoration: "none" }}>
              <Home sx={{ fontSize: 16, mr: 0.5 }} /> Home
            </Link>
            <Typography variant="caption" sx={{ color: "#d1ad73", fontWeight: 800 }}>Account Settings</Typography>
          </Breadcrumbs>
          <Typography variant="h2" fontWeight={1000} sx={{ letterSpacing: -2 }}>
            Manage <span style={{ color: "#d1ad73" }}>Profile</span>
          </Typography>
          <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, maxWidth: 600 }}>
            Update your personal information, security settings and community presence.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                ...panelSx,
                p: 0,
                bgcolor: "white",
                minHeight: 400,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Box sx={{ height: 100, bgcolor: "#f8fafc", position: "relative" }}>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -50,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 2,
                  }}
                >
                  <Avatar
                    src={form.linePic || user?.linePic}
                    sx={{
                      width: 100,
                      height: 100,
                      border: "5px solid white",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      bgcolor: "#f1f5f9",
                    }}
                  >
                    <Person sx={{ fontSize: 50, color: "#0f172a" }} />
                  </Avatar>
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      bgcolor: "#d1ad73",
                      color: "white",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                      "&:hover": { bgcolor: "#b8955d" },
                    }}
                  >
                    <PhotoCamera fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ pt: 8, pb: 4, px: 3, flex: 1 }}>
                <Typography variant="h5" fontWeight={1000} sx={{ color: "#0f172a", mb: 0.5 }}>
                  {form.lineName || "Manager"}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 2 }}>
                  @{user?.userId}
                </Typography>
                
                <Box display="flex" justifyContent="center" gap={1} mb={3}>
                  <Chip
                    label={user?.userLevel?.toUpperCase()}
                    size="small"
                    sx={{
                      fontWeight: 900,
                      fontSize: 10,
                      bgcolor: user?.userLevel === "admin" ? "#0f172a" : "#f1f5f9",
                      color: user?.userLevel === "admin" ? "#d1ad73" : "#0f172a",
                      borderRadius: 1,
                    }}
                  />
                  <Chip
                    icon={<Shield sx={{ fontSize: "14px !important", color: "#d1ad73 !important" }} />}
                    label="Verified"
                    size="small"
                    sx={{
                      fontWeight: 900,
                      fontSize: 10,
                      bgcolor: "rgba(209, 173, 115, 0.1)",
                      color: "#d1ad73",
                      borderRadius: 1,
                    }}
                  />
                </Box>
                
                <Divider sx={{ mb: 3, opacity: 0.5 }} />
                
                <Grid container spacing={2} sx={{ textAlign: "left" }}>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Badge sx={{ color: "#d1ad73", fontSize: 20 }} />
                      <Box>
                        <Typography variant="caption" color="text.disabled" fontWeight={800} sx={{ textTransform: "uppercase" }}>
                          Team Status
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          {user?.currentTeam || "Free Agent"}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
              
              <Box sx={{ p: 2, bgcolor: "#f8fafc", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700}>
                  ID: {user?.userId?.toUpperCase()}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Form Section */}
          <Grid item xs={12} md={8}>
            <Paper
              component="form"
              onSubmit={handleSubmit}
              elevation={0}
              sx={{
                ...panelSx,
                p: { xs: 3, md: 5 },
                bgcolor: "white",
                minHeight: 500,
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
                  <Edit />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={1000} color="#0f172a">
                    Account Information
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Update your public profile visible to other members.
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight={800} sx={{ mb: 1, color: "#0f172a" }}>LINE Display Name</Typography>
                  <TextField
                    fullWidth
                    name="lineName"
                    value={form.lineName}
                    onChange={handleChange}
                    variant="outlined"
                    placeholder="Manager Name"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" fontWeight={800} sx={{ mb: 1, color: "#0f172a" }}>LINE ID</Typography>
                  <TextField
                    fullWidth
                    name="lineId"
                    value={form.lineId}
                    onChange={handleChange}
                    variant="outlined"
                    placeholder="line_id_123"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight={800} sx={{ mb: 1, color: "#0f172a" }}>Profile Image URL</Typography>
                  <TextField
                    fullWidth
                    name="linePic"
                    value={form.linePic}
                    onChange={handleChange}
                    variant="outlined"
                    placeholder="https://example.com/avatar.jpg"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                    helperText="Recommended size: 200x200px"
                  />
                </Grid>
              </Grid>

              <Box sx={{ my: 5 }}>
                <Divider />
              </Box>

              <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(244, 63, 94, 0.1)", color: "#f43f5e" }}>
                  <Lock />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={1000} color="#0f172a">
                    Security
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Update your password to keep your account secure.
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight={800} sx={{ mb: 1, color: "#0f172a" }}>New Password</Typography>
                  <TextField
                    fullWidth
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    variant="outlined"
                    placeholder="••••••••"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#f8fafc" } }}
                    helperText="Leave empty to keep your current password."
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 6, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  sx={{
                    px: 6,
                    py: 1.8,
                    borderRadius: 3,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)",
                    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.2)",
                    "&:hover": {
                      background: "linear-gradient(90deg, #1e293b 0%, #334155 100%)",
                    }
                  }}
                >
                  {loading ? "Updating..." : "Update Settings"}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ 
            width: "100%", 
            borderRadius: 2,
            fontWeight: 800,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
