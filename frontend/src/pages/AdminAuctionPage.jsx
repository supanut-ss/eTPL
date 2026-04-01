import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import { Settings, Refresh, Save } from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useSnackbar } from "notistack";

const AdminAuctionPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getSettings();
      setSettings(res.data);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await auctionService.updateSettings(settings);
      enqueueSnackbar("บันทึกการตั้งค่าประมูลสำเร็จ", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  if (loading) return <LinearProgress />;

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
          <Settings color="primary" />
          <Typography variant="h5" fontWeight="bold">
            จัดการระบบประมูล (Admin)
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSettings} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Settings Form */}
      <Paper elevation={2} sx={{ borderRadius: 2, p: 4 }}>
        <Typography variant="subtitle1" fontWeight="600" mb={3}>
          ตั้งค่าการประมูลพื้นฐาน
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="งบเริ่มต้น (Starting Budget)"
              name="startingBudget"
              type="number"
              value={settings?.startingBudget || ""}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ราคาประมูลขั้นต่ำ (Min Bid Price)"
              name="minBidPrice"
              type="number"
              value={settings?.minBidPrice || ""}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ผู้เล่นสะสมสูงสุดในทีม (Max Squad Size)"
              name="maxSquadSize"
              type="number"
              value={settings?.maxSquadSize || ""}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="เวลาเริ่มประมูลรายวัน (Daily Start Time)"
              name="dailyBidStartTime"
              type="time"
              value={settings?.dailyBidStartTime || "08:00"}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="เวลาปิดประมูลรายวัน (Daily End Time)"
              name="dailyBidEndTime"
              type="time"
              value={settings?.dailyBidEndTime || "23:59"}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Box mt={4} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            startIcon={<Save />}
            onClick={handleSave}
            size="large"
            sx={{ minWidth: 200 }}
          >
            บันทึกการตั้งค่า
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminAuctionPage;
