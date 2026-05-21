import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Divider, Button, TextField,
  IconButton, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, GlobalStyles, Stack, Alert,
  Avatar, CircularProgress, FormControlLabel, Checkbox,
  Tabs, Tab
} from "@mui/material";
import {
  MilitaryTech, Save, KeyboardArrowDown, KeyboardArrowUp,
  EmojiEvents, CalendarMonth, Groups, SportsSoccer,
  RocketLaunch, Block, CheckCircle, Warning, DeleteForever
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";
import { useMediaQuery, useTheme } from "@mui/material";

const AdminLeagueSetting = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

  // ── Prize Settings ──────────────────────────────────────
  const [prizeGroups, setPrizeGroups] = useState([
    { rank: "1st" }, { rank: "2nd" }, { rank: "3rd" }, { rank: "4th" },
    { rank: "5th" }, { rank: "6th" }, { rank: "7-8th" }, { rank: "9-12th" },
    { rank: "13-16th" }, { rank: "17th +" }, { rank: "Top Scorer" }, { rank: "Best Defense" }
  ]);
  const [showPrizeSettings, setShowPrizeSettings] = useState(false);
  const [savingPrizes, setSavingPrizes] = useState(false);

  // ── Fixture Generator ────────────────────────────────────
  const [genDivision, setGenDivision] = useState("D1");
  const [showFixtureGen, setShowFixtureGen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reseting, setReseting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    resetFixtures: true,
    resetTeams: false
  });

  // ── Cup Generator ────────────────────────────────────────
  const [showCupGen, setShowCupGen] = useState(false);
  const [generatingCup, setGeneratingCup] = useState(false);
  const [resetingCup, setResetingCup] = useState(false);

  // ── Season Lifecycle ──────────────────────────────────────
  const [showSeasonLifecycle, setShowSeasonLifecycle] = useState(false);
  const [closingSeason, setClosingSeason] = useState(false);
  const [openingSeason, setOpeningSeason] = useState(false);
  const [failedRenewalUsers, setFailedRenewalUsers] = useState([]);
  const [summaryLogs, setSummaryLogs] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => { fetchPrizes(); }, []);

  useEffect(() => {
    if (showFixtureGen) fetchPreview(genDivision);
  }, [showFixtureGen, genDivision]);

  // ── API Handlers ─────────────────────────────────────────
  const fetchPrizes = async () => {
    try {
      const res = await adminService.getPrizes();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const fetchedPrizes = res.data.map(p => ({ rank: p.rankLabel || "", amount: (p.amount || 0).toString() }));
        const requiredLabels = ["Top Scorer", "Best Defense"];
        const mergedPrizes = [...fetchedPrizes];
        requiredLabels.forEach(label => {
          if (!mergedPrizes.find(p => p.rank === label)) mergedPrizes.push({ rank: label, amount: "" });
        });
        setPrizeGroups(mergedPrizes);
      }
    } catch (err) { console.error("Failed to fetch prizes", err); }
  };

  const fetchPreview = async (division = genDivision) => {
    setLoadingPreview(true);
    try {
      const res = await adminService.getFixtureGeneratePreview(division);
      setPreview(res.data?.data || res.data);
    } catch (err) {
      enqueueSnackbar("ไม่สามารถโหลด Preview ได้", { variant: "error" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePrizeChange = (index, field, value) => {
    const newGroups = [...prizeGroups];
    newGroups[index][field] = value;
    setPrizeGroups(newGroups);
  };

  const handleSavePrizes = async () => {
    try {
      setSavingPrizes(true);
      const prizes = prizeGroups.map(pg => ({ rankLabel: pg.rank, amount: Number(pg.amount) }));
      await adminService.savePrizes({ prizes, password: "" });
      enqueueSnackbar("Prizes saved successfully!", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save prizes", { variant: "error" });
    } finally {
      setSavingPrizes(false);
    }
  };

  const handleGenerate = async () => {
    setConfirmOpen(false);
    setGenerating(true);
    try {
      const res = await adminService.generateFixture(genDivision);
      const msg = res.data?.data?.message || "Generate สำเร็จ!";
      enqueueSnackbar(msg, { variant: "success" });
      setPreview(null);
      await fetchPreview(genDivision);
    } catch (err) {
      const msg = err.response?.data?.message || "Generate ไม่สำเร็จ";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async () => {
    if (!resetOptions.resetFixtures && !resetOptions.resetTeams) {
      enqueueSnackbar("กรุณาเลือกอย่างน้อย 1 รายการเพื่อ Reset", { variant: "warning" });
      return;
    }

    setResetConfirmOpen(false);
    setReseting(true);
    try {
      const res = await adminService.resetFixtures({ ...resetOptions, division: genDivision });
      enqueueSnackbar(res.data?.data?.message || "Reset สำเร็จ!", { variant: "success" });
      setPreview(null);
      await fetchPreview(genDivision);
    } catch (err) {
      enqueueSnackbar("Reset ไม่สำเร็จ", { variant: "error" });
    } finally {
      setReseting(false);
    }
  };

  const handleGenerateCup = async () => {
    setGeneratingCup(true);
    try {
      const res = await adminService.generateCupBracket();
      enqueueSnackbar(res.data?.message || "Generate Cup สำเร็จ!", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Generate Cup ไม่สำเร็จ", { variant: "error" });
    } finally {
      setGeneratingCup(false);
    }
  };

  const handleResetCup = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบอลถ้วยทั้งหมดของซีซั่นนี้?")) return;
    
    setResetingCup(true);
    try {
      const res = await adminService.resetCupBracket();
      enqueueSnackbar(res.data?.message || "Reset Cup สำเร็จ!", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Reset Cup ไม่สำเร็จ", { variant: "error" });
    } finally {
      setResetingCup(false);
    }
  };

  const handleCloseSeason = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการปิดฤดูกาลปัจจุบันสำหรับทั้งระบบ (D1 & D2)? ระบบจะแจกเงินรางวัลและปล่อยตัวนักเตะที่หมดสัญญาโดยอัตโนมัติ")) return;
    
    setClosingSeason(true);
    setSummaryLogs([]);
    try {
      const res1 = await adminService.closeSeason("PC", "D1");
      let logs = res1.data.logs || [];
      if (res1.data?.success) {
        const res2 = await adminService.closeSeason("PC", "D2");
        if (res2.data?.logs) {
          logs = [...logs, "-----------------------------------", ...res2.data.logs];
        }
        setSummaryLogs(logs);
        setShowSummary(true);
        if (res2.data?.success) {
          enqueueSnackbar("ปิดฤดูกาลสำเร็จสำหรับทุก Division (D1 & D2)!", { variant: "success" });
        } else {
          enqueueSnackbar(res2.data?.message || "ปิดฤดูกาล D2 ล้มเหลว", { variant: "error" });
        }
      } else {
        setSummaryLogs(logs);
        setShowSummary(true);
        enqueueSnackbar(res1.data?.message || "ปิดฤดูกาล D1 ล้มเหลว", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "ปิดฤดูกาลไม่สำเร็จ", { variant: "error" });
    } finally {
      setClosingSeason(false);
    }
  };

  const handleOpenSeason = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการเปิดฤดูกาลใหม่สำหรับทั้งระบบ (D1 & D2)? ระบบจะหักเงินต่อสัญญาอัตโนมัติของทุกทีม และล้างตารางแข่งเดิมทั้งหมด")) return;
    
    setOpeningSeason(true);
    setFailedRenewalUsers([]);
    setSummaryLogs([]);
    try {
      // openSeason is global on the backend, so we invoke it once with "D1" as the platform's default
      const res = await adminService.openSeason("PC", "D1");
      if (res.data?.success) {
        setSummaryLogs(res.data.logs || []);
        setShowSummary(true);
        enqueueSnackbar(res.data?.message || "เปิดฤดูกาลใหม่สำเร็จสำหรับทุก Division!", { variant: "success" });
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.failedUsers && errorData.failedUsers.length > 0) {
        setFailedRenewalUsers(errorData.failedUsers);
        setSummaryLogs(errorData.logs || []);
        setShowSummary(true);
        enqueueSnackbar("เปิดฤดูกาลไม่สำเร็จ: มีบางทีมเงินไม่พอต่อสัญญานักเตะ", { variant: "error" });
      } else {
        enqueueSnackbar(errorData?.message || "เปิดฤดูกาลไม่สำเร็จ", { variant: "error" });
      }
    } finally {
      setOpeningSeason(false);
    }
  };

  const isBlocked = preview && (preview.existingFixtureCount > 0 || preview.quotaError);


  return (
    <Box sx={{ width: "100%", px: { xs: 0, sm: 0 } }}>
      <GlobalStyles styles={{ "@keyframes pulse": { "0%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.5, transform: "scale(1.2)" }, "100%": { opacity: 1, transform: "scale(1)" } } }} />

      {/* Header */}
      <Box sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 2, sm: 0 },
        mb: 4, 
        px: { xs: 1, sm: 0 } 
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">League Settings</Typography>
            <Typography variant="body2" color="text.secondary">TOURNAMENT CONFIGURATION</Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={4} sx={{ width: "100%" }}>

        {/* ── Prize Money Settings ─────────────────────────── */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: showPrizeSettings ? "primary.main" : "divider", transition: "border-color 0.3s" }}>
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            onClick={() => setShowPrizeSettings(!showPrizeSettings)}
            sx={{ cursor: "pointer", "&:hover .toggle-icon": { bgcolor: "rgba(0,0,0,0.08)" } }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <MilitaryTech color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">Tournament Prize Settings</Typography>
            </Box>
            <IconButton size="small" className="toggle-icon" sx={{ bgcolor: "rgba(0,0,0,0.03)", transition: "all 0.2s" }}>
              {showPrizeSettings ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>
          
          <Collapse in={showPrizeSettings}>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={3}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 2 }}>
                {(prizeGroups || []).map((group, index) => (
                  <Box key={index} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)", "&:hover": { borderColor: "primary.light" } }}>
                    <TextField fullWidth size="small" placeholder="Rank" value={group.rank} onChange={(e) => handlePrizeChange(index, "rank", e.target.value)} sx={{ mb: 1.5, "& fieldset": { border: "none" }, bgcolor: "rgba(0,0,0,0.03)", borderRadius: 1 }} />
                    <TextField fullWidth size="small" placeholder="Amount (TP)" value={group.amount} onChange={(e) => handlePrizeChange(index, "amount", e.target.value)} InputProps={{ endAdornment: <Typography variant="caption" fontWeight="bold" color="primary">TP</Typography>, sx: { bgcolor: "white" } }} />
                  </Box>
                ))}
              </Box>

              <Box display="flex" justifyContent="flex-end">
                <Button 
                  fullWidth={isMobile}
                  variant="contained" 
                  startIcon={<Save />} 
                  onClick={handleSavePrizes} 
                  disabled={savingPrizes} 
                  sx={{ borderRadius: 100, textTransform: "none", px: 4, fontWeight: "bold" }}
                >
                  {savingPrizes ? "Saving..." : "Save All Prizes"}
                </Button>
              </Box>
            </Stack>
          </Collapse>
        </Paper>

        {/* ── Start Season / Fixture Generator ─────────────── */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: showFixtureGen ? "primary.main" : "divider", transition: "border-color 0.3s" }}>
          {/* Section Header */}
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center"
            onClick={() => setShowFixtureGen(!showFixtureGen)}
            sx={{ cursor: "pointer", "&:hover .toggle-icon": { bgcolor: "rgba(0,0,0,0.08)" } }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <SportsSoccer color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Start Season</Typography>
                <Typography variant="body2" color="text.secondary">FIXTURE GENERATOR — ROUND ROBIN (2 LEGS)</Typography>
              </Box>
            </Box>
            <IconButton size="small" className="toggle-icon" sx={{ bgcolor: "rgba(0,0,0,0.03)", transition: "all 0.2s" }}>
              {showFixtureGen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>

          <Collapse in={showFixtureGen}>
            <Divider sx={{ my: 3 }} />

            {/* Division Switcher */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
              <Tabs
                value={genDivision}
                onChange={(e, newDiv) => setGenDivision(newDiv)}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                    textTransform: "none",
                    minWidth: 100,
                  }
                }}
              >
                <Tab label="Division 1" value="D1" />
                <Tab label="Division 2" value="D2" />
              </Tabs>
            </Box>

            {/* Loading */}
            {loadingPreview && (
              <Box display="flex" justifyContent="center" alignItems="center" py={4} gap={2}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Loading preview...</Typography>
              </Box>
            )}

            {/* Preview Content */}
            {!loadingPreview && preview && (
              <Stack spacing={3}>
                {/* Stats Row — Unified with Prize Style */}
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
                  {[
                    { icon: <CalendarMonth sx={{ fontSize: 28 }} />, label: "Season", value: preview.season },
                    { icon: <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 13, fontWeight: "bold", mx: "auto" }}>{genDivision}</Avatar>, label: "Division", value: genDivision },
                    { icon: <Groups sx={{ fontSize: 28 }} />, label: "Players", value: preview.playerCount },
                    { icon: <SportsSoccer sx={{ fontSize: 28 }} />, label: "Total Fixtures", value: `${preview.totalMatchCount}`, sub: `Leg1: ${preview.leg1MatchCount} | Leg2: ${preview.leg1MatchCount}` }
                  ].map((stat, i) => (
                    <Box key={i} sx={{ 
                      p: 2.5, 
                      borderRadius: 2, 
                      bgcolor: "rgba(0,0,0,0.02)", 
                      border: "1px solid rgba(0,0,0,0.05)", 
                      textAlign: "center",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "primary.light", bgcolor: "rgba(0,0,0,0.04)" }
                    }}>
                      <Box sx={{ color: "primary.main", mb: 0.5, display: "flex", justifyContent: "center", alignItems: "center", height: 28 }}>{stat.icon}</Box>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: "primary.main" }}>{stat.value}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">{stat.label}</Typography>
                      {stat.sub && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{stat.sub}</Typography>}
                    </Box>
                  ))}
                </Box>



                {/* Blocked Warning */}
                {isBlocked && (
                  <Alert severity="error" icon={<Block />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight="bold">ไม่สามารถ Generate ได้</Typography>
                    <Typography variant="body2">
                      {preview.existingFixtureCount > 0 
                        ? `Season ${preview.season} ใน Division ${genDivision} มี Fixture อยู่แล้ว ${preview.existingFixtureCount} รายการ — คุณสามารถกดปุ่ม Reset ด้านล่างเพื่อล้างข้อมูลเฉพาะดิวิชันนี้และลงตารางใหม่ได้`
                        : "มีบางทีมถือครองนักเตะเกินโควต้าที่กำหนด"}
                    </Typography>
                  </Alert>
                )}

                {/* Quota Error Details */}
                {preview?.quotaError && (
                  <Alert severity="warning" icon={<Warning />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight="bold" sx={{ mb: 1 }}>รายชื่อทีมที่ถือครองนักเตะเกินโควต้า:</Typography>
                    <Stack spacing={0.5}>
                      {preview.quotaError.failedUsers.map(user => (
                        <Typography key={user} variant="caption" display="block">• {user}</Typography>
                      ))}
                    </Stack>
                    <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                      * กรุณาแจ้งผู้เล่นให้จัดการนักเตะให้ถูกต้องตามโควต้าก่อนดำเนินการ
                    </Typography>
                  </Alert>
                )}

                {/* Ready */}
                {!isBlocked && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight="bold">พร้อม Generate</Typography>
                    <Typography variant="body2">Season {preview.season} ใน Division {genDivision} ยังไม่มี Fixture — สามารถ Generate ได้เลย</Typography>
                  </Alert>
                )}

                {/* Player Grid 5 คน/แถว — Unified with Prize Style */}
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" mb={1.5} color="text.secondary">
                    PLAYER LIST ({preview.playerCount} คน)
                  </Typography>
                  <Box sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" },
                    gap: 1.5
                  }}>
                    {(preview.players || []).map((p, i) => (
                      <Box key={p.userId} sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,0.02)", 
                        border: "1px solid rgba(0,0,0,0.05)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                        textAlign: "center",
                        "&:hover": { borderColor: "primary.light", bgcolor: "rgba(0,0,0,0.04)" },
                        transition: "all 0.15s"
                      }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: "bold", bgcolor: "primary.main" }}>
                          {i + 1}
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold" sx={{ lineHeight: 1.2, wordBreak: "break-word" }}>
                          {p.lineName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.2 }}>
                          {p.currentTeam || "—"}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Action Buttons — Style matched with Prize Save button */}
                <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    startIcon={<Avatar sx={{ width: 20, height: 20, bgcolor: "transparent", fontSize: 14 }}>🔄</Avatar>}
                    onClick={fetchPreview} 
                    disabled={loadingPreview} 
                    sx={{ 
                      borderRadius: 100, 
                      textTransform: "none", 
                      px: 3, 
                      fontWeight: "bold",
                      borderColor: "rgba(25, 118, 210, 0.5)",
                      "&:hover": { borderColor: "primary.main", bgcolor: "rgba(25, 118, 210, 0.04)" }
                    }}
                  >
                    Refresh Preview
                  </Button>
                  
                  {isBlocked && (
                    <Button 
                      variant="outlined" 
                      color="error" 
                      startIcon={<DeleteForever />}
                      onClick={() => setResetConfirmOpen(true)}
                      disabled={reseting}
                      sx={{ borderRadius: 100, textTransform: "none", px: 3, fontWeight: "bold" }}
                    >
                      {reseting ? "Reseting..." : "Reset Season Data"}
                    </Button>
                  )}

                  <Button
                    fullWidth={isMobile}
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <RocketLaunch />}
                    onClick={() => setConfirmOpen(true)}
                    disabled={isBlocked || generating}
                    sx={{ 
                      borderRadius: 100, 
                      textTransform: "none", 
                      px: 4,
                      fontWeight: "bold",
                      boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
                      "&:hover": { boxShadow: "0 6px 16px rgba(25, 118, 210, 0.3)" }
                    }}
                  >
                    {generating ? "Generating..." : "Start Season"}
                  </Button>
                </Box>
              </Stack>
            )}
          </Collapse>
        </Paper>

        {/* ── Cup Tournament Generator ──────────────────────── */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: showCupGen ? "primary.main" : "divider", transition: "border-color 0.3s" }}>
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center"
            onClick={() => setShowCupGen(!showCupGen)}
            sx={{ cursor: "pointer", "&:hover .toggle-icon": { bgcolor: "rgba(0,0,0,0.08)" } }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <MilitaryTech color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Cup Tournament</Typography>
                <Typography variant="body2" color="text.secondary">KNOCKOUT CUP GENERATOR</Typography>
              </Box>
            </Box>
            <IconButton size="small" className="toggle-icon" sx={{ bgcolor: "rgba(0,0,0,0.03)", transition: "all 0.2s" }}>
              {showCupGen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>

          <Collapse in={showCupGen}>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={3}>
              <Alert severity="info" icon={<EmojiEvents />} sx={{ borderRadius: 2 }}>
                <Typography fontWeight="bold">การสุ่มประกบคู่บอลถ้วย</Typography>
                <Typography variant="body2">
                  ระบบจะสุ่มนำผู้เล่นทั้งหมดมาจัดสายการแข่งขันแบบแพ้คัดออก (Knockout) 
                  หากจำนวนผู้เล่นไม่ลงตัวเป็นเลขยกกำลังของ 2 (เช่น 16, 32, 64) 
                  ระบบจะสุ่มผู้เล่นบางส่วนให้ได้สิทธิ์ "ชนะบาย (Bye)" ในรอบแรกโดยอัตโนมัติ
                </Typography>
              </Alert>

              <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteForever />}
                  onClick={handleResetCup}
                  disabled={resetingCup || generatingCup}
                  sx={{ borderRadius: 100, textTransform: "none", px: 3, fontWeight: "bold" }}
                >
                  {resetingCup ? "Reseting..." : "Reset Cup Data"}
                </Button>

                <Button
                  fullWidth={isMobile}
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={generatingCup ? <CircularProgress size={18} color="inherit" /> : <RocketLaunch />}
                  onClick={handleGenerateCup}
                  disabled={resetingCup || generatingCup}
                  sx={{ 
                    borderRadius: 100, 
                    textTransform: "none", 
                    px: 4,
                    fontWeight: "bold",
                    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
                    "&:hover": { boxShadow: "0 6px 16px rgba(25, 118, 210, 0.3)" }
                  }}
                >
                  {generatingCup ? "Generating..." : "Generate Cup Bracket"}
                </Button>
              </Box>
            </Stack>
          </Collapse>
        </Paper>

        {/* ── Season Lifecycle Management ──────────────────── */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: showSeasonLifecycle ? "primary.main" : "divider", transition: "border-color 0.3s" }}>
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center"
            onClick={() => setShowSeasonLifecycle(!showSeasonLifecycle)}
            sx={{ cursor: "pointer", "&:hover .toggle-icon": { bgcolor: "rgba(0,0,0,0.08)" } }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <CalendarMonth color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Season Lifecycle Management</Typography>
                <Typography variant="body2" color="text.secondary">CLOSE SEASON / OPEN NEW SEASON</Typography>
              </Box>
            </Box>
            <IconButton size="small" className="toggle-icon" sx={{ bgcolor: "rgba(0,0,0,0.03)", transition: "all 0.2s" }}>
              {showSeasonLifecycle ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>
          
          <Collapse in={showSeasonLifecycle}>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={3}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                {/* Close Season Card */}
                <Box sx={{ p: 3, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="error">1. Close Season Actions (Global ทั้งระบบ)</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    • แจกรางวัลตามอันดับ (Standing) และรางวัลพิเศษเฉพาะดิวิชัน<br />
                    • บันทึกข้อมูลเข้า Hall of Fame ของดิวิชันนั้นๆ<br />
                    • <strong style={{ color: '#d32f2f' }}>[Global ทั้งระบบ]</strong> ปล่อยตัวนักเตะหมดสัญญาและคืนเงินให้กับทุกทีมในระบบ<br />
                    • <strong style={{ color: '#d32f2f' }}>[Global ทั้งระบบ]</strong> ส่งคืนตัวยืม และยกเลิกรายการประกาศขายทั้งหมดในตลาด
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="error" 
                    fullWidth
                    onClick={handleCloseSeason}
                    disabled={closingSeason}
                    startIcon={closingSeason ? <CircularProgress size={18} color="inherit" /> : <Block />}
                    sx={{ borderRadius: 2, fontWeight: "bold", mt: 2 }}
                  >
                    {closingSeason ? "Closing..." : "Close Current Season (D1 & D2)"}
                  </Button>
                </Box>

                {/* Open Season Card */}
                <Box sx={{ p: 3, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">2. Open New Season Actions (Global ทั้งระบบ)</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    • หักเงินต่อสัญญาอัตโนมัติ และเพิ่มปีที่อยู่กับทีมของทุกทีมในระบบ<br />
                    • <strong>(Atomic) หากมีทีมใดในระบบเงินไม่พอ ระบบจะไม่ทำงาน</strong><br />
                    • สำรองข้อมูลผลการแข่งขันลง Log ของทั้งสองดิวิชัน<br />
                    • ล้างตารางแข่งเดิมทั้งหมด (Reset Fixtures และล้างบอลถ้วย) ของทั้งสองดิวิชันพร้อมกัน
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth
                    onClick={handleOpenSeason}
                    disabled={openingSeason}
                    startIcon={openingSeason ? <CircularProgress size={18} color="inherit" /> : <RocketLaunch />}
                    sx={{ borderRadius: 2, fontWeight: "bold", mt: 2 }}
                  >
                    {openingSeason ? "Opening..." : "Open New Season (D1 & D2)"}
                  </Button>
                </Box>
              </Box>

              {/* Failed Renewal Users List */}
              {failedRenewalUsers.length > 0 && (
                <Alert severity="error" icon={<Warning />} sx={{ borderRadius: 2 }}>
                  <Typography fontWeight="bold" sx={{ mb: 1 }}>รายชื่อทีมที่เงินไม่พอต่อสัญญา (Open Season ล้มเหลว):</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {failedRenewalUsers.map(user => (
                      <Box key={user} sx={{ px: 1.5, py: 0.5, bgcolor: "rgba(211, 47, 47, 0.1)", borderRadius: 100, fontSize: "0.85rem", fontWeight: "bold", mb: 1 }}>
                        {user}
                      </Box>
                    ))}
                  </Stack>
                  <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                    * โปรดแจ้งให้ทีมข้างต้นเติมเงิน หรือแอดมินปรับยอดเงินให้เพียงพอก่อนดำเนินการเปิดฤดูกาลอีกครั้ง
                  </Typography>
                </Alert>
              )}
            </Stack>
          </Collapse>
        </Paper>
      </Stack>

      {/* ── Reset Confirmation Dialog ────────────────────── */}
      <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} fullScreen={isMobile}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteForever />
          <Typography fontWeight="bold">เลือกข้อมูลที่ต้องการลบ (Season {preview?.season} - Division {genDivision})</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาเลือกรายการที่ต้องการลบออกจากระบบสำหรับ Division {genDivision} (ข้อมูลจะหายไปถาวร):
          </Typography>
          
          <Stack spacing={1}>
            <Paper variant="outlined" sx={{ p: 1, borderColor: resetOptions.resetFixtures ? "error.light" : "divider", bgcolor: resetOptions.resetFixtures ? "rgba(211, 47, 47, 0.05)" : "transparent" }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    color="error" 
                    checked={resetOptions.resetFixtures} 
                    onChange={(e) => setResetOptions(prev => ({ ...prev, resetFixtures: e.target.checked }))}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">ตารางแข่งขัน (Fixtures)</Typography>
                    <Typography variant="caption" color="text.secondary">ลบข้อมูลการจับคู่ทั้งหมดใน tbm_fixture_all</Typography>
                  </Box>
                }
              />
            </Paper>

            <Paper variant="outlined" sx={{ p: 1, borderColor: resetOptions.resetTeams ? "error.light" : "divider", bgcolor: resetOptions.resetTeams ? "rgba(211, 47, 47, 0.05)" : "transparent" }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    color="error" 
                    checked={resetOptions.resetTeams} 
                    onChange={(e) => setResetOptions(prev => ({ ...prev, resetTeams: e.target.checked }))}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="bold">รายชื่อทีมที่ลงทะเบียน (Teams)</Typography>
                    <Typography variant="caption" color="text.secondary">ลบรายชื่อผู้เล่นที่ผูกกับทีมใน Season นี้ (tbm_team)</Typography>
                  </Box>
                }
              />
            </Paper>
          </Stack>

          <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
            <Typography variant="caption">การดำเนินการนี้ไม่สามารถย้อนกลับได้ โปรดตรวจสอบให้แน่ใจก่อนกดยืนยัน</Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResetConfirmOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>ยกเลิก</Button>
          <Button 
            onClick={handleReset} 
            variant="contained" 
            color="error" 
            sx={{ borderRadius: 2 }}
            disabled={!resetOptions.resetFixtures && !resetOptions.resetTeams}
          >
            ยืนยันลบข้อมูลที่เลือก
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirmation Dialog ───────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Warning color="warning" />
          <Typography fontWeight="bold">ยืนยันการ Generate Fixture?</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {preview && (
            <Stack spacing={2}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: "warning.light", border: "1px solid", borderColor: "warning.main" }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>สรุปการ Generate:</Typography>
                <Typography variant="body2">• Season: <strong>{preview.season}</strong></Typography>
                <Typography variant="body2">• Division: <strong>{genDivision}</strong></Typography>
                <Typography variant="body2">• Players: <strong>{preview.playerCount} คน</strong></Typography>
                <Typography variant="body2">• Leg 1: <strong>{preview.leg1MatchCount} fixtures</strong> (ACTIVE=NO)</Typography>
                <Typography variant="body2">• Leg 2: <strong>{preview.leg1MatchCount} fixtures</strong> (ACTIVE=NO)</Typography>
                <Typography variant="body2">• Total: <strong>{preview.totalMatchCount} fixtures</strong></Typography>
              </Box>

            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: "none" }}>
            ยกเลิก
          </Button>
          <Button onClick={handleGenerate} variant="contained" startIcon={<RocketLaunch />}
            sx={{ borderRadius: 2, textTransform: "none", bgcolor: "#1b5e20", "&:hover": { bgcolor: "#2e7d32" } }}>
            ยืนยัน Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLeagueSetting;
