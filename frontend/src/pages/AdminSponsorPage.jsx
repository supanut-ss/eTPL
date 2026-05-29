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
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Popover,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Edit, Delete, Refresh, Diversity2, Link, ColorLens, Upload, Photo } from "@mui/icons-material";
import { getSponsors, createSponsor, updateSponsor, deleteSponsor } from "../api/sponsorApi";
import { uploadSponsorImage } from "../api/uploadApi";

// Utility: Check if a URL/string is an image path
const isImageUrl = (url) => {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.match(/\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i)
  );
};

// Utility: Generate premium high-contrast linear gradient from HEX color
const generateGradientFromHex = (hex) => {
  if (!hex) return "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)";
  
  // Clean hex
  let cleanHex = hex.trim().replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  
  if (cleanHex.length !== 6) {
    return `linear-gradient(135deg, ${hex} 0%, ${hex} 100%)`;
  }
  
  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Create a darker variant (35% darker for luxury high-contrast design)
  const darken = (val, percent) => {
    return Math.max(0, Math.floor(val * (1 - percent)));
  };
  
  const rDark = darken(r, 0.35);
  const gDark = darken(g, 0.35);
  const bDark = darken(b, 0.35);
  
  const toHex = (val) => {
    const h = val.toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  
  const darkerHex = `#${toHex(rDark)}${toHex(gDark)}${toHex(bDark)}`;
  const mainHex = `#${cleanHex}`;
  
  return `linear-gradient(135deg, ${mainHex} 0%, ${darkerHex} 100%)`;
};

const defaultForm = {
  name: "",
  logo: "⚽",
  tagline: "",
  description: "",
  website: "https://",
  bannerBg: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
  brandColor: "#94a3b8",
  hasBanner: true,
  displayOrder: 0,
};

const AdminSponsorPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [colorAnchorEl, setColorAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSponsors();
      setRows(res.data.data || res.data || []);
    } catch (err) {
      showSnackbar("Failed to load sponsor data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Sponsor name is required";
    if (!form.logo.trim()) e.logo = "Logo emoji or image URL is required";
    if (!form.tagline.trim()) e.tagline = "Tagline is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.website.trim() || form.website === "https://") e.website = "Website URL is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadSponsorImage(file);
      const uploadedUrl = res.data.data?.url || res.data?.url;
      if (uploadedUrl) {
        setForm((prev) => ({ ...prev, logo: uploadedUrl }));
        showSnackbar("Logo uploaded successfully 🎉");
      } else {
        showSnackbar("Could not retrieve the uploaded file URL", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || "File upload failed", "error");
    } finally {
      setUploading(false);
    }
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
      id: row.id,
      name: row.name || "",
      logo: row.logo || "⚽",
      tagline: row.tagline || "",
      description: row.description || "",
      website: row.website || "https://",
      bannerBg: row.bannerBg || "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
      brandColor: row.brandColor || "#94a3b8",
      hasBanner: row.hasBanner !== false,
      displayOrder: row.displayOrder || 0,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateSponsor(editTarget.id, form);
        showSnackbar("Sponsor updated successfully ✨");
      } else {
        await createSponsor(form);
        showSnackbar("New sponsor added successfully 🥳");
      }
      setDialogOpen(false);
      fetchSponsors();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message
        || err.response?.data?.title
        || err.message
        || "Failed to save changes";
      showSnackbar(`[${status || "ERR"}] ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteSponsor(deleteTarget.id);
      showSnackbar("Sponsor deleted successfully 🗑️");
      setDeleteDialogOpen(false);
      fetchSponsors();
    } catch (err) {
      showSnackbar(err.response?.data?.message || "Failed to delete sponsor", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      field: "logo",
      headerName: "Logo",
      width: 85,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const val = params.value;
        if (isImageUrl(val)) {
          return (
            <Box display="flex" alignItems="center" justifyContent="center" height="100%">
              <Box
                component="img"
                src={val}
                alt="Sponsor Logo"
                sx={{
                  height: 40,
                  width: 40,
                  objectFit: "contain",
                  borderRadius: "10px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  bgcolor: "rgba(255,255,255,0.8)",
                  p: 0.2,
                }}
              />
            </Box>
          );
        }
        return (
          <Typography fontSize="1.8rem" sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            {val || "⚽"}
          </Typography>
        );
      },
    },
    {
      field: "name",
      headerName: "Sponsor Name",
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) => (
        <Box display="flex" flexDirection="column" justifyContent="center" height="100%">
          <Typography variant="body2" fontWeight={700} color="text.primary">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.tagline}
          </Typography>
        </Box>
      ),
    },
    {
      field: "brandColor",
      headerName: "Brand Theme",
      width: 140,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1} height="100%">
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              bgcolor: params.value || "#94a3b8",
              border: "2px solid #fff",
              boxShadow: "0 0 5px rgba(0,0,0,0.15)",
            }}
          />
          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "website",
      headerName: "Website Link",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1} height="100%">
          <Link sx={{ fontSize: 16, color: "text.disabled" }} />
          <Typography
            component="a"
            href={params.value}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {params.value?.replace("https://", "")?.replace("www.", "")}
          </Typography>
        </Box>
      ),
    },
    {
      field: "displayOrder",
      headerName: "Order",
      width: 90,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Options",
      width: 120,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Box display="flex" gap={1} justifyContent="flex-end" alignItems="center" height="100%">
          <Tooltip title="Edit sponsor">
            <IconButton
              size="small"
              onClick={() => handleOpenEdit(params.row)}
              sx={{
                color: "primary.main",
                "&:hover": { transform: "scale(1.15)" },
                transition: "all 0.2s ease",
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete sponsor">
            <IconButton
              size="small"
              onClick={() => {
                setDeleteTarget(params.row);
                setDeleteDialogOpen(true);
              }}
              sx={{
                color: "error.main",
                "&:hover": { transform: "scale(1.15)" },
                transition: "all 0.2s ease",
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
          mb: 4,
          px: { xs: 1, sm: 0 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Diversity2 color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Community Sponsors
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage community sponsors & partners • {rows.length} total
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={1.5} width={{ xs: "100%", sm: "auto" }}>
          <IconButton onClick={fetchSponsors} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px" }}>
            <Refresh />
          </IconButton>
          <Button
            fullWidth={isMobile}
            variant="contained"
            disableElevation
            startIcon={<Add />}
            onClick={handleOpenAdd}
            sx={{
              borderRadius: "14px",
              textTransform: "none",
              fontWeight: 800,
              px: 4,
              height: 48,
              fontSize: "0.95rem",
              boxShadow: "0 4px 14px rgba(25, 118, 210, 0.25)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(25, 118, 210, 0.35)",
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            Add Supporter
          </Button>
        </Box>
      </Box>

      {/* DataGrid Section */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 12px 24px rgba(0,0,0,0.03)",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          getRowId={(row) => row.id}
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
              "&:focus": { outline: "none" },
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "rgba(25, 118, 210, 0.02)",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid",
              borderColor: "divider",
            },
          }}
        />
      </Paper>

      {/* Add / Edit Dialog (2-Column Responsive Premium Layout) */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 1, fontWeight: "bold" }}>
          {editTarget ? "✏️ Edit Partner" : "🤝 Add New Sponsor Partner"}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={4} pt={1}>
            {/* Left Column: General Info & Details */}
            <Box display="flex" flexDirection="column" gap={2.2} flex={1.1} width="100%">
              {/* Section 1: General Information */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  🤝 General Information
                </Typography>
              </Divider>

              <Box display="flex" gap={2} flexDirection={{ xs: "column", sm: "row" }} alignItems="flex-start" width="100%">
                {/* Logo input field (occupies expanding space) */}
                <TextField
                  label="Logo (emoji or image URL)"
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  required
                  error={!!errors.logo}
                  helperText={errors.logo || "Type an emoji, paste an image URL, or upload a file"}
                  sx={{ flex: 1, minWidth: 180, width: "100%" }}
                />

                {/* Upload Button aligned in height (56px) */}
                <Button
                  variant="outlined"
                  component="label"
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <Upload />}
                  sx={{
                    textTransform: "none",
                    borderRadius: "10px",
                    fontWeight: 600,
                    height: 56, // Matches standard Mui TextField height!
                    px: 2.5,
                    borderColor: "divider",
                    color: "text.primary",
                    "&:hover": { borderColor: "primary.main", bgcolor: "rgba(25, 118, 210, 0.04)" },
                    whiteSpace: "nowrap",
                    minWidth: 140,
                    width: { xs: "100%", sm: "auto" }
                  }}
                >
                  {uploading ? "Uploading..." : "Upload Logo"}
                  <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>

                {/* Live Preview Box aligned in height (56px) */}
                <Box
                  sx={{
                    width: 56, // Square match!
                    height: 56, // Matches TextField and Button height!
                    borderRadius: "10px",
                    border: "1px dashed rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0,0,0,0.01)",
                    overflow: "hidden",
                    p: 0.5,
                    flexShrink: 0,
                    alignSelf: { xs: "center", sm: "flex-start" }
                  }}
                >
                  {form.logo ? (
                    isImageUrl(form.logo) ? (
                      <Box
                        component="img"
                        src={form.logo}
                        alt="Logo Preview"
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: "6px"
                        }}
                      />
                    ) : (
                      <Typography fontSize="1.8rem">{form.logo}</Typography>
                    )
                  ) : (
                    <Typography variant="caption" color="text.disabled" align="center" fontSize="0.65rem">No image</Typography>
                  )}
                </Box>
              </Box>

              {/* Sponsor Name (Full width) */}
              <TextField
                label="Sponsor Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                error={!!errors.name}
                helperText={errors.name}
                placeholder="e.g. MeeStock"
              />

              {/* Tagline (Full width) */}
              <TextField
                label="Tagline / Short Slogan"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                required
                fullWidth
                error={!!errors.tagline}
                helperText={errors.tagline || "Short phrase displayed under the sponsor name"}
                placeholder="e.g. Smart inventory management system"
              />

              {/* Section 2: Contact & Detail */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  📝 Details & Links
                </Typography>
              </Divider>

              <TextField
                label="Sponsor Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                fullWidth
                multiline
                rows={3.5}
                error={!!errors.description}
                helperText={errors.description || "Full description shown when users click the sponsor banner"}
                placeholder="Describe the sponsor's services or community benefits..."
              />

              <TextField
                label="Website URL"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                required
                fullWidth
                error={!!errors.website}
                helperText={errors.website}
                placeholder="https://example.com"
              />
            </Box>

            {/* Right Column: Branding, Theme & Real-time Live Preview */}
            <Box display="flex" flexDirection="column" gap={2.2} flex={0.9} width="100%">
              {/* Section 3: Branding & Premium Theme */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  🎨 Branding & Theme
                </Typography>
              </Divider>

              <Box display="flex" gap={2} flexDirection={{ xs: "column", sm: "row" }}>
                <Box display="flex" gap={1.5} alignItems="center" flex={1.2}>
                  <TextField
                    label="Brand Color (HEX)"
                    value={form.brandColor}
                    onChange={(e) => {
                      const colorVal = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        brandColor: colorVal,
                        bannerBg: generateGradientFromHex(colorVal),
                      }));
                    }}
                    required
                    error={!!errors.brandColor}
                    helperText="HEX color code, e.g. #6366f1"
                    sx={{ flex: 1 }}
                  />
                  {/* Clickable color swatch — opens color picker popover */}
                  <Box
                    onClick={(e) => setColorAnchorEl(e.currentTarget)}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      bgcolor: form.brandColor || "#94a3b8",
                      border: "2px solid rgba(0,0,0,0.12)",
                      boxShadow: "inset 0 0 5px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)",
                      mt: -2.5,
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      "&:hover": {
                        transform: "scale(1.12)",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                      },
                    }}
                  />
                  <Popover
                    open={Boolean(colorAnchorEl)}
                    anchorEl={colorAnchorEl}
                    onClose={() => setColorAnchorEl(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    transformOrigin={{ vertical: "top", horizontal: "center" }}
                    slotProps={{ paper: { sx: { borderRadius: 3, p: 2, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" } } }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                      Pick brand color
                    </Typography>
                    <Box
                      component="input"
                      type="color"
                      value={form.brandColor || "#94a3b8"}
                      onChange={(e) => {
                        const colorVal = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          brandColor: colorVal,
                          bannerBg: generateGradientFromHex(colorVal),
                        }));
                      }}
                      sx={{
                        width: 200,
                        height: 140,
                        border: "none",
                        borderRadius: 2,
                        cursor: "pointer",
                        p: 0,
                        display: "block",
                      }}
                    />
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block" textAlign="center" mt={1}>
                      {form.brandColor}
                    </Typography>
                  </Popover>
                </Box>

                <TextField
                  label="Display Order"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                  sx={{ flex: 0.8 }}
                  helperText="Render priority (lower = first)"
                />
              </Box>

              <TextField
                label="Banner Background (CSS Gradient / Hex)"
                value={form.bannerBg}
                onChange={(e) => setForm({ ...form, bannerBg: e.target.value })}
                required
                fullWidth
                helperText="Auto-generated from brand color, or customize the CSS gradient manually"
                placeholder="linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
              />

              <FormControlLabel
                control={
                  <Switch checked={form.hasBanner} onChange={(e) => setForm({ ...form, hasBanner: e.target.checked })} color="primary" />
                }
                label="Enable detail banner (expand on click)"
              />

              {/* Section 4: Live Preview */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  🎯 Live Banner Preview
                </Typography>
              </Divider>

              <Box
                sx={{
                  background: form.bannerBg || "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                  borderRadius: "16px",
                  p: 3,
                  position: "relative",
                  overflow: "hidden",
                  color: "#ffffff",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 120,
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Premium Circular blur elements */}
                <Box
                  sx={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.12)",
                    filter: "blur(20px)",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -30,
                    left: "60%",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    filter: "blur(15px)",
                  }}
                />

                <Box sx={{ display: "flex", alignItems: "center", gap: 2.2, zIndex: 1 }}>
                  <Box
                    sx={{
                      fontSize: "2rem",
                      width: 54,
                      height: 54,
                      borderRadius: "12px",
                      bgcolor: "rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.25)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {form.logo ? (
                      isImageUrl(form.logo) ? (
                        <Box
                          component="img"
                          src={form.logo}
                          alt="Logo"
                          sx={{
                            width: 38,
                            height: 38,
                            objectFit: "contain",
                            borderRadius: "6px",
                          }}
                        />
                      ) : (
                        form.logo
                      )
                    ) : (
                      "🤝"
                    )}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ letterSpacing: 0.5, lineHeight: 1.2 }}>
                      {form.name || "Sponsor Name"}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.95, fontWeight: 500, mt: 0.2, display: "block" }}>
                      {form.tagline || "Sponsor tagline will appear here"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
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
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !saving && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>🗑️ Confirm Delete Sponsor</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
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
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
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
        <Alert severity={snackbar.severity} variant="filled" sx={{ minWidth: 250 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminSponsorPage;
