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
  Stack,
  Avatar,
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
  Close,
  Delete,
} from "@mui/icons-material";
import leagueOpsService from "../services/leagueOpsService";
import { getFixtures } from "../api/fixtureApi";
import { getUserLogoUrl } from "../utils/imageUtils";

const StatCard = ({ title, value, color, subValue, trend }) => {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 180,
        px: 1,
        py: 0.5,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: alpha("#0f172a", 0.6),
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          mb: 0.5,
          display: "block",
          fontSize: 10,
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography
          variant="h4"
          fontWeight="900"
          sx={{ color: color || "#0f172a", letterSpacing: "-0.02em" }}
        >
          {value}
        </Typography>
        {trend && (
          <Typography
            variant="caption"
            sx={{
              color: trend > 0 ? "success.main" : "error.main",
              fontWeight: 800,
            }}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: alpha("#0f172a", 0.45),
          mt: 0.5,
          display: "block",
          fontWeight: 600,
        }}
      >
        {subValue}
      </Typography>
    </Box>
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [historyDetailOpen, setHistoryDetailOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [previewResults, setPreviewResults] = useState({});
  const [isApplying, setIsApplying] = useState(false);
  const [judgeHistory, setJudgeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    matchEndNo: 12,
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
      const currentCycle = cycles.find((c) => c && c.id == selectedCycleId);
      
      // Decouple requests to ensure one failure doesn't block others
      const [statsRes, matchesRes, previewRes] = await Promise.allSettled([
        leagueOpsService.getCycleStats(selectedCycleId),
        getFixtures(),
        leagueOpsService.getAutoJudgePreview(selectedCycleId),
      ]);

      // Process Stats
      if (statsRes.status === "fulfilled") {
        const resData = statsRes.value?.data;
        let statsData = [];
        if (Array.isArray(resData)) statsData = resData;
        else if (resData && Array.isArray(resData.data)) statsData = resData.data;
        else if (resData && typeof resData === 'object') {
          // Look for any array property if direct mapping fails
          const firstArray = Object.values(resData).find(v => Array.isArray(v));
          if (firstArray) statsData = firstArray;
        }
        setStats(statsData);
      } else {
        console.error("Stats fetch failed:", statsRes.reason);
        setSnackbar({
          open: true,
          message: "Failed to load player stats",
          severity: "error",
        });
      }

      // Process Preview Suggestions
      if (previewRes.status === "fulfilled" && Array.isArray(previewRes.value?.data)) {
        const suggestions = previewRes.value.data.reduce((acc, curr) => {
          const fid = curr.fixtureId || curr.fixture_id;
          if (fid) {
            acc[fid] = {
              homeScore: curr.suggestedHomeScore ?? curr.suggested_home_score,
              awayScore: curr.suggestedAwayScore ?? curr.suggested_away_score,
              reason: curr.reason,
            };
          }
          return acc;
        }, {});
        setPreviewResults(suggestions);
      }

      // Process Matches
      if (currentCycle && matchesRes.status === "fulfilled") {
        const allMatches = matchesRes.value?.data?.data || matchesRes.value?.data || [];
        const filtered = allMatches.filter((m) => {
          if (!m) return false;
          const mNo = parseInt(m.match || m.matchNo);
          const sNo = parseInt(currentCycle.matchStartNo || currentCycle.match_start_no);
          const eNo = parseInt(currentCycle.matchEndNo || currentCycle.match_end_no);
          return mNo >= sNo && mNo <= eNo;
        });
        setMatches(filtered);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.message;
      setError(`Data fetch error: ${msg}`);
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId, cycles]);

  const fetchHistory = useCallback(async () => {
    if (!selectedCycleId) return;
    setLoadingHistory(true);
    try {
      const res = await leagueOpsService.getJudgeHistory(selectedCycleId);
      setJudgeHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch judge history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    fetchCycles();
  }, []);
  useEffect(() => {
    setPreviewResults({});
    fetchData();
    fetchHistory();
  }, [selectedCycleId, fetchData, fetchHistory]);

  const currentCycle = useMemo(
    () =>
      Array.isArray(cycles)
        ? cycles.find((c) => c && c.id === selectedCycleId)
        : null,
    [cycles, selectedCycleId],
  );

  const totalMatches = Array.isArray(matches) ? matches.length : 0;
  const playedMatches = Array.isArray(matches)
    ? matches.filter((m) => m && m.homeScore != null).length
    : 0;
  const pendingMatches = totalMatches - playedMatches;
  const daysRemaining =
    currentCycle && currentCycle.endDate
      ? Math.max(
          0,
          Math.ceil((new Date(currentCycle.endDate) - new Date()) / 86400000),
        )
      : 0;

  const statsDict = useMemo(() => {
    return stats.reduce((acc, curr) => {
      const uid = curr.user_id || curr.userId;
      if (uid) acc[uid.toUpperCase()] = curr;
      return acc;
    }, {});
  }, [stats]);

  const handleOpenConfig = () => {
    if (currentCycle) {
      setConfigData({
        id: currentCycle.id,
        cycleName: currentCycle.cycleName || "",
        startDate: currentCycle.startDate
          ? currentCycle.startDate.split("T")[0]
          : "",
        endDate: currentCycle.endDate ? currentCycle.endDate.split("T")[0] : "",
        matchTarget: currentCycle.matchTarget || 12,
        bonusPool: currentCycle.bonusPool || 0,
        eiThreshold: currentCycle.eiThreshold || 15,
        rateElite: currentCycle.rateElite || 100,
        rateActive: currentCycle.rateActive || 70,
        rateWarning: currentCycle.rateWarning || 30,
        rateInactive: currentCycle.rateInactive || 0,
        status: currentCycle.status || "active",
        matchStartNo: currentCycle.matchStartNo || 1,
        matchEndNo: currentCycle.matchEndNo || 12,
      });
    } else {
      const lastCycle =
        currentCycle || (cycles.length > 0 ? cycles[cycles.length - 1] : null);
      const nextMatchStart = (lastCycle?.matchEndNo || 0) + 1;
      const targetCount = lastCycle?.matchTarget || 12;

      setConfigData({
        id: 0,
        cycleName: `Cycle ${cycles.length + 1}`,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 14 * 86400000)
          .toISOString()
          .split("T")[0],
        matchTarget: targetCount,
        bonusPool: lastCycle?.bonusPool || 0,
        eiThreshold: lastCycle?.eiThreshold || 15,
        rateElite: lastCycle?.rateElite || 100,
        rateActive: lastCycle?.rateActive || 70,
        rateWarning: lastCycle?.rateWarning || 30,
        rateInactive: lastCycle?.rateInactive || 0,
        status: "active",
        matchStartNo: nextMatchStart,
        matchEndNo: nextMatchStart + targetCount - 1,
      });
    }
    setConfigOpen(true);
  };

  const handleConfigSave = async () => {
    try {
      await leagueOpsService.saveCycle(configData);
      setSnackbar({
        open: true,
        message: "Cycle configuration saved",
        severity: "success",
      });
      setConfigOpen(false);
      fetchCycles();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error saving configuration",
        severity: "error",
      });
    }
  };

  const handlePreviewJudge = async () => {
    try {
      setPreviewResults({});
      setLoading(true);
      const res = await leagueOpsService.getAutoJudgePreview(selectedCycleId);
      const data = Array.isArray(res.data) ? res.data : [];

      if (!Array.isArray(res.data)) {
        throw new Error(
          res.data?.message || "Server returned invalid preview data",
        );
      }

      const suggestions = res.data.reduce((acc, curr) => {
        acc[curr.fixtureId] = {
          homeScore: curr.suggestedHomeScore,
          awayScore: curr.suggestedAwayScore,
          reason: curr.reason,
        };
        return acc;
      }, {});
      setPreviewResults(suggestions);
      setSnackbar({
        open: true,
        message: `Preview generated for ${res.data.length} matches.`,
        severity: "info",
      });
    } catch (err) {
      const msg =
        err.response?.data?.details ||
        err.response?.data?.message ||
        err.message;
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
        awayScore: val.awayScore,
      }));

      if (payload.length === 0) return;

      const configSnapshot = JSON.stringify({
        cycleName: currentCycle?.cycleName || "Unknown Cycle",
        cycle_name: currentCycle?.cycleName,
        eiThreshold: currentCycle?.eiThreshold || 0,
        ei_threshold: currentCycle?.eiThreshold,
        rateElite: currentCycle?.rateElite || 0,
        rate_elite: currentCycle?.rateElite,
        rateActive: currentCycle?.rateActive || 0,
        rate_active: currentCycle?.rateActive,
        rateWarning: currentCycle?.rateWarning || 0,
        rate_warning: currentCycle?.rateWarning,
        bonusPool: currentCycle?.bonusPool || 0,
        bonus_pool: currentCycle?.bonusPool,
        totalMatches: matches.length || 0,
        total_matches: matches.length,
        startDate: currentCycle?.startDate,
        start_date: currentCycle?.startDate,
        endDate: currentCycle?.endDate,
        end_date: currentCycle?.endDate,
        matchStartNo: currentCycle?.matchStartNo,
        match_start_no: currentCycle?.matchStartNo,
        matchEndNo: currentCycle?.matchEndNo,
        match_end_no: currentCycle?.matchEndNo,
      });

      await leagueOpsService.applyBatchResults(
        selectedCycleId,
        payload,
        configSnapshot,
      );
      setSnackbar({
        open: true,
        message: "Successfully applied all results",
        severity: "success",
      });
      setPreviewResults({});
      fetchData();
      fetchHistory();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to apply results",
        severity: "error",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this history record?"))
      return;
    try {
      await leagueOpsService.deleteJudgeHistory(id);
      setSnackbar({
        open: true,
        message: "History record deleted",
        severity: "success",
      });
      fetchHistory();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete history",
        severity: "error",
      });
    }
  };

  const updatePreviewScore = (fid, field, val) => {
    setPreviewResults((prev) => ({
      ...prev,
      [fid]: { ...prev[fid], [field]: parseInt(val) || 0 },
    }));
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        minHeight: "calc(100vh - 74px)",
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 1.5, sm: 2 },
        background: `linear-gradient(180deg, ${alpha("#f8fbff", 0.7)} 0%, ${alpha("#eef3f9", 0.95)} 100%)`,
        borderRadius: 4,
        border: "1px solid",
        borderColor: alpha("#cbd5e1", 0.65),
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.7), 0 16px 40px rgba(15,23,42,0.06)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: -120,
          right: -160,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 70%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
          px: { xs: 1, sm: 2 },
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              p: 0,
              borderRadius: 0,
              bgcolor: "transparent",
              color: "primary.main",
              border: "none",
            }}
          >
            <ManageHistory sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              League Operations
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              ADMINISTRATIVE CONTROL CENTER
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          variant="filled"
          sx={{ mb: 3, borderRadius: 3 }}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ px: { xs: 1, sm: 2 }, mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha("#ffffff", 0.9)} 0%, ${alpha("#f8fafc", 0.82)} 100%)`,
            border: `1px solid ${alpha("#cbd5e1", 0.78)}`,
            boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} lg={4} sx={{ display: "flex" }}>
              <Box
                sx={{
                  p: 1,
                  height: "100%",
                  width: "100%",
                  minWidth: { lg: 340 },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "primary.main",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      mb: 0.5,
                      display: "block",
                      fontSize: 10,
                    }}
                  >
                    League Operations
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="900"
                    sx={{
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                      noWrap: true,
                    }}
                  >
                    Command Center
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 0,
                  }}
                >
                  <FormControl
                    fullWidth
                    variant="filled"
                    size="small"
                    hiddenLabel
                  >
                    <Select
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                      sx={{
                        bgcolor: "transparent",
                        borderRadius: 0,
                        fontWeight: "800",
                        "&:before, &:after": { display: "none" },
                        boxShadow: "none",
                        "& .MuiSelect-select": { py: 1.5, pr: 3 },
                      }}
                      displayEmpty
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            borderRadius: 3,
                            mt: 1,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                          },
                        },
                      }}
                    >
                      {cycles.length === 0
                        ? [
                            <MenuItem key="none" value="">
                              <em>-- No cycles found --</em>
                            </MenuItem>,
                          ]
                        : cycles.map((c) => (
                            <MenuItem
                              key={c.id}
                              value={c.id}
                              sx={{ fontWeight: "bold" }}
                            >
                              {c.cycleName}
                            </MenuItem>
                          ))}
                    </Select>
                  </FormControl>

                  <Tooltip title="Configure Cycle Settings">
                    <IconButton
                      onClick={handleOpenConfig}
                      sx={{
                        width: 40,
                        height: 40,
                        color: "primary.main",
                        bgcolor: "transparent",
                        border: "none",
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                        },
                      }}
                    >
                      <Settings fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={2} sx={{ height: "100%" }}>
                <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
                  <StatCard
                    title="Total Matches"
                    value={totalMatches}
                    color="#3b82f6"
                    subValue="Allocated for this cycle"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
                  <StatCard
                    title="Completion"
                    value={`${totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0}%`}
                    color="#10b981"
                    subValue={`${playedMatches} matches played`}
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
                  <StatCard
                    title="Pending"
                    value={pendingMatches}
                    color="#8b5cf6"
                    subValue="Waiting for adjudication"
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={3} sx={{ display: "flex" }}>
                  <StatCard
                    title="Time Left"
                    value={`${daysRemaining}`}
                    color="#f59e0b"
                    subValue={
                      currentCycle
                        ? `Ends ${new Date(currentCycle.endDate).toLocaleDateString()}`
                        : "Cycle inactive"
                    }
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Grid
        container
        spacing={2}
        sx={{
          width: "100%",
          flex: 1,
          px: { xs: 1, sm: 2 },
          pb: 2,
          alignItems: "stretch",
          flexWrap: "nowrap",
        }}
      >
        <Grid
          item
          xs={6}
          sx={{
            display: "flex",
            minWidth: 0,
            flex: "1 1 0",
          }}
        >
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minWidth: 0,
              border: `1px solid ${alpha("#cbd5e1", 0.75)}`,
              background: `linear-gradient(180deg, ${alpha("#ffffff", 0.97)} 0%, ${alpha("#f8fafc", 0.94)} 100%)`,
              backdropFilter: "blur(20px)",
              overflow: "hidden",
              flex: 1,
            }}
          >
            <Box
              sx={{
                p: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: `linear-gradient(to right, ${alpha("#ffffff", 0.98)}, ${alpha("#f8fafc", 0.92)})`,
                borderBottom: `1px solid ${alpha("#cbd5e1", 0.55)}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 0,
                    borderRadius: 0,
                    bgcolor: "transparent",
                    color: "primary.main",
                  }}
                >
                  <Leaderboard sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight="900"
                    sx={{
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.2,
                    }}
                  >
                    Player Eligibility Board
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748b", fontWeight: 600 }}
                  >
                    Real-time performance tracking for {stats.length} active
                    players
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {loading && <CircularProgress size={20} thickness={5} />}
                <Button
                  variant="contained"
                  disableElevation
                  color="primary"
                  startIcon={<Gavel />}
                  onClick={() => {
                    setPreviewOpen(true);
                    handlePreviewJudge();
                  }}
                  sx={{
                    borderRadius: 1.75,
                    px: 3,
                    py: 1,
                    fontWeight: "900",
                    textTransform: "none",
                    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.2)",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 12px 25px rgba(37, 99, 235, 0.3)",
                    },
                    transition: "all 0.2s",
                  }}
                >
                  Review & Judge
                </Button>
              </Box>
            </Box>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      "USER ID",
                      "P-SCORE",
                      "R-SCORE",
                      "EI SCORE",
                      "TIER STATUS",
                      "EST. BONUS",
                    ].map((head) => (
                      <TableCell
                        key={head}
                        align={
                          head === "USER ID"
                            ? "left"
                            : head === "EST. BONUS"
                              ? "right"
                              : "center"
                        }
                        sx={{
                          bgcolor: alpha("#f1f5f9", 0.9),
                          color: "#64748b",
                          fontWeight: "800",
                          fontSize: 11,
                          py: 2,
                          letterSpacing: "0.05em",
                          borderBottom: "2px solid #e2e8f0",
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.length > 0 ? (
                    stats.map((row) => {
                      const ei = row.ei_score || row.eiScore || 0;
                      const uid = row.user_id || row.userId || "--";
                      const ps = row.p_score ?? row.pScore ?? 0;
                      const rs = row.r_score ?? row.rScore ?? 0;
                      const bonus = row.est_bonus ?? row.estBonus ?? 0;
                      const tier = row.tier_status || row.tierStatus || row.tier || (ei >= 80 ? "ELITE" : ei >= 60 ? "ACTIVE" : ei >= 40 ? "WARNING" : "INACTIVE");
                      
                      let color = theme.palette.error.main;
                      if (ei >= 80) color = theme.palette.secondary.main;
                      else if (ei >= 60) color = theme.palette.success.main;
                      else if (ei >= 40) color = theme.palette.warning.main;

                      return (
                        <TableRow key={uid} hover>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar
                                src={getUserLogoUrl(uid)}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: alpha(color, 0.1),
                                  color: color,
                                  fontWeight: "900",
                                  fontSize: 14,
                                }}
                              >
                                {uid.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" fontWeight="800" color="#1e293b">
                                {uid}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="700">
                              {row.played_count ?? row.playedCount ?? 0}
                              <Box component="span" sx={{ color: "text.secondary", fontWeight: 500, ml: 0.5 }}>
                                / {currentCycle?.matchTarget || currentCycle?.match_target || 12}
                              </Box>
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="700">
                              {Math.round(rs)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 120 }}>
                              <Box sx={{ flexGrow: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, ei)}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: alpha(color, 0.1),
                                    "& .MuiLinearProgress-bar": { bgcolor: color },
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" fontWeight="900" sx={{ color: color }}>
                                {Math.round(ei)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={tier}
                              size="small"
                              sx={{
                                fontWeight: "900",
                                fontSize: 10,
                                bgcolor: alpha(color, 0.08),
                                color: color,
                                border: `1px solid ${alpha(color, 0.2)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 3 }}>
                            <Typography variant="body2" fontWeight="900" color="#1e293b">
                              ฿{bonus.toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                        <Typography variant="body2" color="text.secondary">
                          No player records for this cycle.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid
          item
          xs={6}
          sx={{
            display: "flex",
            minWidth: 0,
            flex: "1 1 0",
          }}
        >
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minWidth: 0,
              border: `1px solid ${alpha("#cbd5e1", 0.75)}`,
              background: `linear-gradient(180deg, ${alpha("#ffffff", 0.97)} 0%, ${alpha("#f8fafc", 0.94)} 100%)`,
              backdropFilter: "blur(20px)",
              overflow: "hidden",
              flex: 1,
            }}
          >
            <Box
              sx={{
                p: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: `linear-gradient(to right, ${alpha("#ffffff", 0.98)}, ${alpha("#f8fafc", 0.92)})`,
                borderBottom: `1px solid ${alpha("#cbd5e1", 0.55)}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 0,
                    borderRadius: 0,
                    bgcolor: "transparent",
                    color: "secondary.main",
                  }}
                >
                  <ManageHistory sx={{ fontSize: 24,color:"#0f172a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight="900"
                    sx={{
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.2,
                    }}
                  >
                    Adjudication History
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#64748b", fontWeight: 600 }}
                  >
                    Historical snapshots
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {loadingHistory && <CircularProgress size={20} thickness={5} />}
                <IconButton
                  onClick={fetchHistory}
                  size="small"
                  sx={{ border: "none" }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      "DATE",
                      "CYCLE NAME",
                      "MATCHES RANGE",
                      "USER",
                      "TOTALS",
                      "ACTIONS",
                    ].map((head) => (
                      <TableCell
                        key={head}
                        align="center"
                        sx={{
                          bgcolor: alpha("#f1f5f9", 0.9),
                          color: "#64748b",
                          fontWeight: "800",
                          fontSize: 11,
                          py: 2,
                          letterSpacing: "0.05em",
                          borderBottom: "2px solid #e2e8f0",
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {judgeHistory.length > 0 ? (
                    judgeHistory.map((row) => {
                      const config = JSON.parse(row.configSnapshot || "{}");
                      // Use loose comparison for ID mismatch (String vs Number)
                      const cycleRef = cycles.find((c) => c.id == row.cycleId);

                      return (
                        <TableRow key={row.id} hover>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="800">
                              {new Date(row.judgeDate).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="700">
                              {config.cycleName || config.CycleName || row.cycleName || cycleRef?.cycleName || `Cycle ${row.cycleId}`}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="700" color="primary">
                              {config.matchStartNo ?? config.MatchStartNo ?? config.match_start_no ?? row.matchStartNo ?? cycleRef?.matchStartNo ?? "?"} 
                              {" - "}
                              {config.matchEndNo ?? config.MatchEndNo ?? config.match_end_no ?? row.matchEndNo ?? cycleRef?.matchEndNo ?? "?"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography 
                              variant="caption" 
                              fontWeight="900" 
                              sx={{ 
                                color: "primary.main",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em"
                              }}
                            >
                              {row.adminId}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight="900"
                              color="secondary"
                            >
                              {config.totalMatches || row.matchCount}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedHistory({ ...row, config, cycleRef });
                                setHistoryDetailOpen(true);
                              }}
                              sx={{
                                color: "primary.main",
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                "&:hover": {
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                },
                              }}
                            >
                              <Settings fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteHistory(row.id)}
                              sx={{
                                ml: 1,
                                border: "none",
                                bgcolor: alpha(theme.palette.error.main, 0.05),
                                "&:hover": {
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No judge history found for this cycle.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Match Adjustments Modal */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, bgcolor: "#f8fafc", overflow: "hidden" },
        }}
      >
        <Box
          sx={{
            p: 0,
            display: "flex",
            flexDirection: "column",
            height: "85vh",
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "white",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 0,
                  borderRadius: 0,
                  bgcolor: "transparent",
                  color: "secondary.main",
                  display: "flex",
                  boxShadow: "none",
                }}
              >
                <Gavel sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="900"
                  sx={{ color: "#0f172a", lineHeight: 1.2 }}
                >
                  Adjudication Review ({matches.filter(m => m.homeScore === null && m.active?.toUpperCase() !== "CC").length} / {matches.length} Matches)
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", fontWeight: 600 }}
                >
                  Review and apply AI-suggested results for Cycle{" "}
                  {selectedCycleId}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              {Object.keys(previewResults).length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setPreviewResults({})}
                  sx={{ borderRadius: 2, fontWeight: "800" }}
                >
                  Clear All
                </Button>
              )}
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleBatchApply}
                disabled={
                  isApplying || Object.keys(previewResults).length === 0
                }
                startIcon={
                  isApplying ? (
                    <CircularProgress size={16} color="primary.main" />
                  ) : (
                    <CheckCircle />
                  )
                }
                sx={{ borderRadius: 2, fontWeight: "900" }}
              >
                Apply All Results
              </Button>
              <IconButton
                onClick={() => setPreviewOpen(false)}
                size="small"
                sx={{
                  ml: 1,
                  border: "none",
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <Close sx={{ color: "#64748b" }} />
              </IconButton>
            </Box>
          </Box>

          <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                border: "1px solid #e2e8f0",
                maxHeight: "100%",
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: "800",
                        color: "#475569",
                        fontSize: 11,
                        letterSpacing: "0.05em",
                        pl: 3,
                        bgcolor: "#f1f5f9",
                      }}
                    >
                      MATCHUP & EI SCORES
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "800",
                        color: "#475569",
                        fontSize: 11,
                        letterSpacing: "0.05em",
                        width: 140,
                        bgcolor: "#f1f5f9",
                      }}
                    >
                      SCORE
                    </TableCell>
                    <TableCell
                      align="left"
                      sx={{
                        fontWeight: "800",
                        color: "#475569",
                        fontSize: 11,
                        letterSpacing: "0.05em",
                        pr: 3,
                        bgcolor: "#f1f5f9",
                      }}
                    >
                      ADJUDICATION LOGIC
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ bgcolor: "white" }}>
                  {matches.filter(m => (m.homeScore === null || m.homeScore === undefined) && m.active?.toUpperCase() !== "CC").length > 0 ? (
                    matches.filter(m => (m.homeScore === null || m.homeScore === undefined) && m.active?.toUpperCase() !== "CC").map((match) => {
                      const statA = match.home
                        ? statsDict[match.home.toUpperCase()]
                        : null;
                      const statB = match.away
                        ? statsDict[match.away.toUpperCase()]
                        : null;
                      const isPlayed = match.homeScore != null;
                      return (
                        <TableRow
                          key={match.fixtureId}
                          hover
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                          }}
                        >
                          <TableCell sx={{ py: 2.5, pl: 3 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                gap: 1,
                              }}
                            >
                              {/* Home Side */}
                              <Typography
                                variant="body2"
                                fontWeight="800"
                                sx={{
                                  flex: 1,
                                  textAlign: "right",
                                  color: "#1e293b",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {match.home}
                              </Typography>

                              <Box
                                sx={{
                                  width: 32,
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <Avatar
                                  src={getUserLogoUrl(match.home)}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    bgcolor: "transparent",
                                  }}
                                  imgProps={{ style: { objectFit: "contain" } }}
                                />
                              </Box>

                              <Box
                                sx={{
                                  width: 45,
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography
                                  sx={{
                                    minWidth: 38,
                                    textAlign: "center",
                                    fontSize: 13,
                                    fontWeight: 900,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 0.5,
                                     background: alpha("#159b48ff", 0.05),
                                    color: "#159b48ff",
                                    border: `1.5px solid ${alpha("#159b48ff", 0.2)}`,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  {statA ? Math.round(statA.ei_score) : "--"}
                                </Typography>
                              </Box>

                              {/* Center separator */}
                              <Typography
                                variant="caption"
                                sx={{
                                  width: 30,
                                  textAlign: "center",
                                  color: "#cbd5e1",
                                  fontWeight: 900,
                                  fontSize: 11,
                                }}
                              >
                                VS
                              </Typography>

                              {/* Away Side */}
                              <Box
                                sx={{
                                  width: 45,
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography
                                  sx={{
                                    minWidth: 38,
                                    textAlign: "center",
                                    fontSize: 13,
                                    fontWeight: 900,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 0.5,
                                    background: alpha("#be123c", 0.05),
                                    color: "#be123c",
                                    border: `1.5px solid ${alpha("#be123c", 0.2)}`,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  {statB ? Math.round(statB.ei_score) : "--"}
                                </Typography>
                              </Box>

                              <Box
                                sx={{
                                  width: 32,
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <Avatar
                                  src={getUserLogoUrl(match.away)}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    bgcolor: "transparent",
                                  }}
                                  imgProps={{ style: { objectFit: "contain" } }}
                                />
                              </Box>

                              <Typography
                                variant="body2"
                                fontWeight="800"
                                sx={{
                                  flex: 1,
                                  textAlign: "left",
                                  color: "#1e293b",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {match.away}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {isPlayed ? (
                              <Chip
                                label={`${match.homeScore}-${match.awayScore}`}
                                size="small"
                                sx={{
                                  fontWeight: "900",
                                  bgcolor: "#f1f5f9",
                                  color: "#475569",
                                }}
                              />
                            ) : previewResults[match.fixtureId] ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 1,
                                }}
                              >
                                <TextField
                                  size="small"
                                  type="number"
                                  value={
                                    previewResults[match.fixtureId].homeScore
                                  }
                                  onChange={(e) =>
                                    updatePreviewScore(
                                      match.fixtureId,
                                      "homeScore",
                                      e.target.value,
                                    )
                                  }
                                  sx={{
                                    width: 45,
                                    "& .MuiInputBase-input": {
                                      p: "8px 4px",
                                      textAlign: "center",
                                      fontWeight: 900,
                                      fontSize: 18,
                                      color: "primary.main",
                                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                      transition: "all 0.2s",
                                      "&:hover, &:focus": {
                                        borderBottomColor: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                                      },
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      border: "none",
                                    },
                                  }}
                                />
                                <Typography
                                  variant="h6"
                                  fontWeight="bold"
                                  sx={{ color: "#cbd5e1" }}
                                >
                                  :
                                </Typography>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={
                                    previewResults[match.fixtureId].awayScore
                                  }
                                  onChange={(e) =>
                                    updatePreviewScore(
                                      match.fixtureId,
                                      "awayScore",
                                      e.target.value,
                                    )
                                  }
                                  sx={{
                                    width: 45,
                                    "& .MuiInputBase-input": {
                                      p: "8px 4px",
                                      textAlign: "center",
                                      fontWeight: 900,
                                      fontSize: 18,
                                      color: "secondary.main",
                                      borderBottom: `2px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                                      transition: "all 0.2s",
                                      "&:hover, &:focus": {
                                        borderBottomColor: theme.palette.secondary.main,
                                        bgcolor: alpha(theme.palette.secondary.main, 0.02),
                                      },
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      border: "none",
                                    },
                                  }}
                                />
                              </Box>
                            ) : (
                              <Chip
                                label="PENDING"
                                size="small"
                                sx={{
                                  fontWeight: "900",
                                  fontSize: 11,
                                  bgcolor: "#fff7ed",
                                  color: "#c2410c",
                                  border: "1px solid #ffedd5",
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="left" sx={{ pr: 3 }}>
                            {previewResults[match.fixtureId]?.reason ? (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  py: 0.8,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor: previewResults[
                                      match.fixtureId
                                    ].reason.includes("Home Win")
                                      ? "#0284c7"
                                      : previewResults[
                                            match.fixtureId
                                          ].reason.includes("Away Win")
                                        ? "#e11d48"
                                        : "#64748b",
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  fontWeight="800"
                                  sx={{
                                    color: previewResults[
                                      match.fixtureId
                                    ].reason.includes("Home Win")
                                      ? "#0369a1"
                                      : previewResults[
                                            match.fixtureId
                                          ].reason.includes("Away Win")
                                        ? "#be123c"
                                        : "#475569",
                                    fontSize: 11,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  {previewResults[match.fixtureId].reason}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography
                                variant="caption"
                                fontWeight="800"
                                sx={{ color: "#94a3b8", fontSize: 11 }}
                              >
                                {isPlayed
                                  ? "MATCH COMPLETED"
                                  : "AWAITING PREVIEW DATA"}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 10 }}>
                        <Typography variant="body2" color="text.secondary">
                          No pending fixtures.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
        </Box>
      </Dialog>

      <Dialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" },
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              p: 4,
              pb: 3,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 0,
                borderRadius: 0,
                bgcolor: "transparent",
                color: "primary.main",
                boxShadow: "none",
              }}
            >
              <Settings sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                fontWeight="800"
                sx={{ letterSpacing: "-0.02em", color: "#0f172a", mb: 0.5 }}
              >
                Cycle Configuration
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#64748b", fontWeight: 500 }}
              >
                Manage eligibility and dynamic bonus parameters
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 4, bgcolor: "#ffffff" }}>
          <Stack spacing={4}>
            {/* Cycle Identity & Timeline Group */}
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight="800"
                sx={{
                  color: "#64748b",
                  letterSpacing: "0.1em",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  textTransform: "uppercase",
                }}
              >
                <EmojiEvents sx={{ fontSize: 18, color: "primary.main" }} />{" "}
                Cycle Identity & Timeline
              </Typography>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Cycle Name"
                    variant="outlined"
                    value={configData.cycleName}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        cycleName: e.target.value,
                      })
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                  <Stack direction="row" spacing={3}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Start Date"
                      variant="outlined"
                      value={configData.startDate}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          startDate: e.target.value,
                        })
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="End Date"
                      variant="outlined"
                      value={configData.endDate}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          endDate: e.target.value,
                        })
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Start Match No."
                      variant="outlined"
                      value={configData.matchStartNo}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          matchStartNo: parseInt(e.target.value) || 0,
                        })
                      }
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="End Match No."
                      variant="outlined"
                      value={configData.matchEndNo}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          matchEndNo: parseInt(e.target.value) || 0,
                        })
                      }
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </Box>

            {/* Part 2: Performance & Financial Rewards */}
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight="800"
                sx={{
                  color: "#64748b",
                  letterSpacing: "0.1em",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  textTransform: "uppercase",
                }}
              >
                <RocketLaunch sx={{ fontSize: 18, color: "primary.main" }} />{" "}
                Performance & Financial Rewards
              </Typography>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <Stack spacing={3}>
                  <Stack direction="row" spacing={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Match Target"
                      variant="outlined"
                      value={configData.matchTarget}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          matchTarget: e.target.value,
                        })
                      }
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="EI Threshold"
                      variant="outlined"
                      value={configData.eiThreshold}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          eiThreshold: e.target.value,
                        })
                      }
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Total Pool (฿)"
                      variant="outlined"
                      value={configData.bonusPool}
                      onChange={(e) =>
                        setConfigData({
                          ...configData,
                          bonusPool: e.target.value,
                        })
                      }
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: 2 },
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    {[
                      { label: "Elite (%)", key: "rateElite" },
                      { label: "Active (%)", key: "rateActive" },
                      { label: "Warning (%)", key: "rateWarning" },
                    ].map((tier) => (
                      <TextField
                        key={tier.key}
                        fullWidth
                        type="number"
                        label={tier.label}
                        variant="outlined"
                        value={configData[tier.key]}
                        onChange={(e) =>
                          setConfigData({
                            ...configData,
                            [tier.key]: e.target.value,
                          })
                        }
                        sx={{
                          flex: 1,
                          "& .MuiOutlinedInput-root": { borderRadius: 2 },
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: 4,
            pt: 2,
            borderTop: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
          }}
        >
          <Button
            onClick={() => setConfigOpen(false)}
            sx={{
              color: "#64748b",
              fontWeight: "bold",
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<Save />}
            onClick={handleConfigSave}
            sx={{
              borderRadius: 2,
              px: 4,
              py: 1,
              fontWeight: "bold",
              textTransform: "none",
              boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
            }}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: "bold" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* History Detail Modal */}
      <Dialog
        open={historyDetailOpen}
        onClose={() => setHistoryDetailOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "900",
            bgcolor: "white",
            color: "#0f172a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #f1f5f9",
            py: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.main",
              }}
            >
              <ManageHistory sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight="900" sx={{ fontSize: 18 }}>
              Record Details
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setHistoryDetailOpen(false)}
            sx={{ color: "#94a3b8" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>        <DialogContent sx={{ p: 4, bgcolor: "#ffffff" }}>
          {selectedHistory && (
            <Stack spacing={4}>
              {/* Section 1: Identity & Timing */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.1em" }}
                    >
                      CYCLE IDENTITY
                    </Typography>
                    <Typography variant="h5" fontWeight="900" sx={{ color: "#0f172a", mt: 0.5 }}>
                      {selectedHistory.config?.cycleName ||
                        selectedHistory.config?.CycleName ||
                        selectedHistory.cycleName ||
                        selectedHistory.cycleRef?.cycleName ||
                        "--"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.1em" }}
                    >
                      TIMESTAMP
                    </Typography>
                    <Typography variant="body2" fontWeight="800" sx={{ mt: 0.5 }}>
                      {new Date(selectedHistory.judgeDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                      {new Date(selectedHistory.judgeDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CalendarMonth sx={{ color: "primary.main", fontSize: 18 }} />
                  <Typography variant="body2" fontWeight="800" sx={{ color: "#475569" }}>
                    {(selectedHistory.config?.startDate || selectedHistory.config?.StartDate || selectedHistory.config?.start_date || selectedHistory.cycleRef?.startDate || "--").toString().split("T")[0]} 
                    <Box component="span" sx={{ mx: 2, color: "#cbd5e1", fontWeight: 400 }}>—</Box>
                    {(selectedHistory.config?.endDate || selectedHistory.config?.EndDate || selectedHistory.config?.end_date || selectedHistory.cycleRef?.endDate || "--").toString().split("T")[0]}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Section 2: Scope & Rules */}
              <Grid container spacing={4}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.1em", display: "block", mb: 1 }}>
                    MATCH RANGE
                  </Typography>
                  <Typography variant="h6" fontWeight="900" sx={{ color: "#1e293b" }}>
                    {selectedHistory.config?.matchStartNo ?? selectedHistory.config?.MatchStartNo ?? selectedHistory.config?.match_start_no ?? selectedHistory.matchStartNo ?? selectedHistory.cycleRef?.matchStartNo ?? "--"} 
                    <Box component="span" sx={{ mx: 1, color: "#cbd5e1" }}>-</Box>
                    {selectedHistory.config?.matchEndNo ?? selectedHistory.config?.MatchEndNo ?? selectedHistory.config?.match_end_no ?? selectedHistory.matchEndNo ?? selectedHistory.cycleRef?.matchEndNo ?? "--"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800 }}>
                    {selectedHistory.config?.totalMatches || selectedHistory.config?.TotalMatches || selectedHistory.matchCount} TOTAL MATCHES
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.1em", display: "block", mb: 1 }}>
                    EI THRESHOLD
                  </Typography>
                  <Typography variant="h6" fontWeight="900" sx={{ color: "warning.main" }}>
                    {selectedHistory.config?.eiThreshold ??
                      selectedHistory.config?.EiThreshold ??
                      selectedHistory.eiThreshold ??
                      selectedHistory.cycleRef?.eiThreshold ??
                      "--"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                    MINIMUM PERFORMANCE
                  </Typography>
                </Grid>
              </Grid>

              <Divider />

              {/* Section 3: Rewards */}
              <Box>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: "0.1em", display: "block", mb: 2 }}>
                  REWARD STRUCTURE
                </Typography>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <Box>
                    <Typography variant="h4" fontWeight="900" color="secondary.main" sx={{ letterSpacing: "-0.02em" }}>
                      ฿{(selectedHistory.config?.bonusPool ?? selectedHistory.config?.BonusPool ?? selectedHistory.cycleRef?.bonusPool ?? 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                      POOL ALLOCATION
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="h6" fontWeight="900" sx={{ color: "#334155" }}>
                      {selectedHistory.config?.rateElite ?? selectedHistory.config?.RateElite ?? selectedHistory.cycleRef?.rateElite ?? 0}%
                      <Box component="span" sx={{ mx: 1, color: "#cbd5e1" }}>/</Box>
                      {selectedHistory.config?.rateActive ?? selectedHistory.config?.RateActive ?? selectedHistory.cycleRef?.rateActive ?? 0}%
                      <Box component="span" sx={{ mx: 1, color: "#cbd5e1" }}>/</Box>
                      {selectedHistory.config?.rateWarning ?? selectedHistory.config?.RateWarning ?? selectedHistory.cycleRef?.rateWarning ?? 0}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                      ELITE / ACTIVE / WARNING
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Footer Info */}
              <Box sx={{ pt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Person sx={{ color: "#94a3b8", fontSize: 16 }} />
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                    BY {selectedHistory.adminId.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#cbd5e1", fontWeight: 600, fontStyle: "italic" }}>
                  Snapshot ID: #{selectedHistory.id.toString().padStart(4, '0')}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
ntent>
        <DialogActions sx={{ p: 2.5, bgcolor: "white", borderTop: "1px solid #f1f5f9" }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setHistoryDetailOpen(false)}
            sx={{ 
              borderRadius: 2.5, 
              fontWeight: "900",
              py: 1.2,
              color: "#64748b",
              borderColor: "#e2e8f0",
              "&:hover": {
                bgcolor: "#f8fafc",
                borderColor: "#cbd5e1"
              }
            }}
          >
            Close Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLeagueOpsPage;
