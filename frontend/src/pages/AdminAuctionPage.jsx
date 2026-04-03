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
  const [savingQuotas, setSavingQuotas] = useState(false);

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

  const handleSave = async () => {
    try {
      await auctionService.updateSettings(settings);
      enqueueSnackbar("Auction settings saved successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleQuotaChange = (id, field, value) => {
    setQuotas(prev => prev.map(q => q.gradeId === id ? { ...q, [field]: value } : q));
  };

  const handleSaveQuotas = async () => {
    try {
      setSavingQuotas(true);
      await auctionService.updateQuotas(quotas);
      enqueueSnackbar("Grade quotas updated successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setSavingQuotas(false);
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
            Auction Management (Admin)
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Finance & Limits */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ borderRadius: 3, p: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Min Bid Price"
                  name="minBidPrice"
                  type="number"
                  value={settings?.minBidPrice || ""}
                  onChange={handleChange}
                  variant="outlined"
                  InputProps={{ startAdornment: <PriceCheck sx={{ mr: 1, color: 'action.active' }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
        </Grid>

        {/* Phase Durations */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ borderRadius: 3, p: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
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
        </Grid>

        {/* Grade Quotas */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ borderRadius: 3, p: 4, border: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Event color="primary" />
                <Typography variant="h6" fontWeight="bold">Grade Quotas & Limits</Typography>
              </Box>
              <Button 
                variant="outlined" 
                startIcon={<Save />} 
                onClick={handleSaveQuotas}
                disabled={savingQuotas}
              >
                Save Quotas
              </Button>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Grade</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Min OVR</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Max OVR</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Max Allowed per User</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q) => (
                    <tr key={q.gradeId} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>Grade {q.gradeName}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.minOVR}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'minOVR', parseInt(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.maxOVR}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'maxOVR', parseInt(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          value={q.maxAllowedPerUser}
                          onChange={(e) => handleQuotaChange(q.gradeId, 'maxAllowedPerUser', parseInt(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>

        {/* Schedule & Hours */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ borderRadius: 3, p: 4, border: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
              <Event color="primary" />
              <Typography variant="h6" fontWeight="bold">Auction Schedule & Operating Hours</Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="auctionStartDate"
                  type="date"
                  value={settings?.auctionStartDate ? settings.auctionStartDate.split('T')[0] : ""}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  name="auctionEndDate"
                  type="date"
                  value={settings?.auctionEndDate ? settings.auctionEndDate.split('T')[0] : ""}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
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
              </Grid>
              <Grid item xs={12} sm={3}>
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
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Action Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" mt={2} mb={4}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={handleSave}
              size="large"
              sx={{ 
                minWidth: 300, 
                py: 2, 
                borderRadius: 3, 
                boxShadow: '0 8px 16px rgba(25, 118, 210, 0.25)',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Save All Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminAuctionPage;
