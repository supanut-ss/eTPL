import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  CircularProgress,
  Alert,
  Snackbar,
  alpha,
  useTheme,
  Tooltip,
  Divider,
  Stack
} from "@mui/material";
import { 
  Settings, 
  Gavel, 
  ExpandMore, 
  ExpandLess, 
  Refresh, 
  Schedule, 
  CheckCircle, 
  PendingActions, 
  EventNote,
  Leaderboard,
  Shield,
  ManageHistory,
  EmojiEvents,
  RocketLaunch,
  MilitaryTech,
  Save,
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  Close
} from "@mui/icons-material";
import leagueOpsService from "../services/leagueOpsService";
import { getFixtures } from "../api/fixtureApi";

const StatCard = ({ title, value, icon, color, subValue, trend }) => {
  const theme = useTheme();
  return (
    <Card sx={{ 
      flex: 1, 
      minWidth: 220,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: 5,
      border: '1px solid',
      borderColor: alpha(color || '#000', 0.15),
      boxShadow: `0 8px 32px ${alpha(color || '#000', 0.08)}`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: `0 12px 40px ${alpha(color || '#000', 0.15)}`,
        borderColor: alpha(color || '#000', 0.3),
        '& .icon-box': {
          transform: 'scale(1.1) rotate(5deg)',
          boxShadow: `0 4px 15px ${alpha(color || '#000', 0.3)}`
        }
      }
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" sx={{ color: alpha('#0f172a', 0.6), fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', mb: 0.5, display: 'block', fontSize: 10 }}>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" fontWeight="900" sx={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                {value}
              </Typography>
              {trend && (
                <Typography variant="caption" sx={{ color: trend > 0 ? 'success.main' : 'error.main', fontWeight: 800 }}>
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: alpha('#0f172a', 0.45), mt: 0.5, display: 'block', fontWeight: 600 }}>
              {subValue}
            </Typography>
          </Box>
          <Box className="icon-box" sx={{ 
            p: 1.5, 
            borderRadius: 3.5, 
            background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.2)} 100%)`, 
            color: color || '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: `0 4px 10px ${alpha(color, 0.1)}`
          }}>
            {React.cloneElement(icon, { sx: { fontSize: 26 } })}
          </Box>
        </Box>
      </CardContent>
      {/* Decorative Gradient Glow */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: -20, 
        right: -20, 
        width: 100, 
        height: 100, 
        background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, transparent 70%)`,
        zIndex: 0,
        pointerEvents: 'none'
      }} />
    </Card>
  );
};

const AdminLeagueOpsPage = () => {
  const theme = useTheme();
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [stats, setStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [previewResults, setPreviewResults] = useState({});
  const [isApplying, setIsApplying] = useState(false);

  const [configData, setConfigData] = useState({
    id: 0,
    cycleName: "",
    startDate: "",
    endDate: "",
    matchTarget: 12,
    bonusPool: 0,
    eiThreshold: 15,
    rateElite: 100,
    rateActive: 70,
    rateWarning: 30,
    rateInactive: 0,
    status: "active",
    matchStartNo: 1,
    matchEndNo: 12
  });

  const fetchCycles = useCallback(async () => {
    try {
      setPreviewResults({});
      const res = await leagueOpsService.getCycles();
      const data = Array.isArray(res.data) ? res.data : [];
      setCycles(data);
      if (data.length > 0 && !selectedCycleId) {
        setSelectedCycleId(data[0].id);
      }
    } catch (err) {
      setError("Failed to fetch cycles");
    }
  }, [selectedCycleId]);

  const fetchData = useCallback(async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    try {
      const currentCycle = cycles.find(c => c && c.id === selectedCycleId);
      const [statsRes, matchesRes, previewRes] = await Promise.all([
        leagueOpsService.getCycleStats(selectedCycleId),
        getFixtures(),
        leagueOpsService.getAutoJudgePreview(selectedCycleId)
      ]);
      setStats(Array.isArray(statsRes.data) ? statsRes.data : []);

      if (Array.isArray(previewRes.data)) {
        const suggestions = previewRes.data.reduce((acc, curr) => {
          acc[curr.fixtureId] = { 
            homeScore: curr.suggestedHomeScore, 
            awayScore: curr.suggestedAwayScore,
            reason: curr.reason
          };
          return acc;
        }, {});
        setPreviewResults(suggestions);
      }
      
      if (currentCycle) {
        const start = new Date(currentCycle.startDate);
        const end = new Date(currentCycle.endDate);
        const allMatches = matchesRes?.data?.data || [];
        const filtered = allMatches.filter(m => {
          if (!m) return false;
          const mNo = parseInt(m.match);
          const sNo = parseInt(currentCycle.matchStartNo);
          const eNo = parseInt(currentCycle.matchEndNo);
          
          const inRange = mNo >= sNo && mNo <= eNo;
          const isPending = !m.matchDate && m.homeScore === null && m.active?.toUpperCase() !== "CC";
          return inRange && isPending;
        });
        setMatches(filtered);
      }
    } catch (err) {
      setError("Data fetch error");
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId, cycles]);

  useEffect(() => { fetchCycles(); }, []);
  useEffect(() => { 
    setPreviewResults({});
    fetchData(); 
  }, [selectedCycleId, fetchData]);

  const currentCycle = useMemo(() => 
    Array.isArray(cycles) ? cycles.find(c => c && c.id === selectedCycleId) : null
  , [cycles, selectedCycleId]);

  const totalMatches = Array.isArray(matches) ? matches.length : 0;
  const playedMatches = Array.isArray(matches) ? matches.filter(m => m && m.homeScore != null).length : 0;
  const pendingMatches = totalMatches - playedMatches;
  const daysRemaining = currentCycle && currentCycle.endDate ? Math.max(0, Math.ceil((new Date(currentCycle.endDate) - new Date()) / 86400000)) : 0;

  const statsDict = useMemo(() => {
    return stats.reduce((acc, curr) => {
      if (curr.user_id) acc[curr.user_id.toUpperCase()] = curr;
      return acc;
    }, {});
  }, [stats]);

  const handleOpenConfig = () => {
    if (currentCycle) {
      setConfigData({
        id: currentCycle.id,
        cycleName: currentCycle.cycleName || "",
        startDate: currentCycle.startDate ? currentCycle.startDate.split('T')[0] : "",
        endDate: currentCycle.endDate ? currentCycle.endDate.split('T')[0] : "",
        matchTarget: currentCycle.matchTarget || 12,
        bonusPool: currentCycle.bonusPool || 0,
        eiThreshold: currentCycle.eiThreshold || 15,
        rateElite: currentCycle.rateElite || 100,
        rateActive: currentCycle.rateActive || 70,
        rateWarning: currentCycle.rateWarning || 30,
        rateInactive: currentCycle.rateInactive || 0,
        status: currentCycle.status || "active",
        matchStartNo: currentCycle.matchStartNo || 1,
        matchEndNo: currentCycle.matchEndNo || 12
      });
    } else {
      // For a new cycle, inherit settings from the last available cycle
      const lastCycle = currentCycle || (cycles.length > 0 ? cycles[cycles.length - 1] : null);
      const nextMatchStart = (lastCycle?.matchEndNo || 0) + 1;
      const targetCount = lastCycle?.matchTarget || 12;

      setConfigData({
        id: 0,
        cycleName: `Cycle ${cycles.length + 1}`,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        matchTarget: targetCount,
        bonusPool: lastCycle?.bonusPool || 0,
        eiThreshold: lastCycle?.eiThreshold || 15,
        rateElite: lastCycle?.rateElite || 100,
        rateActive: lastCycle?.rateActive || 70,
        rateWarning: lastCycle?.rateWarning || 30,
        rateInactive: lastCycle?.rateInactive || 0,
        status: "active",
        matchStartNo: nextMatchStart,
        matchEndNo: nextMatchStart + targetCount - 1
      });
    }
    setConfigOpen(true);
  };

  const handleConfigSave = async () => {
    try {
      await leagueOpsService.saveCycle(configData);
      setSnackbar({ open: true, message: "Cycle configuration saved", severity: "success" });
      setConfigOpen(false);
      fetchCycles();
    } catch (err) {
      setSnackbar({ open: true, message: "Error saving configuration", severity: "error" });
    }
  };

  const applySingleSuggestion = (match, statA, statB) => {
    if (!statA || !statB) return;
    let h = 0, a = 0, reason = "";
    const threshold = currentCycle?.eiThreshold || 20;

    const diff = statA.ei_score - statB.ei_score;
    if (diff >= threshold) { h = 3; a = 0; reason = "ความสม่ำเสมอสูงกว่าชัดเจน (Home Win)"; }
    else if (diff <= -threshold) { h = 0; a = 3; reason = "ความสม่ำเสมอสูงกว่าชัดเจน (Away Win)"; }
    else { h = 0; a = 0; reason = "ความสม่ำเสมอสูสีกัน (Balanced Draw)"; }

    setPreviewResults(prev => ({
      ...prev,
      [match.fixtureId]: { homeScore: h, awayScore: a, reason: reason }
    }));
  };

  const handlePreviewJudge = async () => {
    try {
      setPreviewResults({});
      setLoading(true);
      const res = await leagueOpsService.getAutoJudgePreview(selectedCycleId);
      const data = Array.isArray(res.data) ? res.data : [];
      
      if (!Array.isArray(res.data)) {
        throw new Error(res.data?.message || "Server returned invalid preview data");
      }

      const suggestions = res.data.reduce((acc, curr) => {
        acc[curr.fixtureId] = { 
          homeScore: curr.suggestedHomeScore, 
          awayScore: curr.suggestedAwayScore,
          reason: curr.reason
        };
        return acc;
      }, {});
      setPreviewResults(suggestions);
      setSnackbar({ open: true, message: `Preview generated for ${res.data.length} matches.`, severity: "info" });
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.message || err.message;
      setSnackbar({ open: true, message: `Error: ${msg}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchApply = async () => {
    try {
      setIsApplying(true);
      const payload = Object.entries(previewResults).map(([id, val]) => ({
        fixtureId: id,
        homeScore: val.homeScore,
        awayScore: val.awayScore
      }));

      if (payload.length === 0) return;

      await leagueOpsService.applyBatchResults(payload);
      setSnackbar({ open: true, message: "Successfully applied all results", severity: "success" });
      setPreviewResults({});
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to apply results", severity: "error" });
    } finally {
      setIsApplying(false);
    }
  };

  const updatePreviewScore = (fid, field, val) => {
    setPreviewResults(prev => ({
      ...prev,
      [fid]: { ...prev[fid], [field]: parseInt(val) || 0 }
    }));
  };

  return (
    <Box sx={{ 
      width: '100%', 
      minHeight: 'calc(100vh - 120px)', 
      display: 'flex', 
      flexDirection: 'column',
      px: 4, py: 3, 
      maxWidth: '100%', 
      overflowX: 'hidden' 
    }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4, 
        px: { xs: 1, sm: 0 } 
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <ManageHistory color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">League Operations</Typography>
            <Typography variant="body2" color="text.secondary">ADMINISTRATIVE CONTROL CENTER</Typography>
          </Box>
        </Box>
        <Box>
           <Tooltip title="Refresh All Data">
              <IconButton onClick={fetchData} disabled={loading} sx={{ bgcolor: 'white', boxShadow: 1, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) } }}>
                <Refresh />
              </IconButton>
           </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

      {/* Ribbon A: Control & Stats Hub */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Unified Control Panel */}
        <Grid item xs={12} lg={4} sx={{ display: 'flex' }}>
          <Paper elevation={0} sx={{ 
            p: 2.5, 
            borderRadius: 5, 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0', 
            height: '100%', 
            width: '100%',
            minWidth: { lg: 340 },
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            gap: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
          }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5, display: 'block', fontSize: 10 }}>
                League Operations
              </Typography>
              <Typography variant="h6" fontWeight="900" sx={{ color: '#0f172a', letterSpacing: '-0.02em', noWrap: true }}>
                Command Center
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <FormControl fullWidth variant="filled" size="small" hiddenLabel>
                <Select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: 3, 
                    fontWeight: '800',
                    '&:before, &:after': { display: 'none' },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    '& .MuiSelect-select': { py: 1.5, pr: 4 }
                  }}
                  displayEmpty
                  MenuProps={{ PaperProps: { sx: { borderRadius: 3, mt: 1, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' } } }}
                >
                  {cycles.length === 0 ? (
                    <MenuItem value=""><em>-- No cycles found --</em></MenuItem>
                  ) : (
                    cycles.map(c => (
                      <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 'bold' }}>{c.cycleName}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              
              <Tooltip title="Configure Cycle Settings">
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleOpenConfig} 
                  sx={{ 
                    borderRadius: 3, 
                    minWidth: 54, 
                    height: 54, 
                    boxShadow: '0 8px 20px rgba(25, 118, 210, 0.2)' 
                  }}
                >
                  <Settings />
                </Button>
              </Tooltip>
            </Stack>
          </Paper>
        </Grid>

        {/* Stats Hub */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
            <StatCard 
              title="Total Matches" 
              value={totalMatches} 
              icon={<Schedule />} 
              color="#3b82f6" 
              subValue="Allocated for this cycle" 
            />
            <StatCard 
              title="Completion" 
              value={`${totalMatches > 0 ? Math.round((playedMatches/totalMatches)*100) : 0}%`} 
              icon={<CheckCircle />} 
              color="#10b981" 
              subValue={`${playedMatches} matches played`}
            />
            <StatCard 
              title="Time Left" 
              value={`${daysRemaining}d`} 
              icon={<EventNote />} 
              color="#f59e0b" 
              subValue={currentCycle ? `Ends ${new Date(currentCycle.endDate).toLocaleDateString()}` : "Cycle inactive"} 
            />
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Zone B: Player Eligibility Board */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 5, 
            boxShadow: '0 20px 50px rgba(0,0,0,0.04)', 
            display: 'flex', 
            flexDirection: 'column', 
            width: '100%', 
            border: '1px solid #e2e8f0',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              p: 3, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'linear-gradient(to right, #ffffff, #f8fafc)',
              borderBottom: '1px solid rgba(0,0,0,0.05)' 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                  <Leaderboard sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="900" sx={{ color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Player Eligibility Board
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Real-time performance tracking for {stats.length} active players
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {loading && <CircularProgress size={20} thickness={5} />}
                <Button 
                  variant="contained" 
                  disableElevation
                  color="secondary" 
                  startIcon={<Gavel />}
                  onClick={() => {
                    setPreviewOpen(true);
                    handlePreviewJudge();
                  }}
                  sx={{ 
                    borderRadius: 3, 
                    px: 3, py: 1,
                    fontWeight: '900', 
                    textTransform: 'none',
                    boxShadow: '0 8px 20px rgba(156, 39, 176, 0.2)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 25px rgba(156, 39, 176, 0.3)' },
                    transition: 'all 0.2s'
                  }}
                >
                  Review & Judge
                </Button>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small" sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow>
                    {['USER ID', 'P-SCORE', 'R-SCORE', 'EI SCORE', 'TIER STATUS', 'EST. BONUS'].map((head) => (
                      <TableCell 
                        key={head}
                        align={head === 'USER ID' ? 'left' : (head === 'EST. BONUS' ? 'right' : 'center')}
                        sx={{ 
                          bgcolor: '#f8fafc', 
                          color: '#64748b', 
                          fontWeight: '800', 
                          fontSize: 11, 
                          py: 2, 
                          letterSpacing: '0.05em',
                          borderBottom: '2px solid #e2e8f0'
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.length > 0 ? stats.map((row) => {
                    const ei = row.ei_score || 0;
                    let color = theme.palette.error.main;
                    if (ei >= 90) color = theme.palette.secondary.main;
                    else if (ei >= 75) color = theme.palette.success.main;
                    else if (ei >= 50) color = theme.palette.warning.main;

                    return (
                      <TableRow key={row.user_id} hover>
                        <TableCell sx={{ py: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" fontWeight="800">{row.user_id}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="700">{row.played_count} <span style={{ color: theme.palette.text.secondary }}>/ {currentCycle?.matchTarget || 12}</span></Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${Math.round(row.r_score || 0)}%`} size="small" variant="outlined" sx={{ fontWeight: '800', color: color, borderColor: alpha(color, 0.3) }} />
                        </TableCell>
                        <TableCell sx={{ width: '180px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <LinearProgress variant="determinate" value={Math.min(100, ei)} sx={{ height: 6, borderRadius: 3, bgcolor: alpha(color, 0.1), '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                            </Box>
                            <Typography variant="caption" fontWeight="900" sx={{ color: color, minWidth: 20 }}>{Math.round(ei)}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: color, color: 'white', fontSize: 10, fontWeight: '900' }}>{row.tier || "INACTIVE"}</Box>
                        </TableCell>
                        <TableCell align="right" sx={{ pr: 3 }}>
                          <Typography variant="subtitle2" fontWeight="900" color="primary">฿{Math.round(row.est_bonus || 0).toLocaleString()}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}><Typography variant="body2" color="text.secondary">No player records for this cycle.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

      {/* Match Adjustments Modal */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        maxWidth="lg" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#f8fafc', overflow: 'hidden' } }}
      >
        <Box sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '85vh' }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white', borderBottom: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'secondary.main', color: 'white', display: 'flex', boxShadow: '0 4px 12px rgba(156, 39, 176, 0.2)' }}>
                <Gavel sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#0f172a', lineHeight: 1.2 }}>Auto-Judge Adjudication ({matches.length})</Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Review and apply AI-suggested results for Cycle {selectedCycleId}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {Object.keys(previewResults).length > 0 && (
                <Button variant="outlined" size="small" onClick={() => setPreviewResults({})} sx={{ borderRadius: 2, fontWeight: '800' }}>Clear All</Button>
              )}
              <Button 
                variant="contained" 
                color="secondary" 
                size="small" 
                onClick={handleBatchApply}
                disabled={isApplying || Object.keys(previewResults).length === 0}
                startIcon={isApplying ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                sx={{ borderRadius: 2, fontWeight: '900' }}
              >
                Apply All Results
              </Button>
              <IconButton onClick={() => setPreviewOpen(false)} size="small" sx={{ ml: 1, border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f1f5f9' } }}>
                <Close sx={{ color: '#64748b' }} />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', maxHeight: '100%' }}>
              <Table stickyHeader sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '800', color: '#475569', fontSize: 11, letterSpacing: '0.05em', pl: 3, bgcolor: '#f1f5f9' }}>MATCHUP & EI SCORES</TableCell>
                    <TableCell align="center" sx={{ fontWeight: '800', color: '#475569', fontSize: 11, letterSpacing: '0.05em', width: 140, bgcolor: '#f1f5f9' }}>SCORE</TableCell>
                    <TableCell align="left" sx={{ fontWeight: '800', color: '#475569', fontSize: 11, letterSpacing: '0.05em', pr: 3, bgcolor: '#f1f5f9' }}>ADJUDICATION LOGIC</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ bgcolor: 'white' }}>
                  {matches.length > 0 ? matches.map((match) => {
                    const statA = match.home ? statsDict[match.home.toUpperCase()] : null;
                    const statB = match.away ? statsDict[match.away.toUpperCase()] : null;
                    const isPlayed = match.homeScore != null;
                    return (
                      <TableRow key={match.fixtureId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 2.5, pl: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 150, justifyContent: 'flex-end' }}>
                              <Typography variant="body2" fontWeight="800" sx={{ color: '#1e293b' }}>{match.home}</Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 900, px: 1, py: 0.3, borderRadius: 1, bgcolor: '#f1f5f9', color: 'primary.main', border: '1px solid #e2e8f0' }}>
                                {statA ? Math.round(statA.ei_score) : '--'}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 900, fontSize: 11 }}>VS</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 150 }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 900, px: 1, py: 0.3, borderRadius: 1, bgcolor: '#f1f5f9', color: 'secondary.main', border: '1px solid #e2e8f0' }}>
                                {statB ? Math.round(statB.ei_score) : '--'}
                              </Typography>
                              <Typography variant="body2" fontWeight="800" sx={{ color: '#1e293b' }}>{match.away}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {isPlayed ? (
                            <Chip label={`${match.homeScore}-${match.awayScore}`} size="small" sx={{ fontWeight: '900', bgcolor: '#f1f5f9', color: '#475569' }} />
                          ) : previewResults[match.fixtureId] ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <TextField size="small" value={previewResults[match.fixtureId].homeScore} onChange={(e) => updatePreviewScore(match.fixtureId, 'homeScore', e.target.value)} sx={{ width: 45, '& .MuiInputBase-input': { p: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: 16, color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 } }} />
                              <Typography variant="h6" fontWeight="bold" sx={{ color: '#cbd5e1' }}>:</Typography>
                              <TextField size="small" value={previewResults[match.fixtureId].awayScore} onChange={(e) => updatePreviewScore(match.fixtureId, 'awayScore', e.target.value)} sx={{ width: 45, '& .MuiInputBase-input': { p: '8px 4px', textAlign: 'center', fontWeight: 900, fontSize: 16, color: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2 } }} />
                            </Box>
                          ) : (
                            <Chip label="PENDING" size="small" sx={{ fontWeight: '900', fontSize: 11, bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }} />
                          )}
                        </TableCell>
                        <TableCell align="left" sx={{ pr: 3 }}>
                          {previewResults[match.fixtureId]?.reason ? (
                            <Box sx={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 1.5, 
                              px: 2, py: 0.8, borderRadius: 2.5, 
                              bgcolor: alpha(
                                previewResults[match.fixtureId].reason.includes("Home Win") ? "#0284c7" : 
                                previewResults[match.fixtureId].reason.includes("Away Win") ? "#e11d48" : 
                                "#64748b", 
                                0.08
                              ), 
                              border: `1px solid ${alpha(
                                previewResults[match.fixtureId].reason.includes("Home Win") ? "#0284c7" : 
                                previewResults[match.fixtureId].reason.includes("Away Win") ? "#e11d48" : 
                                "#64748b", 
                                0.2
                              )}` 
                            }}>
                              <Box sx={{ 
                                width: 8, height: 8, borderRadius: '50%', 
                                bgcolor: previewResults[match.fixtureId].reason.includes("Home Win") ? "#0284c7" : 
                                         previewResults[match.fixtureId].reason.includes("Away Win") ? "#e11d48" : 
                                         "#64748b" 
                              }} />
                              <Typography variant="caption" fontWeight="800" sx={{ 
                                color: previewResults[match.fixtureId].reason.includes("Home Win") ? "#0369a1" : 
                                       previewResults[match.fixtureId].reason.includes("Away Win") ? "#be123c" : 
                                       "#475569", 
                                fontSize: 11, letterSpacing: '0.02em' 
                              }}>
                                {previewResults[match.fixtureId].reason}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" fontWeight="800" sx={{ color: '#94a3b8', fontSize: 11 }}>{isPlayed ? "MATCH COMPLETED" : "AWAITING PREVIEW DATA"}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 10 }}><Typography variant="body2" color="text.secondary">No pending fixtures.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
        </Box>
      </Dialog>
      </Grid>

      <Dialog 
        open={configOpen} 
        onClose={() => setConfigOpen(false)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', p: 4, pb: 3, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'white', color: 'primary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Settings sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="800" sx={{ letterSpacing: '-0.02em', color: '#0f172a', mb: 0.5 }}>Cycle Configuration</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Manage eligibility and dynamic bonus parameters</Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4, bgcolor: '#ffffff' }}>
          <Stack spacing={4}>
            {/* Cycle Identity & Timeline Group */}
            <Box>
              <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#64748b', letterSpacing: '0.1em', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                <EmojiEvents sx={{ fontSize: 18, color: 'primary.main' }} /> Cycle Identity & Timeline
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Stack spacing={3}>
                  <TextField fullWidth label="Cycle Name" variant="outlined" value={configData.cycleName} onChange={e => setConfigData({...configData, cycleName: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <Stack direction="row" spacing={3}>
                    <TextField fullWidth type="date" label="Start Date" variant="outlined" value={configData.startDate} onChange={e => setConfigData({...configData, startDate: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    <TextField fullWidth type="date" label="End Date" variant="outlined" value={configData.endDate} onChange={e => setConfigData({...configData, endDate: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    <TextField fullWidth type="number" label="Start Match No." variant="outlined" value={configData.matchStartNo} onChange={e => setConfigData({...configData, matchStartNo: parseInt(e.target.value) || 0})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    <TextField fullWidth type="number" label="End Match No." variant="outlined" value={configData.matchEndNo} onChange={e => setConfigData({...configData, matchEndNo: parseInt(e.target.value) || 0})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Stack>
                </Stack>
              </Box>
            </Box>

            {/* Part 2: Performance & Financial Rewards */}
            <Box>
              <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#64748b', letterSpacing: '0.1em', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                <RocketLaunch sx={{ fontSize: 18, color: 'primary.main' }} /> Performance & Financial Rewards
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Stack spacing={3}>
                  <Stack direction="row" spacing={3}>
                    <TextField fullWidth type="number" label="Match Target" variant="outlined" value={configData.matchTarget} onChange={e => setConfigData({...configData, matchTarget: e.target.value})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    <TextField fullWidth type="number" label="EI Threshold" variant="outlined" value={configData.eiThreshold} onChange={e => setConfigData({...configData, eiThreshold: e.target.value})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    <TextField fullWidth type="number" label="Total Pool (฿)" variant="outlined" value={configData.bonusPool} onChange={e => setConfigData({...configData, bonusPool: e.target.value})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    {[
                      { label: 'Elite (%)', key: 'rateElite' },
                      { label: 'Active (%)', key: 'rateActive' },
                      { label: 'Warning (%)', key: 'rateWarning' }
                    ].map((tier) => (
                      <TextField 
                        key={tier.key}
                        fullWidth 
                        type="number" 
                        label={tier.label} 
                        variant="outlined" 
                        value={configData[tier.key]} 
                        onChange={e => setConfigData({...configData, [tier.key]: e.target.value})} 
                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} 
                      />
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
          <Button onClick={() => setConfigOpen(false)} sx={{ color: '#64748b', fontWeight: 'bold', textTransform: 'none', borderRadius: 2, px: 3, '&:hover': { bgcolor: '#f1f5f9' } }}>Cancel</Button>
          <Button 
            variant="contained" 
            disableElevation
            startIcon={<Save />}
            onClick={handleConfigSave}
            sx={{ borderRadius: 2, px: 4, py: 1, fontWeight: 'bold', textTransform: 'none', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)' }}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 'bold' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminLeagueOpsPage;
