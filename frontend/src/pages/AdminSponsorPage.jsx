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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Add, Edit, Delete, Refresh, Handshake, Link, ColorLens, Upload, Photo } from "@mui/icons-material";
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
      showSnackbar("ไม่สามารถโหลดข้อมูลสปอนเซอร์ได้", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "กรุณากรอกชื่อผู้สนับสนุน";
    if (!form.logo.trim()) e.logo = "กรุณากรอกไอคอนหรืออีโมจิโลโก้";
    if (!form.tagline.trim()) e.tagline = "กรุณากรอกคำโปรยสั้นๆ";
    if (!form.description.trim()) e.description = "กรุณากรอกคำอธิบายผู้สนับสนุน";
    if (!form.website.trim() || form.website === "https://") e.website = "กรุณากรอกลิงก์เว็บไซต์";

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
        showSnackbar("อัปโหลดโลโก้สำเร็จแล้ว 🎉");
      } else {
        showSnackbar("ไม่สามารถรับที่อยู่ไฟล์จากการอัปโหลดได้", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์", "error");
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
        showSnackbar("แก้ไขข้อมูลผู้สนับสนุนสำเร็จแล้ว ✨");
      } else {
        await createSponsor(form);
        showSnackbar("เพิ่มผู้สนับสนุนใหม่สำเร็จแล้ว 🥳");
      }
      setDialogOpen(false);
      fetchSponsors();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message
        || err.response?.data?.title
        || err.message
        || "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      showSnackbar(`[${status || "ERR"}] ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteSponsor(deleteTarget.id);
      showSnackbar("ลบผู้สนับสนุนสำเร็จแล้ว 🗑️");
      setDeleteDialogOpen(false);
      fetchSponsors();
    } catch (err) {
      showSnackbar(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
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
          <Tooltip title="แก้ไขผู้สนับสนุน">
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
          <Tooltip title="ลบผู้สนับสนุน">
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
          <Handshake color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Community Sponsors
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการรายชื่อผู้สนับสนุนและพันธมิตรของคอมมูนิตี้ • ทั้งหมด {rows.length} รายการ
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
          {editTarget ? "✏️ แก้ไขข้อมูลพาร์ทเนอร์" : "🤝 เพิ่มพาร์ทเนอร์สปอนเซอร์ใหม่"}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={4} pt={1}>
            {/* Left Column: General Info & Details */}
            <Box display="flex" flexDirection="column" gap={2.2} flex={1.1} width="100%">
              {/* Section 1: General Information */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  🤝 ข้อมูลทั่วไปของพาร์ทเนอร์ (General Info)
                </Typography>
              </Divider>

              <Box display="flex" gap={2} flexDirection={{ xs: "column", sm: "row" }} alignItems="flex-start" width="100%">
                {/* Logo input field (occupies expanding space) */}
                <TextField
                  label="โลโก้ (อีโมจิ หรือลิงก์ภาพ)"
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  required
                  error={!!errors.logo}
                  helperText={errors.logo || "พิมพ์อีโมจิ, วางลิงก์รูป หรือกดปุ่มแนบไฟล์ด้านขวา"}
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
                  {uploading ? "อัปโหลด..." : "อัปโหลดโลโก้"}
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
                    <Typography variant="caption" color="text.disabled" align="center" fontSize="0.65rem">ไม่มีรูป</Typography>
                  )}
                </Box>
              </Box>

              {/* Sponsor Name (Full width) */}
              <TextField
                label="ชื่อผู้สนับสนุน"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                error={!!errors.name}
                helperText={errors.name}
                placeholder="เช่น MeeStock"
              />

              {/* Tagline (Full width) */}
              <TextField
                label="สโลแกน / คำโปรยสั้นๆ"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                required
                fullWidth
                error={!!errors.tagline}
                helperText={errors.tagline || "คำแนะนำสั้นๆ ที่ปรากฏใต้ชื่อผู้สนับสนุน"}
                placeholder="เช่น ระบบสต็อกสินค้าอัจฉริยะ"
              />

              {/* Section 2: Contact & Detail */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  📝 รายละเอียดและลิงก์ติดต่อ (Details & Links)
                </Typography>
              </Divider>

              <TextField
                label="คำอธิบายรายละเอียดผู้สนับสนุน"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                fullWidth
                multiline
                rows={3.5}
                error={!!errors.description}
                helperText={errors.description || "คำอธิบายยาวที่จะแสดงเมื่อมีผู้กดคลิกดูรายละเอียดแบนเนอร์"}
                placeholder="ป้อนรายละเอียด เช่น บริการของเรา สิทธิประโยชน์พิเศษที่สนับสนุนแก่คอมมูนิตี้..."
              />

              <TextField
                label="ลิงก์เว็บไซต์"
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
                  🎨 ธีมและดีไซน์ประจำแบรนด์ (Branding & Theme)
                </Typography>
              </Divider>

              <Box display="flex" gap={2} flexDirection={{ xs: "column", sm: "row" }}>
                <Box display="flex" gap={1.5} alignItems="center" flex={1.2}>
                  <TextField
                    label="สีแบรนด์หลัก (HEX)"
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
                    helperText="โค้ดสี HEX เช่น #6366f1"
                    sx={{ flex: 1 }}
                  />
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      bgcolor: form.brandColor || "#94a3b8",
                      border: "1px solid rgba(0,0,0,0.12)",
                      boxShadow: "inset 0 0 5px rgba(0,0,0,0.1)",
                      mt: -2.5,
                    }}
                  />
                </Box>

                <TextField
                  label="ลำดับการแสดงผล"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                  sx={{ flex: 0.8 }}
                  helperText="ลำดับคิวแสดงผล"
                />
              </Box>

              <TextField
                label="พื้นหลังแบนเนอร์ (CSS Gradient / Hex)"
                value={form.bannerBg}
                onChange={(e) => setForm({ ...form, bannerBg: e.target.value })}
                required
                fullWidth
                helperText="สร้างให้อัตโนมัติ หรือจะปรับแต่ง CSS Gradient เองได้ตามชอบ"
                placeholder="linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
              />

              <FormControlLabel
                control={
                  <Switch checked={form.hasBanner} onChange={(e) => setForm({ ...form, hasBanner: e.target.checked })} color="primary" />
                }
                label="เปิดใช้งานแบนเนอร์รายละเอียด (เปิดกล่องเมื่อคลิก)"
              />

              {/* Section 4: Live Preview */}
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} fontWeight={700}>
                  🎯 ตัวอย่างแบนเนอร์จำลองสด (Live Premium Card Preview)
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
                      {form.name || "ชื่อผู้สนับสนุน"}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.95, fontWeight: 500, mt: 0.2, display: "block" }}>
                      {form.tagline || "สโลแกนสั้นๆ ของสปอนเซอร์จะแสดงตรงนี้"}
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
        <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>🗑️ ยืนยันการลบผู้สนับสนุน</DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการลบข้อมูลผู้สนับสนุน <strong>{deleteTarget?.name}</strong> ใช่หรือไม่?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            การกระทำนี้จะไม่สามารถย้อนกลับคืนข้อมูลได้
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
