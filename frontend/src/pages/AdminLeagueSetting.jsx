import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Divider, Button, TextField,
  IconButton, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, GlobalStyles, Stack, Alert,
  Avatar, CircularProgress, FormControlLabel, Checkbox
} from "@mui/material";
import {
  MilitaryTech, Save, KeyboardArrowDown, KeyboardArrowUp,
  EmojiEvents, CalendarMonth, Groups, SportsSoccer,
  RocketLaunch, Block, CheckCircle, Warning, DeleteForever
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";

const AdminLeagueSetting = () => {
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

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => { fetchPrizes(); }, []);

  useEffect(() => {
    if (showFixtureGen && !preview) fetchPreview();
  }, [showFixtureGen]);

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

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await adminService.getFixtureGeneratePreview();
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
      const res = await adminService.generateFixture();
      const msg = res.data?.data?.message || "Generate สำเร็จ!";
      enqueueSnackbar(msg, { variant: "success" });
      setPreview(null);
      await fetchPreview();
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
      const res = await adminService.resetFixtures(resetOptions);
      enqueueSnackbar(res.data?.data?.message || "Reset สำเร็จ!", { variant: "success" });
      setPreview(null);
      await fetchPreview();
    } catch (err) {
      enqueueSnackbar("Reset ไม่สำเร็จ", { variant: "error" });
    } finally {
      setReseting(false);
    }
  };

  const isBlocked = preview && preview.existingFixtureCount > 0;
  const tableNotReady = preview && preview.tableReady === false;

  return (
    <Box sx={{ width: "100%", px: { xs: 0, sm: 0 } }}>
      <GlobalStyles styles={{ "@keyframes pulse": { "0%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.5, transform: "scale(1.2)" }, "100%": { opacity: 1, transform: "scale(1)" } } }} />

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, px: { xs: 1, sm: 0 } }}>
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
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                  {[
                    { icon: <CalendarMonth sx={{ fontSize: 28 }} />, label: "Season", value: preview.season },
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
                      <Box sx={{ color: "primary.main", mb: 0.5 }}>{stat.icon}</Box>
                      <Typography variant="h4" fontWeight="bold" sx={{ color: "primary.main" }}>{stat.value}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">{stat.label}</Typography>
                      {stat.sub && <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{stat.sub}</Typography>}
                    </Box>
                  ))}
                </Box>

                {/* Table Not Ready Warning */}
                {tableNotReady && (
                  <Alert severity="warning" icon={<Warning />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight="bold">ยังไม่มีตาราง tbm_fixture_all_test</Typography>
                    <Typography variant="body2">กรุณารัน SQL ต่อไปนี้ใน SQL Server ก่อน:</Typography>
                    <Box component="pre" sx={{ mt: 1, p: 1.5, bgcolor: "rgba(0,0,0,0.06)", borderRadius: 1, fontSize: 12, overflowX: "auto" }}>
                      {"SELECT TOP 0 * INTO [dbo].[tbm_fixture_all_test]\nFROM [dbo].[tbm_fixture_all]"}
                    </Box>
                  </Alert>
                )}

                {/* Blocked Warning */}
                {isBlocked && (
                  <Alert severity="error" icon={<Block />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight="bold">ไม่สามารถ Generate ได้</Typography>
                    <Typography variant="body2">Season {preview.season} มี Fixture อยู่แล้ว {preview.existingFixtureCount} รายการ — กรุณาติดต่อ DBA เพื่อล้างข้อมูลก่อน</Typography>
                  </Alert>
                )}

                {/* Ready */}
                {!isBlocked && !tableNotReady && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: 2 }}>
                    <Typography fontWeight="bold">พร้อม Generate</Typography>
                    <Typography variant="body2">Season {preview.season} ยังไม่มี Fixture — สามารถ Generate ได้เลย</Typography>
                  </Alert>
                )}

                {/* Player Grid 5 คน/แถว — Unified with Prize Style */}
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" mb={1.5} color="text.secondary">
                    PLAYER LIST ({preview.playerCount} คน)
                  </Typography>
                  <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
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
                <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 1 }}>
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
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <RocketLaunch />}
                    onClick={() => setConfirmOpen(true)}
                    disabled={isBlocked || tableNotReady || generating}
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
      </Stack>

      {/* ── Reset Confirmation Dialog ────────────────────── */}
      <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <DeleteForever />
          <Typography fontWeight="bold">เลือกข้อมูลที่ต้องการลบ (Season {preview?.season})</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาเลือกรายการที่ต้องการลบออกจากระบบ (ข้อมูลจะหายไปถาวร):
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
                    <Typography variant="caption" color="text.secondary">ลบข้อมูลการจับคู่ทั้งหมดใน tbm_fixture_all_test</Typography>
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
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
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
                <Typography variant="body2">• Division: <strong>D1</strong></Typography>
                <Typography variant="body2">• Players: <strong>{preview.playerCount} คน</strong></Typography>
                <Typography variant="body2">• Leg 1: <strong>{preview.leg1MatchCount} fixtures</strong> (ACTIVE=YES)</Typography>
                <Typography variant="body2">• Leg 2: <strong>{preview.leg1MatchCount} fixtures</strong> (ACTIVE=NO)</Typography>
                <Typography variant="body2">• Total: <strong>{preview.totalMatchCount} fixtures</strong></Typography>
              </Box>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">⚠ ข้อมูลจะถูกบันทึกลงตาราง <strong>tbm_fixture_all_test</strong> (ทดสอบ)</Typography>
              </Alert>
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
