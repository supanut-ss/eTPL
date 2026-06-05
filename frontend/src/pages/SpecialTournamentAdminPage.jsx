import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Tab, Tabs, Select, MenuItem,
  FormControl, InputLabel, Switch, FormControlLabel, Chip, Avatar,
  CircularProgress, Tooltip, Divider, Alert, Table, TableBody,
  TableCell, TableHead, TableRow, Stack, useTheme, useMediaQuery,
} from "@mui/material";
import {
  Add, Edit, Delete, EmojiEvents, Groups, SportsSoccer, Settings,
  Visibility, VisibilityOff, PlayArrow, Refresh, ArrowForward,
  CheckCircle, Schedule, Close, OpenInNew, Lock,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import { useNavigate } from "react-router-dom";
import specialTournamentService from "../services/specialTournamentService";
import SEO from "../components/SEO";

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:        { label: "Draft",        color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  registration: { label: "Registration", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  ongoing:      { label: "Ongoing",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  completed:    { label: "Completed",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
};

const FORMAT_LABELS = {
  knockout:       "Knockout",
  group_knockout: "Group Stage + Knockout",
};

// ─── Reusable Status Chip ────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: "0.72rem" }}
    />
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const SpecialTournamentAdminPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tab, setTab] = useState(0);

  // Create/Edit tournament dialog
  const [tournamentDialog, setTournamentDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", format: "knockout", isPublic: false, groupCount: 4, teamsAdvancePerGroup: 2, status: "draft" });
  const [formSaving, setFormSaving] = useState(false);

  // Participant dialog
  const [participantDialog, setParticipantDialog] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [pForm, setPForm] = useState({ displayName: "", teamName: "", logoUrl: "", seed: "" });
  const [pSaving, setPSaving] = useState(false);

  // Result report dialog
  const [reportDialog, setReportDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [reporting, setReporting] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isAdmin = user?.userLevel === "admin";
  const isAdminOrMod = isAdmin || user?.userLevel === "moderator";

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await specialTournamentService.list();
      setTournaments(res.data?.data || []);
    } catch {
      enqueueSnackbar("โหลดข้อมูลไม่สำเร็จ", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await specialTournamentService.getById(id);
      setDetail(res.data?.data || null);
    } catch {
      enqueueSnackbar("โหลดรายละเอียดไม่สำเร็จ", { variant: "error" });
    } finally {
      setDetailLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => {
    if (selectedTournament) fetchDetail(selectedTournament.id);
    else setDetail(null);
  }, [selectedTournament, fetchDetail]);

  // ── Tournament CRUD ───────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingTournament(null);
    setForm({ name: "", description: "", format: "knockout", isPublic: false, groupCount: 4, teamsAdvancePerGroup: 2, status: "draft" });
    setTournamentDialog(true);
  };

  const openEditDialog = (t) => {
    setEditingTournament(t);
    setForm({
      name: t.name, description: t.description || "", format: t.format,
      isPublic: t.isPublic, groupCount: t.groupCount || 4,
      teamsAdvancePerGroup: t.teamsAdvancePerGroup || 2, status: t.status,
    });
    setTournamentDialog(true);
  };

  const saveTournament = async () => {
    if (!form.name.trim()) { enqueueSnackbar("กรุณาใส่ชื่อรายการ", { variant: "warning" }); return; }
    setFormSaving(true);
    try {
      const payload = {
        name: form.name, description: form.description, format: form.format,
        isPublic: form.isPublic, groupCount: parseInt(form.groupCount) || 4,
        teamsAdvancePerGroup: parseInt(form.teamsAdvancePerGroup) || 2, status: form.status,
      };
      if (editingTournament) {
        await specialTournamentService.update(editingTournament.id, payload);
        enqueueSnackbar("อัปเดตสำเร็จ!", { variant: "success" });
      } else {
        await specialTournamentService.create(payload);
        enqueueSnackbar("สร้างรายการสำเร็จ!", { variant: "success" });
      }
      setTournamentDialog(false);
      fetchList();
      if (selectedTournament?.id === editingTournament?.id) fetchDetail(editingTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "เกิดข้อผิดพลาด", { variant: "error" });
    } finally {
      setFormSaving(false);
    }
  };

  const deleteTournament = async (t) => {
    if (!window.confirm(`ลบ "${t.name}" และข้อมูลทั้งหมดหรือไม่?`)) return;
    try {
      await specialTournamentService.delete(t.id);
      enqueueSnackbar("ลบสำเร็จ!", { variant: "success" });
      if (selectedTournament?.id === t.id) setSelectedTournament(null);
      fetchList();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "ลบไม่สำเร็จ", { variant: "error" });
    }
  };

  // ── Participant CRUD ──────────────────────────────────────────────────────
  const openAddParticipant = () => {
    setEditingParticipant(null);
    setPForm({ displayName: "", teamName: "", logoUrl: "", seed: "" });
    setParticipantDialog(true);
  };

  const openEditParticipant = (p) => {
    setEditingParticipant(p);
    setPForm({ displayName: p.displayName, teamName: p.teamName || "", logoUrl: p.logoUrl || "", seed: p.seed ?? "" });
    setParticipantDialog(true);
  };

  const saveParticipant = async () => {
    if (!pForm.displayName.trim()) { enqueueSnackbar("กรุณาใส่ชื่อ", { variant: "warning" }); return; }
    setPSaving(true);
    try {
      const payload = {
        displayName: pForm.displayName, teamName: pForm.teamName || null,
        logoUrl: pForm.logoUrl || null, seed: pForm.seed !== "" ? parseInt(pForm.seed) : null,
      };
      if (editingParticipant) {
        await specialTournamentService.updateParticipant(selectedTournament.id, editingParticipant.id, payload);
        enqueueSnackbar("อัปเดตผู้เข้าแข่งขันสำเร็จ!", { variant: "success" });
      } else {
        await specialTournamentService.addParticipant(selectedTournament.id, payload);
        enqueueSnackbar("เพิ่มผู้เข้าแข่งขันสำเร็จ!", { variant: "success" });
      }
      setParticipantDialog(false);
      fetchDetail(selectedTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "เกิดข้อผิดพลาด", { variant: "error" });
    } finally {
      setPSaving(false);
    }
  };

  const removeParticipant = async (p) => {
    if (!window.confirm(`ลบ "${p.displayName}" หรือไม่?`)) return;
    try {
      await specialTournamentService.removeParticipant(selectedTournament.id, p.id);
      enqueueSnackbar("ลบสำเร็จ!", { variant: "success" });
      fetchDetail(selectedTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "ลบไม่สำเร็จ", { variant: "error" });
    }
  };

  // ── Bracket actions ───────────────────────────────────────────────────────
  const doGenerate = async (action, label) => {
    setGenerating(true);
    try {
      await action();
      enqueueSnackbar(`${label}สำเร็จ!`, { variant: "success" });
      fetchDetail(selectedTournament.id);
      fetchList();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "เกิดข้อผิดพลาด", { variant: "error" });
    } finally {
      setGenerating(false);
    }
  };

  // ── Result report ─────────────────────────────────────────────────────────
  const openReport = (match) => {
    setSelectedMatch(match);
    setHomeScore(match.homeScore ?? "");
    setAwayScore(match.awayScore ?? "");
    setReportDialog(true);
  };

  const submitReport = async () => {
    const hs = parseInt(homeScore), as = parseInt(awayScore);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      enqueueSnackbar("กรุณาใส่คะแนนให้ถูกต้อง", { variant: "warning" }); return;
    }
    if (selectedMatch.phase === "knockout" && hs === as) {
      enqueueSnackbar("รอบ Knockout ต้องมีผู้ชนะ", { variant: "warning" }); return;
    }
    setReporting(true);
    try {
      await specialTournamentService.reportResult(selectedMatch.id, { homeScore: hs, awayScore: as });
      enqueueSnackbar("บันทึกผลสำเร็จ!", { variant: "success" });
      setReportDialog(false);
      fetchDetail(selectedTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "เกิดข้อผิดพลาด", { variant: "error" });
    } finally {
      setReporting(false);
    }
  };

  // ── Group standings helper ────────────────────────────────────────────────
  const computeStandings = (groupId) => {
    if (!detail) return [];
    const participants = detail.participants.filter(p => p.groupId === groupId);
    const matches = detail.matches.filter(m => m.groupId === groupId);
    return participants.map(p => {
      let w = 0, d = 0, l = 0, gf = 0, ga = 0;
      matches.forEach(m => {
        const isHome = m.homeParticipantId === p.id;
        const isAway = m.awayParticipantId === p.id;
        if (!isHome && !isAway || !m.isPlayed) return;
        const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
        const opp = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
        gf += my; ga += opp;
        if (my > opp) w++; else if (my === opp) d++; else l++;
      });
      return { ...p, w, d, l, pts: w * 3 + d, gd: gf - ga, gf, ga };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ width: "100%", bgcolor: "background.default", minHeight: "100vh" }}>
      <SEO title="จัดการ Special Tournament | eTPL" description="หน้าจัดการรายการแข่งขันพิเศษ" keywords="Special Tournament eTPL" />

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Special Tournament</Typography>
            <Typography variant="body2" color="text.secondary">จัดการรายการแข่งขันพิเศษ</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}
          sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
          สร้างรายการใหม่
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" }, minHeight: 600 }}>
        {/* ── Left: tournament list ── */}
        <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: "rgba(99,102,241,0.05)", borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" fontWeight={700} color="primary">รายการแข่งขัน ({tournaments.length})</Typography>
            </Box>
            {loading ? (
              <Box display="flex" justifyContent="center" py={6}><CircularProgress size={32} /></Box>
            ) : tournaments.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <EmojiEvents sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                <Typography color="text.secondary" variant="body2">ยังไม่มีรายการ</Typography>
              </Box>
            ) : (
              tournaments.map(t => (
                <Box key={t.id}
                  onClick={() => { setSelectedTournament(t); setTab(0); }}
                  sx={{
                    p: 2, cursor: "pointer", borderBottom: "1px solid", borderColor: "divider",
                    bgcolor: selectedTournament?.id === t.id ? "rgba(99,102,241,0.08)" : "transparent",
                    borderLeft: selectedTournament?.id === t.id ? "3px solid #6366f1" : "3px solid transparent",
                    transition: "all 0.15s",
                    "&:hover": { bgcolor: "rgba(99,102,241,0.05)" },
                  }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1} mr={1}>
                      <Typography variant="body2" fontWeight={700} noWrap>{t.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{FORMAT_LABELS[t.format]}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {t.isPublic ? <Visibility sx={{ fontSize: 14, color: "#10b981" }} /> : <VisibilityOff sx={{ fontSize: 14, color: "#94a3b8" }} />}
                    </Box>
                  </Box>
                  <Box mt={0.5}><StatusChip status={t.status} /></Box>
                </Box>
              ))
            )}
          </Paper>
        </Box>

        {/* ── Right: detail panel ── */}
        <Box flex={1}>
          {!selectedTournament ? (
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 6, textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box>
                <EmojiEvents sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
                <Typography color="text.secondary">เลือกรายการจากซ้ายเพื่อดูรายละเอียด</Typography>
              </Box>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              {/* Detail header */}
              <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", background: "linear-gradient(135deg, #1e293b, #334155)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="h6" fontWeight="800" color="white" noWrap>{selectedTournament.name}</Typography>
                  <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                    <StatusChip status={selectedTournament.status} />
                    <Chip size="small" label={FORMAT_LABELS[selectedTournament.format]} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white", fontSize: "0.7rem" }} />
                    {selectedTournament.isPublic && <Chip size="small" icon={<Visibility sx={{ fontSize: 12, color: "#10b981 !important" }} />} label="Public" sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "0.7rem" }} />}
                  </Box>
                </Box>
                <Box display="flex" gap={1}>
                  <Tooltip title="ดู Bracket (Public)">
                    <IconButton size="small" sx={{ color: "white" }} onClick={() => navigate(`/special-tournament/${selectedTournament.id}`)}>
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="แก้ไขรายการ">
                    <IconButton size="small" sx={{ color: "white" }} onClick={() => openEditDialog(selectedTournament)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {isAdmin && (
                    <Tooltip title="ลบรายการ">
                      <IconButton size="small" sx={{ color: "#f87171" }} onClick={() => deleteTournament(selectedTournament)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              {/* Tabs */}
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: "1px solid", borderColor: "divider", px: 2 }}>
                <Tab label="ผู้เข้าแข่งขัน" icon={<Groups sx={{ fontSize: 18 }} />} iconPosition="start" />
                <Tab label="ผลการแข่งขัน" icon={<SportsSoccer sx={{ fontSize: 18 }} />} iconPosition="start" />
                <Tab label="จัดการ Bracket" icon={<Settings sx={{ fontSize: 18 }} />} iconPosition="start" />
              </Tabs>

              {detailLoading ? (
                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
              ) : !detail ? null : (
                <>
                  {/* ── Tab 0: Participants ── */}
                  {tab === 0 && (
                    <Box sx={{ p: 2.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          ผู้เข้าแข่งขัน ({detail.participants.length} คน)
                        </Typography>
                        <Button size="small" variant="contained" startIcon={<Add />} onClick={openAddParticipant}
                          sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                          เพิ่ม
                        </Button>
                      </Box>

                      {detail.participants.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>ยังไม่มีผู้เข้าแข่งขัน กดปุ่ม "เพิ่ม" เพื่อเริ่มลงทะเบียน</Alert>
                      ) : (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                          {detail.participants.map((p, i) => {
                            const groupName = p.groupId && detail.groups.find(g => g.id === p.groupId)?.groupName;
                            return (
                              <Paper key={p.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, width: { xs: "100%", sm: 220 }, display: "flex", alignItems: "center", gap: 1.5, position: "relative" }}>
                                <Avatar src={p.logoUrl} sx={{ width: 36, height: 36, bgcolor: "#6366f1", fontSize: 14, fontWeight: 700 }}>
                                  {p.displayName[0]}
                                </Avatar>
                                <Box flex={1} overflow="hidden">
                                  <Typography variant="body2" fontWeight={700} noWrap>{p.displayName}</Typography>
                                  {p.teamName && <Typography variant="caption" color="text.secondary" noWrap display="block">{p.teamName}</Typography>}
                                  <Box display="flex" gap={0.5} mt={0.5}>
                                    {p.seed && <Chip label={`#${p.seed}`} size="small" sx={{ fontSize: "0.65rem", height: 18 }} />}
                                    {groupName && <Chip label={`กลุ่ม ${groupName}`} size="small" color="primary" sx={{ fontSize: "0.65rem", height: 18 }} />}
                                  </Box>
                                </Box>
                                <Box display="flex" flexDirection="column">
                                  <IconButton size="small" onClick={() => openEditParticipant(p)}><Edit sx={{ fontSize: 15 }} /></IconButton>
                                  <IconButton size="small" color="error" onClick={() => removeParticipant(p)}><Delete sx={{ fontSize: 15 }} /></IconButton>
                                </Box>
                              </Paper>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* ── Tab 1: Results ── */}
                  {tab === 1 && (
                    <Box sx={{ p: 2.5 }}>
                      {/* Group Stage */}
                      {detail.tournament.format === "group_knockout" && detail.groups.length > 0 && (
                        <Box mb={4}>
                          <Typography variant="subtitle1" fontWeight={700} mb={2}>รอบแบ่งกลุ่ม</Typography>
                          {detail.groups.map(group => {
                            const standings = computeStandings(group.id);
                            const groupMatches = detail.matches.filter(m => m.groupId === group.id);
                            return (
                              <Paper key={group.id} variant="outlined" sx={{ mb: 2.5, borderRadius: 2.5, overflow: "hidden" }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: "rgba(99,102,241,0.08)", borderBottom: "1px solid", borderColor: "divider" }}>
                                  <Typography variant="subtitle2" fontWeight={800} color="primary">กลุ่ม {group.groupName}</Typography>
                                </Box>
                                {/* Standings table */}
                                <Box sx={{ overflowX: "auto" }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>ทีม</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>W</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>D</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>L</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>GD</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#6366f1" }}>PTS</TableCell>
                                        <TableCell />
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {standings.map((p, idx) => {
                                        const advance = detail.tournament.teamsAdvancePerGroup || 2;
                                        const isAdvancing = idx < advance;
                                        return (
                                          <TableRow key={p.id} sx={{ bgcolor: isAdvancing ? "rgba(16,185,129,0.04)" : "transparent" }}>
                                            <TableCell sx={{ fontSize: "0.8rem", fontWeight: isAdvancing ? 700 : 400, color: isAdvancing ? "#10b981" : "text.primary" }}>{idx + 1}</TableCell>
                                            <TableCell>
                                              <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar src={p.logoUrl} sx={{ width: 22, height: 22, fontSize: 10, bgcolor: "#6366f1" }}>{p.displayName[0]}</Avatar>
                                                <Typography variant="body2" fontWeight={isAdvancing ? 700 : 400}>{p.displayName}</Typography>
                                              </Box>
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontSize: "0.8rem" }}>{p.w}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: "0.8rem" }}>{p.d}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: "0.8rem" }}>{p.l}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: "0.8rem", color: p.gd > 0 ? "success.main" : p.gd < 0 ? "error.main" : "text.secondary" }}>
                                              {p.gd > 0 ? `+${p.gd}` : p.gd}
                                            </TableCell>
                                            <TableCell align="center" sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#6366f1" }}>{p.pts}</TableCell>
                                            <TableCell />
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </Box>
                                <Divider />
                                {/* Group matches */}
                                <Box sx={{ p: 1.5 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>แมตช์ในกลุ่ม</Typography>
                                  {groupMatches.map(m => (
                                    <Box key={m.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.75, px: 1, borderRadius: 1.5, mb: 0.5, bgcolor: m.isPlayed ? "rgba(16,185,129,0.04)" : "rgba(248,250,252,1)", border: "1px solid", borderColor: m.isPlayed ? "rgba(16,185,129,0.15)" : "divider" }}>
                                      <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "right", mr: 1 }} noWrap>{m.homeDisplayName}</Typography>
                                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: m.isPlayed ? "#10b981" : "#e2e8f0", minWidth: 50, textAlign: "center" }}>
                                        <Typography variant="caption" fontWeight={800} color={m.isPlayed ? "white" : "text.secondary"}>
                                          {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                                        </Typography>
                                      </Box>
                                      <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "left", ml: 1 }} noWrap>{m.awayDisplayName}</Typography>
                                      <IconButton size="small" onClick={() => openReport(m)} sx={{ ml: 1 }}>
                                        {m.isPlayed ? <Edit sx={{ fontSize: 14 }} /> : <SportsSoccer sx={{ fontSize: 14 }} />}
                                      </IconButton>
                                    </Box>
                                  ))}
                                </Box>
                              </Paper>
                            );
                          })}
                        </Box>
                      )}

                      {/* Knockout matches */}
                      {(() => {
                        const koMatches = detail.matches.filter(m => m.phase === "knockout");
                        if (koMatches.length === 0) return null;
                        const rounds = [...new Set(koMatches.map(m => m.round))].sort((a, b) => a - b);
                        const roundLabel = (r) => {
                          if (r === 2) return "รอบชิงชนะเลิศ";
                          if (r === 4) return "รอบรองชนะเลิศ";
                          if (r === 8) return "รอบก่อนรองชนะเลิศ";
                          return `รอบ ${r} ทีม`;
                        };
                        return (
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>รอบ Knockout</Typography>
                            {rounds.map(r => (
                              <Box key={r} mb={2}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>{roundLabel(r)}</Typography>
                                {koMatches.filter(m => m.round === r).map(m => (
                                  <Box key={m.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, px: 1.5, borderRadius: 2, mb: 1, bgcolor: m.isPlayed ? "rgba(99,102,241,0.05)" : "rgba(248,250,252,1)", border: "1px solid", borderColor: m.isPlayed ? "rgba(99,102,241,0.2)" : "divider" }}>
                                    <Typography variant="body2" fontWeight={m.winnerId === m.homeParticipantId ? 800 : 500} sx={{ flex: 1, textAlign: "right", mr: 1, color: m.winnerId === m.homeParticipantId ? "#6366f1" : "text.primary" }} noWrap>{m.homeDisplayName || "TBD"}</Typography>
                                    <Box sx={{ px: 2, py: 0.5, borderRadius: 1, bgcolor: m.isPlayed ? "#6366f1" : "#e2e8f0", minWidth: 60, textAlign: "center" }}>
                                      <Typography variant="body2" fontWeight={800} color={m.isPlayed ? "white" : "text.secondary"}>
                                        {m.isBye ? "BYE" : m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight={m.winnerId === m.awayParticipantId ? 800 : 500} sx={{ flex: 1, textAlign: "left", ml: 1, color: m.winnerId === m.awayParticipantId ? "#6366f1" : "text.primary" }} noWrap>{m.awayDisplayName || "TBD"}</Typography>
                                    {!m.isBye && (
                                      <IconButton size="small" onClick={() => openReport(m)} sx={{ ml: 1 }}>
                                        {m.isPlayed ? <Edit sx={{ fontSize: 16 }} /> : <SportsSoccer sx={{ fontSize: 16 }} />}
                                      </IconButton>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            ))}
                          </Box>
                        );
                      })()}

                      {detail.matches.length === 0 && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>ยังไม่มีแมตช์ ไปที่แท็บ "จัดการ Bracket" เพื่อสร้าง</Alert>
                      )}
                    </Box>
                  )}

                  {/* ── Tab 2: Bracket Management ── */}
                  {tab === 2 && (
                    <Box sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        {/* Knockout bracket */}
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                          <Typography variant="subtitle2" fontWeight={700} mb={1}>Knockout Bracket</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                            สร้าง bracket แบบแพ้คัดออก โดยใช้ผู้เข้าแข่งขันที่ลงทะเบียนไว้ (หรือผู้ผ่านกลุ่มในกรณี Group+Knockout)
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            <Button variant="contained" startIcon={<PlayArrow />} disabled={generating}
                              onClick={() => doGenerate(() => specialTournamentService.generateBracket(selectedTournament.id), "สร้าง Bracket")}
                              sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {generating ? "กำลังสร้าง..." : "สร้าง Knockout Bracket"}
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<Refresh />} disabled={generating}
                              onClick={() => doGenerate(() => specialTournamentService.resetBracket(selectedTournament.id, "knockout"), "รีเซ็ต Bracket")}>
                              Reset Knockout
                            </Button>
                          </Box>
                        </Paper>

                        {/* Group Stage (only for group_knockout) */}
                        {selectedTournament.format === "group_knockout" && (
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1}>Group Stage</Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                              สร้างกลุ่มและจับคู่การแข่งขันรอบแบ่งกลุ่ม (จำนวนกลุ่ม: {selectedTournament.groupCount || 4}, ผ่านกลุ่มละ: {selectedTournament.teamsAdvancePerGroup || 2} ทีม)
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              <Button variant="contained" startIcon={<Groups />} disabled={generating}
                                onClick={() => doGenerate(() => specialTournamentService.generateGroups(selectedTournament.id), "สร้างกลุ่ม")}
                                sx={{ borderRadius: 2, bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}>
                                สร้างกลุ่มการแข่งขัน
                              </Button>
                              <Button variant="contained" startIcon={<ArrowForward />} disabled={generating}
                                onClick={() => doGenerate(() => specialTournamentService.advanceFromGroups(selectedTournament.id), "Advance from Groups")}
                                sx={{ borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>
                                Advance to Knockout
                              </Button>
                              <Button variant="outlined" color="error" startIcon={<Refresh />} disabled={generating}
                                onClick={() => doGenerate(() => specialTournamentService.resetBracket(selectedTournament.id, "group"), "รีเซ็ตกลุ่ม")}>
                                Reset Groups
                              </Button>
                            </Box>
                          </Paper>
                        )}

                        {/* Reset All */}
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: "error.light" }}>
                          <Typography variant="subtitle2" fontWeight={700} mb={1} color="error">Reset ทั้งหมด</Typography>
                          <Button variant="outlined" color="error" startIcon={<Refresh />} disabled={generating}
                            onClick={() => doGenerate(() => specialTournamentService.resetBracket(selectedTournament.id, "all"), "รีเซ็ตทั้งหมด")}>
                            Reset All Brackets
                          </Button>
                        </Paper>
                      </Stack>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          )}
        </Box>
      </Box>

      {/* ── Tournament Dialog ── */}
      <Dialog open={tournamentDialog} onClose={() => setTournamentDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: "linear-gradient(135deg,#1e293b,#334155)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <EmojiEvents />
            <Typography fontWeight={800}>{editingTournament ? "แก้ไขรายการ" : "สร้างรายการใหม่"}</Typography>
          </Box>
          <IconButton onClick={() => setTournamentDialog(false)} sx={{ color: "rgba(255,255,255,0.7)" }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Stack spacing={2.5} mt={1}>
            <TextField label="ชื่อรายการ *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="คำอธิบาย" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={2} />
            <FormControl fullWidth>
              <InputLabel>รูปแบบการแข่งขัน</InputLabel>
              <Select value={form.format} label="รูปแบบการแข่งขัน" onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                <MenuItem value="knockout">Knockout (แพ้คัดออก)</MenuItem>
                <MenuItem value="group_knockout">Group Stage + Knockout</MenuItem>
              </Select>
            </FormControl>
            {form.format === "group_knockout" && (
              <Box display="flex" gap={2}>
                <TextField label="จำนวนกลุ่ม" type="number" value={form.groupCount} onChange={e => setForm(f => ({ ...f, groupCount: e.target.value }))} inputProps={{ min: 2, max: 16 }} sx={{ flex: 1 }} />
                <TextField label="ผ่านกลุ่มละ (ทีม)" type="number" value={form.teamsAdvancePerGroup} onChange={e => setForm(f => ({ ...f, teamsAdvancePerGroup: e.target.value }))} inputProps={{ min: 1, max: 8 }} sx={{ flex: 1 }} />
              </Box>
            )}
            <FormControl fullWidth>
              <InputLabel>สถานะ</InputLabel>
              <Select value={form.status} label="สถานะ" onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} color="success" />}
              label={<Box><Typography variant="body2" fontWeight={600}>แสดงใน Public Menu</Typography><Typography variant="caption" color="text.secondary">เปิดให้สาธารณชนดู bracket ได้</Typography></Box>} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTournamentDialog(false)} sx={{ color: "text.secondary" }}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveTournament} disabled={formSaving}
            sx={{ px: 4, borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {formSaving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Participant Dialog ── */}
      <Dialog open={participantDialog} onClose={() => setParticipantDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: "linear-gradient(135deg,#1e293b,#334155)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Groups />
            <Typography fontWeight={800}>{editingParticipant ? "แก้ไขผู้เข้าแข่งขัน" : "เพิ่มผู้เข้าแข่งขัน"}</Typography>
          </Box>
          <IconButton onClick={() => setParticipantDialog(false)} sx={{ color: "rgba(255,255,255,0.7)" }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Stack spacing={2.5} mt={1}>
            <TextField label="ชื่อผู้เข้าแข่งขัน *" value={pForm.displayName} onChange={e => setPForm(f => ({ ...f, displayName: e.target.value }))} fullWidth />
            <TextField label="ชื่อทีม" value={pForm.teamName} onChange={e => setPForm(f => ({ ...f, teamName: e.target.value }))} fullWidth />
            <TextField label="URL รูปโลโก้" value={pForm.logoUrl} onChange={e => setPForm(f => ({ ...f, logoUrl: e.target.value }))} fullWidth />
            <TextField label="Seed (ลำดับวาง)" type="number" value={pForm.seed} onChange={e => setPForm(f => ({ ...f, seed: e.target.value }))} fullWidth inputProps={{ min: 1 }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setParticipantDialog(false)} sx={{ color: "text.secondary" }}>ยกเลิก</Button>
          <Button variant="contained" onClick={saveParticipant} disabled={pSaving}
            sx={{ px: 4, borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {pSaving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Report Result Dialog ── */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        <DialogTitle sx={{ p: 3, pb: 2, background: "linear-gradient(to right, #1e293b, #334155)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <SportsSoccer sx={{ fontSize: 26 }} />
            <Typography variant="h6" fontWeight="800">{selectedMatch?.isPlayed ? "แก้ไขผล" : "รายงานผล"}</Typography>
          </Box>
          <IconButton onClick={() => setReportDialog(false)} sx={{ color: "rgba(255,255,255,0.7)" }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 4, bgcolor: "#f8fafc" }}>
          {selectedMatch && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 2, md: 4 } }}>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Avatar src={selectedMatch.homeLogoUrl} sx={{ width: 64, height: 64, mx: "auto", mb: 1, bgcolor: "#6366f1", fontSize: 20 }}>
                  {(selectedMatch.homeDisplayName || "?")[0]}
                </Avatar>
                <Typography variant="subtitle1" fontWeight="800" noWrap>{selectedMatch.homeDisplayName || "TBD"}</Typography>
                {selectedMatch.homeTeamName && <Typography variant="caption" color="text.secondary">{selectedMatch.homeTeamName}</Typography>}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 3, py: 1.5, borderRadius: 3, bgcolor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid", borderColor: "divider" }}>
                <TextField type="number" variant="standard" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                  inputProps={{ min: 0 }} InputProps={{ disableUnderline: true, sx: { fontSize: "2rem", fontWeight: 900, width: 50, "& input": { textAlign: "center", p: 0 } } }} />
                <Typography variant="h5" fontWeight="900" color="grey.300">:</Typography>
                <TextField type="number" variant="standard" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                  inputProps={{ min: 0 }} InputProps={{ disableUnderline: true, sx: { fontSize: "2rem", fontWeight: 900, width: 50, "& input": { textAlign: "center", p: 0 } } }} />
              </Box>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Avatar src={selectedMatch.awayLogoUrl} sx={{ width: 64, height: 64, mx: "auto", mb: 1, bgcolor: "#8b5cf6", fontSize: 20 }}>
                  {(selectedMatch.awayDisplayName || "?")[0]}
                </Avatar>
                <Typography variant="subtitle1" fontWeight="800" noWrap>{selectedMatch.awayDisplayName || "TBD"}</Typography>
                {selectedMatch.awayTeamName && <Typography variant="caption" color="text.secondary">{selectedMatch.awayTeamName}</Typography>}
              </Box>
            </Box>
          )}
          {selectedMatch?.phase === "knockout" && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2" color="warning.main" fontWeight="bold">* รอบ Knockout ต้องมีผู้ชนะ (ห้ามเสมอ)</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "white", justifyContent: "center", gap: 2 }}>
          <Button onClick={() => setReportDialog(false)} sx={{ color: "text.secondary", fontWeight: "bold" }}>ยกเลิก</Button>
          <Button variant="contained" onClick={submitReport} disabled={reporting}
            sx={{ px: 6, borderRadius: 2, fontWeight: "bold", background: "linear-gradient(to right,#6366f1,#8b5cf6)", "&:hover": { background: "linear-gradient(to right,#4f46e5,#7c3aed)" } }}>
            {reporting ? "กำลังบันทึก..." : "ยืนยันผล"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpecialTournamentAdminPage;
