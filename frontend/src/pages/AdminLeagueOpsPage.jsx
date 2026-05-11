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
  AccountBalanceWallet
} from "@mui/icons-material";
import leagueOpsService from "../services/leagueOpsService";
import { getFixtures } from "../api/fixtureApi";

// Premium Stat Card - Defined outside for stability
const StatCard = ({ title, value, icon, color, subValue }) => {
  return (
    <Card sx={{ 
      flex: 1, 
      minWidth: 200,
      background: 'white',
      borderRadius: 4,
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid',
      borderColor: alpha(color || '#000', 0.1),
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        backgroundColor: color || '#000'
      }
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="800" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            {subValue && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subValue}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 3, 
            backgroundColor: alpha(color || '#000', 0.1), 
            color: color || '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
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
  const [configTab, setConfigTab] = useState(0);
  const [judgeOpen, setJudgeOpen] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

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
      const [statsRes, matchesRes] = await Promise.all([
        leagueOpsService.getCycleStats(selectedCycleId),
        getFixtures()
      ]);
      setStats(Array.isArray(statsRes.data) ? statsRes.data : []);
      
      if (currentCycle && currentCycle.startDate && currentCycle.endDate) {
        const start = new Date(currentCycle.startDate);
        const end = new Date(currentCycle.endDate);
        const allMatches = matchesRes?.data?.data || [];
        const filtered = allMatches.filter(m => {
          if (!m || !m.matchDate) return false;
          const d = new Date(m.matchDate);
          return d >= start && d <= end;
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
  useEffect(() => { fetchData(); }, [fetchData]);

  const currentCycle = useMemo(() => 
    Array.isArray(cycles) ? cycles.find(c => c && c.id === selectedCycleId) : null
  , [cycles, selectedCycleId]);

  const totalMatches = Array.isArray(matches) ? matches.length : 0;
  const playedMatches = Array.isArray(matches) ? matches.filter(m => m && m.homeScore != null).length : 0;
  const pendingMatches = totalMatches - playedMatches;
  const daysRemaining = currentCycle && currentCycle.endDate ? Math.max(0, Math.ceil((new Date(currentCycle.endDate) - new Date()) / 86400000)) : 0;

  const statsDict = useMemo(() => {
    if (!Array.isArray(stats)) return {};
    return stats.reduce((acc, s) => {
      if (s && s.user_id) acc[s.user_id] = s;
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
      setConfigData({
        id: 0,
        cycleName: "New Cycle Template",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
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
    }
    setConfigTab(0);
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

  const handleRunAutoJudge = async () => {
    try {
      setLoading(true);
      const res = await leagueOpsService.runAutoJudge(selectedCycleId);
      setSnackbar({ open: true, message: `Auto-Judge complete: ${res?.data?.updatedCount || 0} matches updated.`, severity: "success" });
      setJudgeOpen(false);
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to execute Auto-Judge", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
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

      {/* Ribbon A: Control Center */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={3}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel sx={{ fontWeight: 'bold' }} shrink={cycles.length === 0 || selectedCycleId !== ""}>Active Cycle</InputLabel>
              <Select
                value={selectedCycleId}
                label="Active Cycle"
                onChange={(e) => setSelectedCycleId(e.target.value)}
                sx={{ bgcolor: 'white', borderRadius: 2, fontWeight: 'bold' }}
                displayEmpty
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
            
            {cycles.length === 0 ? (
              <Button 
                fullWidth variant="contained" color="primary" startIcon={<EventNote />}
                onClick={handleOpenConfig} sx={{ borderRadius: 2, py: 1.5, fontWeight: '900' }}
              >
                Create First Cycle
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button 
                  fullWidth variant="outlined" color="primary" startIcon={<Settings />}
                  onClick={handleOpenConfig} sx={{ borderRadius: 2, fontWeight: '800' }}
                >
                  Config
                </Button>
                <Button 
                  fullWidth variant="contained" color="secondary" startIcon={<Gavel />}
                  onClick={() => setJudgeOpen(true)} sx={{ borderRadius: 2, fontWeight: '800' }}
                >
                  Judge
                </Button>
              </Stack>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} lg={9}>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
            <StatCard title="Total Matches" value={totalMatches} icon={<Schedule />} color={theme.palette.primary.main} subValue="Allocated" />
            <StatCard title="Played" value={playedMatches} icon={<CheckCircle />} color={theme.palette.success.main} subValue={`${totalMatches > 0 ? Math.round((playedMatches/totalMatches)*100) : 0}% completion`} />
            <StatCard title="Pending" value={pendingMatches} icon={<PendingActions />} color={theme.palette.warning.main} subValue="Awaiting result" />
            <StatCard title="Time Remaining" value={`${daysRemaining} Days`} icon={<EventNote />} color={theme.palette.info.main} subValue={currentCycle ? `Ends ${new Date(currentCycle.endDate).toLocaleDateString()}` : "N/A"} />
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Zone B: Player Eligibility Board */}
        <Grid item xs={12} xl={8}>
          <Card sx={{ borderRadius: 5, boxShadow: '0 10px 40px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Leaderboard color="primary" />
                <Typography variant="h6" fontWeight="900">Player Eligibility Board</Typography>
              </Box>
              {loading && <CircularProgress size={24} />}
            </Box>
            <TableContainer sx={{ flex: 1 }}>
              <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '900', color: 'text.secondary', py: 2, width: '20%' }}>PLAYER</TableCell>
                    <TableCell align="center" sx={{ fontWeight: '900', color: 'text.secondary', width: '15%' }}>MATCHES</TableCell>
                    <TableCell align="center" sx={{ fontWeight: '900', color: 'text.secondary', width: '15%' }}>CHECK-IN</TableCell>
                    <TableCell sx={{ fontWeight: '900', color: 'text.secondary', width: '25%' }}>EI SCORE</TableCell>
                    <TableCell align="center" sx={{ fontWeight: '900', color: 'text.secondary', width: '12%' }}>TIER</TableCell>
                    <TableCell align="right" sx={{ fontWeight: '900', color: 'text.secondary', pr: 3, width: '13%' }}>EST. BONUS</TableCell>
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

        {/* Zone C: Match Adjustments */}
        <Grid item xs={12} xl={4}>
          <Card sx={{ borderRadius: 5, boxShadow: '0 10px 40px rgba(0,0,0,0.04)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Gavel color="secondary" />
                <Typography variant="h6" fontWeight="900">Match Adjustments</Typography>
              </Box>
            </Box>
            <TableContainer sx={{ flex: 1, maxHeight: 'calc(100vh - 450px)' }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '900', color: 'text.secondary', width: 250 }}>MATCHUP</TableCell>
                    <TableCell align="center" sx={{ fontWeight: '900', color: 'text.secondary', width: 120 }}>STATUS</TableCell>
                    <TableCell align="right" sx={{ fontWeight: '900', color: 'text.secondary', width: 80, pr: 3 }}>ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matches.length > 0 ? matches.map((match) => {
                    const statA = match.home ? statsDict[match.home] : null;
                    const statB = match.away ? statsDict[match.away] : null;
                    const isPlayed = match.homeScore != null;

                    return (
                      <React.Fragment key={match.fixtureId}>
                        <TableRow hover>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight="800" noWrap sx={{ maxWidth: 150 }}>{match.home} vs {match.away}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            {isPlayed ? (
                              <Chip label={`${match.homeScore}-${match.awayScore}`} size="small" variant="outlined" sx={{ fontWeight: '900', fontSize: 11 }} />
                            ) : (
                              <Chip label="PENDING" size="small" color="warning" sx={{ fontWeight: '900', fontSize: 10 }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {!isPlayed && (
                              <IconButton size="small" onClick={() => setExpandedMatch(expandedMatch === match.fixtureId ? null : match.fixtureId)}>
                                {expandedMatch === match.fixtureId ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ p: 0, border: 0 }} colSpan={3}>
                            <Collapse in={expandedMatch === match.fixtureId} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.05), m: 1, borderRadius: 3 }}>
                                <Typography variant="caption" fontWeight="900" color="secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                  <Shield sx={{ fontSize: 14 }} /> ADJUDICATION LOGIC
                                </Typography>
                                <Grid container spacing={1} sx={{ mb: 1.5 }}>
                                  <Grid item xs={6}>
                                    <Box sx={{ textAlign: 'center', bgcolor: 'white', p: 0.5, borderRadius: 1 }}>
                                      <Typography variant="caption" color="text.secondary">EI: {statA ? Math.round(statA.ei_score) : '?'}</Typography>
                                    </Box>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Box sx={{ textAlign: 'center', bgcolor: 'white', p: 0.5, borderRadius: 1 }}>
                                      <Typography variant="caption" color="text.secondary">EI: {statB ? Math.round(statB.ei_score) : '?'}</Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                                <Box sx={{ p: 1, bgcolor: theme.palette.primary.main, color: 'white', borderRadius: 2, mb: 1.5 }}>
                                  <Typography variant="body2" fontWeight="800" align="center" sx={{ fontSize: 12 }}>
                                    { !statA || !statB ? "Awaiting data..." :
                                      (statA.r_score < 20) ? `⚠️ ${match.home} Forfeit` :
                                      (statB.r_score < 20) ? `⚠️ ${match.away} Forfeit` :
                                      (Math.abs(statA.ei_score - statB.ei_score) >= (currentCycle?.eiThreshold || 15)) ? "⚖️ Clear Victory" : "⚖️ Strategic Draw"
                                    }
                                  </Typography>
                                </Box>
                                <Button fullWidth variant="contained" size="small" onClick={handleRunAutoJudge} sx={{ borderRadius: 2 }}>Execute Suggestion</Button>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  }) : (
                    <TableRow><TableCell align="center" sx={{ py: 10 }}><Typography variant="body2" color="text.secondary">No pending fixtures.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
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

            {/* Performance & Logic Group */}
            <Box>
              <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#64748b', letterSpacing: '0.1em', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                <RocketLaunch sx={{ fontSize: 18, color: 'primary.main' }} /> Performance Targets
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Stack direction="row" spacing={3}>
                  <TextField fullWidth type="number" label="Match Target" variant="outlined" value={configData.matchTarget} onChange={e => setConfigData({...configData, matchTarget: e.target.value})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <TextField fullWidth type="number" label="EI Threshold" variant="outlined" value={configData.eiThreshold} onChange={e => setConfigData({...configData, eiThreshold: e.target.value})} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>
              </Box>
            </Box>

            {/* Financials Group */}
            <Box>
              <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#64748b', letterSpacing: '0.1em', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                <MilitaryTech sx={{ fontSize: 18, color: 'primary.main' }} /> Bonus & Multipliers (%)
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Stack spacing={3}>
                  <TextField fullWidth type="number" label="Total Pool (฿)" variant="outlined" value={configData.bonusPool} onChange={e => setConfigData({...configData, bonusPool: e.target.value})} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <Stack direction="row" spacing={3}>
                    {[
                      { label: 'Elite', key: 'rateElite' },
                      { label: 'Active', key: 'rateActive' },
                      { label: 'Warning', key: 'rateWarning' }
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

      {/* Auto-Judge Execution Confirmation */}
      <Dialog open={judgeOpen} onClose={() => setJudgeOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 5 } }}>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: alpha(theme.palette.secondary.main, 0.1), color: theme.palette.secondary.main, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <Gavel sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" fontWeight="900" gutterBottom>Execute Auto-Judge?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            This will finalize all pending matches in the current cycle and calculate final bonuses. This action cannot be undone.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button fullWidth onClick={() => setJudgeOpen(false)} sx={{ fontWeight: 'bold' }}>Cancel</Button>
            <Button fullWidth variant="contained" color="secondary" onClick={handleRunAutoJudge} sx={{ fontWeight: '900', borderRadius: 3 }}>Run Logic</Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 3, fontWeight: 'bold' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminLeagueOpsPage;
