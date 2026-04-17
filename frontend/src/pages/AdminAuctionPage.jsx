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
  Chip,
  Stack,
} from "@mui/material";
import { Settings, Refresh, Save } from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useSnackbar } from "notistack";
import { 
  Payments, 
  Groups, 
  PriceCheck, 
  Event, 
  Schedule, 
  Timer, 
  Timelapse 
} from "@mui/icons-material";

const AdminAuctionPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [settings, setSettings] = useState(null);
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, qRes] = await Promise.all([
        auctionService.getSettings(),
        auctionService.getQuotas()
      ]);
      setSettings(sRes?.data || {});
      setQuotas(qRes?.data || []);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuotaChange = (id, field, value) => {
    setQuotas(prev => prev.map(q => q.gradeId === id ? { ...q, [field]: value } : q));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await Promise.all([
        auctionService.updateSettings(settings),
        auctionService.updateQuotas(quotas)
      ]);
      enqueueSnackbar("บันทึกการตั้งค่าทั้งหมดสำเร็จ", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LinearProgress />;

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
          <Settings color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Auction Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AUCTION SYSTEM CONFIGURATION
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading} color="primary" sx={{ bgcolor: 'action.hover' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Save />}
            onClick={handleSaveAll}
            disabled={saving}
            sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
          >
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column: Settings Using Stack */}
        <Grid item xs={12} md={5}>
          <Stack spacing={4}>
            {/* Finance & Limits */}
            <Paper elevation={2} sx={{ borderRadius: 3, p: 4, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <Payments color="primary" />
                <Typography variant="h6" fontWeight="bold">Finance & Limits</Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Starting Budget"
                    name="startingBudget"
                    type="number"
                    value={settings?.startingBudget || ""}
                    onChange={handleChange}
                    variant="outlined"
                    InputProps={{ startAdornment: <Typography color="text.secondary" sx={{ mr: 1, fontSize: '0.9rem' }}>TP</Typography> }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Max Squad Size"
                    name="maxSquadSize"
                    type="number"
                    value={settings?.maxSquadSize || ""}
                    onChange={handleChange}
                    variant="outlined"
                    InputProps={{ startAdornment: <Groups sx={{ mr: 1, color: 'action.active' }} /> }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Phase Durations */}
            <Paper elevation={2} sx={{ borderRadius: 3, p: 4, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <Timelapse color="primary" />
                <Typography variant="h6" fontWeight="bold">Phase Durations</Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Normal Duration (Minutes)"
                    name="normalBidDurationMinutes"
                    type="number"
                    value={settings?.normalBidDurationMinutes || "1200"}
                    onChange={handleChange}
                    variant="outlined"
                    helperText={`${Math.floor((settings?.normalBidDurationMinutes || 1200) / 60)} hours ${ (settings?.normalBidDurationMinutes || 1200) % 60 } mins`}
                    InputProps={{ startAdornment: <Timer sx={{ mr: 1, color: 'action.active' }} /> }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Final Duration (Minutes)"
                    name="finalBidDurationMinutes"
                    type="number"
                    value={settings?.finalBidDurationMinutes || "1440"}
                    onChange={handleChange}
                    variant="outlined"
                    helperText={`${Math.floor((settings?.finalBidDurationMinutes || 1440) / 60)} hours ${ (settings?.finalBidDurationMinutes || 1440) % 60 } mins`}
                    InputProps={{ startAdornment: <Timer sx={{ mr: 1, color: 'action.active' }} /> }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Schedule & Hours */}
            <Paper elevation={2} sx={{ borderRadius: 3, p: 4, border: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <Event color="primary" />
                <Typography variant="h6" fontWeight="bold">Schedule & Hours</Typography>
              </Box>
              <Stack spacing={3}>
                <Box display="flex" gap={3}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    name="auctionStartDate"
                    type="date"
                    value={settings?.auctionStartDate ? settings.auctionStartDate.split('T')[0] : ""}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="End Date"
                    name="auctionEndDate"
                    type="date"
                    value={settings?.auctionEndDate ? settings.auctionEndDate.split('T')[0] : ""}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box display="flex" gap={3}>
                  <TextField
                    fullWidth
                    label="Daily Start Time"
                    name="dailyBidStartTime"
                    type="time"
                    value={settings?.dailyBidStartTime || "08:00"}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <Schedule sx={{ mr: 1, color: 'action.active' }} /> }}
                  />
                  <TextField
                    fullWidth
                    label="Daily End Time"
                    name="dailyBidEndTime"
                    type="time"
                    value={settings?.dailyBidEndTime || "23:59"}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ startAdornment: <Schedule sx={{ mr: 1, color: 'action.active' }} /> }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        {/* Right Column: Quotas */}
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ borderRadius: 3, p: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
              <Event color="primary" />
              <Typography variant="h6" fontWeight="bold">Grade Quotas & Limits</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '16px' }}>Grade</th>
                    <th style={{ textAlign: 'center', padding: '16px' }}>Min OVR</th>
                    <th style={{ textAlign: 'center', padding: '16px' }}>Max OVR</th>
                    <th style={{ textAlign: 'center', padding: '16px' }}>Max Allowed</th>
                    <th style={{ textAlign: 'center', padding: '16px' }}>Renew %</th>
                    <th style={{ textAlign: 'center', padding: '16px' }}>Release %</th>
                    <th style={{ textAlign: 'center', padding: '16px' }}>Max Seasons</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q) => (
                    <tr key={q.gradeId} style={{ borderBottom: '1px solid #f5f5f5', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>
                        <Chip label={`Grade ${q.gradeName}`} size="small" color={q.gradeName === 'S' ? 'warning' : 'default'} sx={{ fontWeight: 'bold' }} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.minOVR}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'minOVR', parseInt(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.maxOVR}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'maxOVR', parseInt(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.maxAllowedPerUser}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'maxAllowedPerUser', parseInt(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.renewalPercent || 0}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'renewalPercent', parseInt(e.target.value))}
                          sx={{ width: 70 }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.releasePercent || 0}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'releasePercent', parseInt(e.target.value))}
                          sx={{ width: 70 }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.maxSeasonsPerTeam || 0}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'maxSeasonsPerTeam', parseInt(e.target.value))}
                          sx={{ width: 70 }}
                          inputProps={{ min: 0 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminAuctionPage;
