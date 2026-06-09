import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Paper, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Tab, Tabs, Select, MenuItem,
  FormControl, InputLabel, Switch, FormControlLabel, Chip, Avatar,
  CircularProgress, Tooltip, Divider, Alert, Table, TableBody,
  TableCell, TableHead, TableRow, Stack, useTheme, useMediaQuery,
  LinearProgress, InputAdornment,
} from "@mui/material";
import {
  Add, Edit, Delete, EmojiEvents, Groups, SportsSoccer, Settings,
  Visibility, VisibilityOff, PlayArrow, Refresh, ArrowForward,
  CheckCircle, Schedule, Close, OpenInNew, Lock, PhotoCamera,
  Link as LinkIcon, CloudUpload, AutoFixHigh, RemoveCircleOutline,
  AddCircleOutline, ArrowBack,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import { useNavigate } from "react-router-dom";
import specialTournamentService from "../services/specialTournamentService";
import { uploadSponsorImage } from "../api/uploadApi";
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

// Helper: check if a match has both participants (neither TBD)
const matchHasBothParticipants = (m) =>
  m.homeParticipantId != null && m.awayParticipantId != null;

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
  const [form, setForm] = useState({
    name: "",
    description: "",
    format: "knockout",
    isPublic: false,
    groupCount: 4,
    teamsAdvancePerGroup: 2,
    status: "draft",
    sponsorBannerUrl: "",
    sponsorBannerMode: "url",
    sponsorBannerFile: null,
    sponsorBannerPreviewUrl: "",
  });
  const [formSaving, setFormSaving] = useState(false);

  // ── Bulk participant dialog ──────────────────────────────────────────────
  const [participantDialog, setParticipantDialog] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);

  // Single-edit form (for editing existing participant)
  const [pForm, setPForm] = useState({ displayName: "", teamName: "", logoUrl: "", logoFile: null, logoMode: "url", previewUrl: "", seed: "" });
  const [pSaving, setPSaving] = useState(false);

  // Bulk-add rows (for adding multiple new participants)
  const emptyRow = () => ({ displayName: "", teamName: "", logoUrl: "", logoFile: null, logoMode: "url", previewUrl: "" });
  const [bulkRows, setBulkRows] = useState([emptyRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const fileInputRefs = useRef({});
  const singleFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);

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
      enqueueSnackbar("Failed to load tournament list.", { variant: "error" });
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
      enqueueSnackbar("Failed to load tournament details.", { variant: "error" });
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
    setForm({
      name: "",
      description: "",
      format: "knockout",
      isPublic: false,
      groupCount: 4,
      teamsAdvancePerGroup: 2,
      status: "draft",
      sponsorBannerUrl: "",
      sponsorBannerMode: "url",
      sponsorBannerFile: null,
      sponsorBannerPreviewUrl: "",
    });
    setTournamentDialog(true);
  };

  const openEditDialog = (t) => {
    setEditingTournament(t);
    setForm({
      name: t.name,
      description: t.description || "",
      format: t.format,
      isPublic: t.isPublic,
      groupCount: t.groupCount || 4,
      teamsAdvancePerGroup: t.teamsAdvancePerGroup || 2,
      status: t.status,
      sponsorBannerUrl: t.sponsorBannerUrl || "",
      sponsorBannerMode: "url",
      sponsorBannerFile: null,
      sponsorBannerPreviewUrl: t.sponsorBannerUrl || "",
    });
    setTournamentDialog(true);
  };

  const saveTournament = async () => {
    if (!form.name.trim()) { enqueueSnackbar("Tournament name is required.", { variant: "warning" }); return; }
    setFormSaving(true);
    try {
      let sponsorBannerUrl = form.sponsorBannerUrl;
      if (form.sponsorBannerMode === "upload" && form.sponsorBannerFile) {
        const uploadRes = await uploadSponsorImage(form.sponsorBannerFile);
        sponsorBannerUrl = uploadRes.data.data?.url || uploadRes.data?.url;
        if (!sponsorBannerUrl) {
          throw new Error("Could not retrieve the uploaded banner file URL");
        }
      }

      const payload = {
        name: form.name,
        description: form.description,
        format: form.format,
        isPublic: form.isPublic,
        groupCount: parseInt(form.groupCount) || 4,
        teamsAdvancePerGroup: parseInt(form.teamsAdvancePerGroup) || 2,
        status: form.status,
        sponsorBannerUrl: sponsorBannerUrl || "",
      };
      if (editingTournament) {
        await specialTournamentService.update(editingTournament.id, payload);
        enqueueSnackbar("Tournament updated!", { variant: "success" });
      } else {
        await specialTournamentService.create(payload);
        enqueueSnackbar("Tournament created!", { variant: "success" });
      }
      setTournamentDialog(false);
      fetchList();
      if (selectedTournament?.id === editingTournament?.id) fetchDetail(editingTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || e.message || "An error occurred.", { variant: "error" });
    } finally {
      setFormSaving(false);
    }
  };

  const deleteTournament = async (t) => {
    if (!window.confirm(`Delete "${t.name}" and all its data?`)) return;
    try {
      await specialTournamentService.delete(t.id);
      enqueueSnackbar("Tournament deleted!", { variant: "success" });
      if (selectedTournament?.id === t.id) setSelectedTournament(null);
      fetchList();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "Failed to delete.", { variant: "error" });
    }
  };

  // ── Participant CRUD ──────────────────────────────────────────────────────
  const openAddParticipants = () => {
    setEditingParticipant(null);
    setBulkRows([emptyRow()]);
    setBulkProgress(0);
    setParticipantDialog(true);
  };

  const openEditParticipant = (p) => {
    setEditingParticipant(p);
    setPForm({
      displayName: p.displayName,
      teamName: p.teamName || "",
      logoUrl: p.logoUrl || "",
      logoFile: null,
      logoMode: "url",
      previewUrl: p.logoUrl || "",
      seed: p.seed ?? ""
    });
    setParticipantDialog(true);
  };

  // ── Bulk row helpers ──────────────────────────────────────────────────────
  const addBulkRow = () => setBulkRows(r => [...r, emptyRow()]);
  const removeBulkRow = (i) => setBulkRows(r => r.filter((_, idx) => idx !== i));

  const updateBulkRow = (i, field, value) =>
    setBulkRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const handleBulkLogoFile = (i, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBulkRows(r => r.map((row, idx) =>
        idx === i ? { ...row, logoFile: file, previewUrl: e.target.result } : row
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleEditLogoFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPForm(f => ({ ...f, logoFile: file, previewUrl: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const autoSeedBulkRows = () => {
    setBulkRows(r => r.map((row, idx) => ({ ...row, seed: idx + 1 })));
  };

  // Upload a file and return the URL (uses logoUrl field as fallback if no upload service)
  const resolveLogoUrl = async (row) => {
    if (row.logoMode === "url") return row.logoUrl || null;
    if (row.logoFile) {
      // Convert file to base64 data URL as fallback (no upload service configured)
      return row.previewUrl || null;
    }
    return null;
  };

  // (saveParticipant moved below with duplicate check)

  // ── Duplicate name helpers ──────────────────────────────────────────────
  const existingNames = (detail?.participants || []).map(p => p.displayName.trim().toLowerCase());
  const existingNamesExcludingSelf = existingNames.filter(
    n => n !== (editingParticipant?.displayName || "").trim().toLowerCase()
  );

  // For bulk rows: collect all filled names to detect intra-list duplicates
  const bulkFilledNames = bulkRows.map(r => r.displayName.trim().toLowerCase()).filter(Boolean);
  const isDuplicateInBulk = (name, idx) => {
    const lower = name.trim().toLowerCase();
    if (!lower) return false;
    // duplicate in existing participants
    if (existingNames.includes(lower)) return true;
    // duplicate within the bulk list (same name at a different index)
    return bulkFilledNames.filter(n => n === lower).length > 1;
  };

  // Save single participant (edit mode) — with duplicate check
  const saveParticipant = async () => {
    const nameVal = pForm.displayName.trim();
    if (!nameVal) { enqueueSnackbar("Display name is required.", { variant: "warning" }); return; }
    if (existingNamesExcludingSelf.includes(nameVal.toLowerCase())) {
      enqueueSnackbar(`"${nameVal}" already exists in this tournament.`, { variant: "warning" }); return;
    }
    setPSaving(true);
    try {
      let finalLogoUrl = null;
      if (pForm.logoMode === "url") {
        finalLogoUrl = pForm.logoUrl || null;
      } else if (pForm.logoFile) {
        finalLogoUrl = pForm.previewUrl || null;
      } else {
        finalLogoUrl = editingParticipant.logoUrl || null;
      }

      const payload = {
        displayName: nameVal,
        teamName: pForm.teamName || null,
        logoUrl: finalLogoUrl,
        seed: pForm.seed !== "" ? parseInt(pForm.seed) : null,
      };
      await specialTournamentService.updateParticipant(selectedTournament.id, editingParticipant.id, payload);
      enqueueSnackbar("Participant updated!", { variant: "success" });
      setParticipantDialog(false);
      fetchDetail(selectedTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "An error occurred.", { variant: "error" });
    } finally {
      setPSaving(false);
    }
  };

  // Save bulk participants (add mode)
  const saveBulkParticipants = async () => {
    const validRows = bulkRows.filter(r => r.displayName.trim() !== "");
    if (validRows.length === 0) {
      enqueueSnackbar("Please enter at least one participant name.", { variant: "warning" });
      return;
    }
    // Check for duplicates before submitting
    const hasDuplicates = validRows.some((row, idx) => isDuplicateInBulk(row.displayName, idx));
    if (hasDuplicates) {
      enqueueSnackbar("Please fix duplicate names (highlighted in red) before saving.", { variant: "warning" });
      return;
    }
    setBulkSaving(true);
    setBulkProgress(0);
    let successCount = 0;
    let errors = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const logoUrl = await resolveLogoUrl(row);
        const payload = {
          displayName: row.displayName.trim(),
          teamName: row.teamName?.trim() || null,
          logoUrl,
          seed: row.seed !== "" && row.seed != null ? parseInt(row.seed) : null,
        };
        await specialTournamentService.addParticipant(selectedTournament.id, payload);
        successCount++;
      } catch {
        errors++;
      }
      setBulkProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    setBulkSaving(false);
    if (successCount > 0) {
      enqueueSnackbar(`${successCount} participant(s) added!${errors > 0 ? ` (${errors} failed)` : ""}`, { variant: "success" });
    } else {
      enqueueSnackbar("Failed to add participants.", { variant: "error" });
    }
    setParticipantDialog(false);
    fetchDetail(selectedTournament.id);
  };

  const removeParticipant = async (p) => {
    if (!window.confirm(`Remove "${p.displayName}"?`)) return;
    try {
      await specialTournamentService.removeParticipant(selectedTournament.id, p.id);
      enqueueSnackbar("Participant removed!", { variant: "success" });
      fetchDetail(selectedTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "Failed to remove.", { variant: "error" });
    }
  };

  // ── Bracket actions ───────────────────────────────────────────────────────
  const doGenerate = async (action, label) => {
    setGenerating(true);
    try {
      await action();
      enqueueSnackbar(`${label} successful!`, { variant: "success" });
      fetchDetail(selectedTournament.id);
      fetchList();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "An error occurred.", { variant: "error" });
    } finally {
      setGenerating(false);
    }
  };

  // ── Result report ─────────────────────────────────────────────────────────
  const openReport = (match) => {
    // Block if either participant is TBD
    if (!matchHasBothParticipants(match)) {
      enqueueSnackbar("Cannot report result: match has TBD participants.", { variant: "warning" });
      return;
    }
    setSelectedMatch(match);
    setHomeScore(match.homeScore ?? "");
    setAwayScore(match.awayScore ?? "");
    setReportDialog(true);
  };

  const submitReport = async () => {
    const hs = parseInt(homeScore), as = parseInt(awayScore);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      enqueueSnackbar("Please enter valid scores.", { variant: "warning" }); return;
    }
    if (selectedMatch.phase === "knockout" && hs === as) {
      enqueueSnackbar("Knockout matches must have a winner (no draws).", { variant: "warning" }); return;
    }
    setReporting(true);
    try {
      await specialTournamentService.reportResult(selectedMatch.id, { homeScore: hs, awayScore: as });
      enqueueSnackbar("Result saved!", { variant: "success" });
      setReportDialog(false);
      fetchDetail(selectedTournament.id);
    } catch (e) {
      enqueueSnackbar(e.response?.data?.message || "An error occurred.", { variant: "error" });
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

  const knockoutRoundLabel = (r) => {
    if (r === 2) return "Final";
    if (r === 4) return "Semifinals";
    if (r === 8) return "Quarterfinals";
    if (r === 16) return "Round of 16";
    return `Round of ${r}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ width: "100%", bgcolor: "background.default", minHeight: "100vh" }}>
      <SEO title="Manage Special Tournaments | eTPL" description="Admin panel for managing special tournaments" keywords="Special Tournament eTPL admin" />

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Special Tournaments</Typography>
            <Typography variant="body2" color="text.secondary">Manage custom tournament brackets</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}
          sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
          New Tournament
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" }, minHeight: 600 }}>
        {/* ── Left: tournament list ── */}
        {(!isMobile || !selectedTournament) && (
          <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              <Box sx={{ px: 2, py: 1.5, bgcolor: "rgba(99,102,241,0.05)", borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary">Tournaments ({tournaments.length})</Typography>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" py={6}><CircularProgress size={32} /></Box>
              ) : tournaments.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <EmojiEvents sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">No tournaments yet.</Typography>
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
        )}

        {/* ── Right: detail panel ── */}
        {(!isMobile || selectedTournament) && (
          <Box flex={1} sx={{ minWidth: 0 }}>
            {!selectedTournament ? (
              <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 6, textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Box>
                  <EmojiEvents sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
                  <Typography color="text.secondary">Select a tournament from the left to view details.</Typography>
                </Box>
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                {/* Detail header */}
                <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", background: "linear-gradient(135deg, #1e293b, #334155)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {isMobile && (
                      <IconButton sx={{ color: "white", ml: -1.5, mr: 0.5 }} onClick={() => setSelectedTournament(null)}>
                        <ArrowBack />
                      </IconButton>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" fontWeight="800" color="white" noWrap sx={{ maxWidth: { xs: "170px", sm: "100%" } }}>{selectedTournament.name}</Typography>
                      <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                        <StatusChip status={selectedTournament.status} />
                        <Chip size="small" label={FORMAT_LABELS[selectedTournament.format]} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white", fontSize: "0.7rem" }} />
                        {selectedTournament.isPublic && <Chip size="small" icon={<Visibility sx={{ fontSize: 12, color: "#10b981 !important" }} />} label="Public" sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#10b981", fontSize: "0.7rem" }} />}
                      </Box>
                    </Box>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Tooltip title="View Public Bracket">
                      <IconButton size="small" sx={{ color: "white" }} onClick={() => navigate(`/special-tournament/${selectedTournament.id}`)}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Tournament">
                      <IconButton size="small" sx={{ color: "white" }} onClick={() => openEditDialog(selectedTournament)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {isAdmin && (
                      <Tooltip title="Delete Tournament">
                        <IconButton size="small" sx={{ color: "#f87171" }} onClick={() => deleteTournament(selectedTournament)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Tabs */}
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant={isMobile ? "scrollable" : "standard"}
                  scrollButtons={isMobile ? "auto" : undefined}
                  allowScrollButtonsMobile
                  sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    px: isMobile ? 1 : 2,
                    "& .MuiTab-root": {
                      fontSize: isMobile ? "0.75rem" : "0.85rem",
                      minWidth: isMobile ? "auto" : 90,
                      px: isMobile ? 1.5 : 3,
                    }
                  }}
                >
                  <Tab label="Participants" icon={<Groups sx={{ fontSize: 18 }} />} iconPosition="start" />
                  <Tab label="Match Results" icon={<SportsSoccer sx={{ fontSize: 18 }} />} iconPosition="start" />
                  <Tab label="Bracket Management" icon={<Settings sx={{ fontSize: 18 }} />} iconPosition="start" />
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
                          Participants ({detail.participants.length})
                        </Typography>
                        <Button size="small" variant="contained" startIcon={<Add />} onClick={openAddParticipants}
                          sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                          Add Participants
                        </Button>
                      </Box>

                      {detail.participants.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>No participants yet. Click "Add Participants" to register them.</Alert>
                      ) : (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                          {detail.participants.map((p) => {
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
                                    {groupName && <Chip label={`Group ${groupName}`} size="small" color="primary" sx={{ fontSize: "0.65rem", height: 18 }} />}
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
                          <Typography variant="subtitle1" fontWeight={700} mb={2}>Group Stage</Typography>
                          {detail.groups.map(group => {
                            const standings = computeStandings(group.id);
                            const groupMatches = detail.matches.filter(m => m.groupId === group.id);
                            return (
                              <Paper key={group.id} variant="outlined" sx={{ mb: 2.5, borderRadius: 2.5, overflow: "hidden" }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: "rgba(99,102,241,0.08)", borderBottom: "1px solid", borderColor: "divider" }}>
                                  <Typography variant="subtitle2" fontWeight={800} color="primary">Group {group.groupName}</Typography>
                                </Box>
                                {/* Standings table */}
                                <Box sx={{ overflowX: "auto" }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Team</TableCell>
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
                                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>Group Matches</Typography>
                                  {groupMatches.map(m => {
                                    const canReport = matchHasBothParticipants(m);
                                    return (
                                      <Box key={m.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.75, px: 1, borderRadius: 1.5, mb: 0.5, bgcolor: m.isPlayed ? "rgba(16,185,129,0.04)" : "rgba(248,250,252,1)", border: "1px solid", borderColor: m.isPlayed ? "rgba(16,185,129,0.15)" : "divider" }}>
                                        <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "right", mr: 1 }} noWrap>{m.homeDisplayName || "TBD"}</Typography>
                                        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: m.isPlayed ? "#10b981" : "#e2e8f0", minWidth: 50, textAlign: "center" }}>
                                          <Typography variant="caption" fontWeight={800} color={m.isPlayed ? "white" : "text.secondary"}>
                                            {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                                          </Typography>
                                        </Box>
                                        <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "left", ml: 1 }} noWrap>{m.awayDisplayName || "TBD"}</Typography>
                                        <Tooltip title={canReport ? (m.isPlayed ? "Edit result" : "Report result") : "Cannot report: match has TBD participants"}>
                                          <span>
                                            <IconButton size="small" onClick={() => openReport(m)} sx={{ ml: 1 }} disabled={!canReport}>
                                              {m.isPlayed ? <Edit sx={{ fontSize: 14 }} /> : <SportsSoccer sx={{ fontSize: 14 }} />}
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      </Box>
                                    );
                                  })}
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
                        return (
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700} mb={2}>Knockout Stage</Typography>
                            {rounds.map(r => (
                              <Box key={r} mb={2}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>{knockoutRoundLabel(r)}</Typography>
                                {koMatches.filter(m => m.round === r).map(m => {
                                  const canReport = !m.isBye && matchHasBothParticipants(m);
                                  return (
                                    <Box key={m.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, px: 1.5, borderRadius: 2, mb: 1, bgcolor: m.isPlayed ? "rgba(99,102,241,0.05)" : "rgba(248,250,252,1)", border: "1px solid", borderColor: m.isPlayed ? "rgba(99,102,241,0.2)" : "divider" }}>
                                      <Typography variant="body2" fontWeight={m.winnerId === m.homeParticipantId ? 800 : 500} sx={{ flex: 1, textAlign: "right", mr: 1, color: m.winnerId === m.homeParticipantId ? "#6366f1" : "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }} noWrap>{m.homeDisplayName || "TBD"}</Typography>
                                      <Box sx={{ px: 2, py: 0.5, borderRadius: 1, bgcolor: m.isPlayed ? "#6366f1" : "#e2e8f0", minWidth: { xs: 50, sm: 60 }, textAlign: "center" }}>
                                        <Typography variant="body2" fontWeight={800} color={m.isPlayed ? "white" : "text.secondary"} sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                                          {m.isBye ? "BYE" : m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                                        </Typography>
                                      </Box>
                                      <Typography variant="body2" fontWeight={m.winnerId === m.awayParticipantId ? 800 : 500} sx={{ flex: 1, textAlign: "left", ml: 1, color: m.winnerId === m.awayParticipantId ? "#6366f1" : "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }} noWrap>{m.awayDisplayName || "TBD"}</Typography>
                                      {!m.isBye && (
                                        <Tooltip title={canReport ? (m.isPlayed ? "Edit result" : "Report result") : "Waiting for participants"}>
                                          <span>
                                            <IconButton size="small" onClick={() => openReport(m)} sx={{ ml: 1 }} disabled={!canReport}>
                                              {m.isPlayed ? <Edit sx={{ fontSize: 16 }} /> : <SportsSoccer sx={{ fontSize: 16 }} />}
                                            </IconButton>
                                          </span>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>
                            ))}
                          </Box>
                        );
                      })()}

                      {detail.matches.length === 0 && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>No matches yet. Go to "Bracket Management" to generate brackets.</Alert>
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
                            Generate a single-elimination bracket from registered participants (or group stage qualifiers).
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            <Button variant="contained" startIcon={<PlayArrow />} disabled={generating}
                              onClick={() => doGenerate(() => specialTournamentService.generateBracket(selectedTournament.id), "Generate Bracket")}
                              sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {generating ? "Generating..." : "Generate Knockout Bracket"}
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<Refresh />} disabled={generating}
                              onClick={() => doGenerate(() => specialTournamentService.resetBracket(selectedTournament.id, "knockout"), "Reset Bracket")}>
                              Reset Knockout
                            </Button>
                          </Box>
                        </Paper>

                        {/* Group Stage (only for group_knockout) */}
                        {selectedTournament.format === "group_knockout" && (
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1}>Group Stage</Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                              Generate groups and round-robin fixtures. ({selectedTournament.groupCount || 4} groups, top {selectedTournament.teamsAdvancePerGroup || 2} advance per group)
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              <Button variant="contained" startIcon={<Groups />} disabled={generating}
                                onClick={() => doGenerate(() => specialTournamentService.generateGroups(selectedTournament.id), "Generate Groups")}
                                sx={{ borderRadius: 2, bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}>
                                Generate Groups
                              </Button>
                              <Button variant="contained" startIcon={<ArrowForward />} disabled={generating}
                                onClick={() => doGenerate(() => specialTournamentService.advanceFromGroups(selectedTournament.id), "Advance from Groups")}
                                sx={{ borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>
                                Advance to Knockout
                              </Button>
                              <Button variant="outlined" color="error" startIcon={<Refresh />} disabled={generating}
                                onClick={() => doGenerate(() => specialTournamentService.resetBracket(selectedTournament.id, "group"), "Reset Groups")}>
                                Reset Groups
                              </Button>
                            </Box>
                          </Paper>
                        )}

                        {/* Reset All */}
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: "error.light" }}>
                          <Typography variant="subtitle2" fontWeight={700} mb={1} color="error">Reset All</Typography>
                          <Button variant="outlined" color="error" startIcon={<Refresh />} disabled={generating}
                            onClick={() => doGenerate(() => specialTournamentService.resetBracket(selectedTournament.id, "all"), "Reset All")}>
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
      )}
      </Box>

      {/* ── Tournament Dialog ── */}
      <Dialog open={tournamentDialog} onClose={() => setTournamentDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        {/* Custom header: relative container keeps close button from overlapping title */}
        <Box sx={{
          position: "relative",
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          color: "white",
          px: 3, py: 2.5,
          pr: 7,
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <EmojiEvents sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                {editingTournament ? "Edit Tournament" : "New Tournament"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {editingTournament ? "Update tournament settings" : "Create a new tournament bracket"}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setTournamentDialog(false)}
            size="small"
            sx={{
              position: "absolute", top: 12, right: 12,
              color: "rgba(255,255,255,0.7)",
              bgcolor: "rgba(255,255,255,0.08)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.18)", color: "white" },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Stack spacing={2.5} mt={1}>
            <TextField label="Tournament Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={2} />
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select value={form.format} label="Format" onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                <MenuItem value="knockout">Knockout (Single Elimination)</MenuItem>
                <MenuItem value="group_knockout">Group Stage + Knockout</MenuItem>
              </Select>
            </FormControl>
            {form.format === "group_knockout" && (
              <Box display="flex" gap={2}>
                <TextField label="Number of Groups" type="number" value={form.groupCount} onChange={e => setForm(f => ({ ...f, groupCount: e.target.value }))} inputProps={{ min: 2, max: 16 }} sx={{ flex: 1 }} />
                <TextField label="Advance per Group" type="number" value={form.teamsAdvancePerGroup} onChange={e => setForm(f => ({ ...f, teamsAdvancePerGroup: e.target.value }))} inputProps={{ min: 1, max: 8 }} sx={{ flex: 1 }} />
              </Box>
            )}
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} color="success" />}
              label={<Box><Typography variant="body2" fontWeight={600}>Publicly Visible</Typography><Typography variant="caption" color="text.secondary">Allow anyone to view the bracket</Typography></Box>} />
            
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={700}>Sponsor Banner (Optional)</Typography>
            
            {form.sponsorBannerMode === "url" ? (
              <TextField
                label="Sponsor Banner URL"
                value={form.sponsorBannerUrl}
                onChange={e => setForm(f => ({ ...f, sponsorBannerUrl: e.target.value, sponsorBannerPreviewUrl: e.target.value }))}
                fullWidth
                placeholder="https://..."
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LinkIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Switch to file upload">
                        <IconButton size="small" onClick={() => setForm(f => ({ ...f, sponsorBannerMode: "upload", sponsorBannerPreviewUrl: f.sponsorBannerFile ? URL.createObjectURL(f.sponsorBannerFile) : "" }))} edge="end">
                          <CloudUpload />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
            ) : (
              <Box display="flex" alignItems="center" gap={1.5} width="100%">
                <Button
                  variant={form.sponsorBannerFile ? "contained" : "outlined"}
                  startIcon={<PhotoCamera />}
                  onClick={() => bannerFileInputRef.current?.click()}
                  sx={{
                    borderRadius: 2,
                    flexShrink: 0,
                    px: 3,
                    py: 1,
                    textTransform: "none",
                    ...(form.sponsorBannerFile && { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" })
                  }}
                >
                  {form.sponsorBannerFile ? "Change Banner" : "Upload Banner"}
                </Button>
                {form.sponsorBannerFile && (
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                    {form.sponsorBannerFile.name}
                  </Typography>
                )}
                <Tooltip title="Switch to URL input">
                  <IconButton onClick={() => setForm(f => ({ ...f, sponsorBannerMode: "url", sponsorBannerPreviewUrl: f.sponsorBannerUrl }))}>
                    <LinkIcon />
                  </IconButton>
                </Tooltip>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  ref={bannerFileInputRef}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setForm(f => ({
                        ...f,
                        sponsorBannerFile: file,
                        sponsorBannerPreviewUrl: URL.createObjectURL(file)
                      }));
                    }
                  }}
                />
              </Box>
            )}

            {form.sponsorBannerPreviewUrl && (
              <Box sx={{ mt: 1, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <Box
                  component="img"
                  src={form.sponsorBannerPreviewUrl}
                  alt="Sponsor Banner Preview"
                  sx={{
                    width: "100%",
                    maxHeight: 120,
                    objectFit: "contain",
                    bgcolor: "rgba(0,0,0,0.02)",
                    mx: "auto",
                    display: "block"
                  }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTournamentDialog(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" onClick={saveTournament} disabled={formSaving}
            sx={{ px: 4, borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {formSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Participant Dialog (Add Bulk / Edit Single) ── */}
      <Dialog open={participantDialog} onClose={() => !bulkSaving && setParticipantDialog(false)}
        maxWidth={editingParticipant ? "xs" : (isMobile ? "sm" : "lg")} fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        {/* Custom header */}
        <Box sx={{
          position: "relative",
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          color: "white",
          px: 3, py: 2.5,
          pr: 7,
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Groups sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                {editingParticipant ? "Edit Participant" : "Add Participants"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {editingParticipant ? "Update participant details" : "Add one or more participants to the tournament"}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => !bulkSaving && setParticipantDialog(false)}
            size="small"
            disabled={bulkSaving}
            sx={{
              position: "absolute", top: 12, right: 12,
              color: "rgba(255,255,255,0.7)",
              bgcolor: "rgba(255,255,255,0.08)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.18)", color: "white" },
              "&.Mui-disabled": { opacity: 0.3 },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* ── EDIT MODE ── */}
        {editingParticipant ? (
          <>
            <DialogContent sx={{ pt: 3, pb: 1 }}>
              <Stack spacing={2.5} mt={1}>
                <TextField
                  label="Display Name"
                  value={pForm.displayName}
                  onChange={e => setPForm(f => ({ ...f, displayName: e.target.value }))}
                  fullWidth
                  error={!!pForm.displayName.trim() && existingNamesExcludingSelf.includes(pForm.displayName.trim().toLowerCase())}
                  helperText={pForm.displayName.trim() && existingNamesExcludingSelf.includes(pForm.displayName.trim().toLowerCase()) ? "Name already exists in this tournament" : ""}
                />
                <TextField label="Team Name (optional)" value={pForm.teamName} onChange={e => setPForm(f => ({ ...f, teamName: e.target.value }))} fullWidth />
                
                {pForm.logoMode === "url" ? (
                  <TextField
                    label="Logo URL (optional)"
                    value={pForm.logoUrl}
                    onChange={e => setPForm(f => ({ ...f, logoUrl: e.target.value }))}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LinkIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Switch to file upload">
                            <IconButton size="small" onClick={() => setPForm(f => ({ ...f, logoMode: "upload" }))} edge="end">
                              <CloudUpload />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                  />
                ) : (
                  <Box display="flex" alignItems="center" gap={1.5} width="100%">
                    <Button
                      variant={pForm.logoFile ? "contained" : "outlined"}
                      startIcon={<PhotoCamera />}
                      onClick={() => singleFileInputRef.current?.click()}
                      sx={{
                        borderRadius: 2,
                        flexShrink: 0,
                        px: 3,
                        py: 1,
                        textTransform: "none",
                        ...(pForm.logoFile && { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" })
                      }}
                    >
                      {pForm.logoFile ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {pForm.logoFile && (
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                        {pForm.logoFile.name}
                      </Typography>
                    )}
                    <Tooltip title="Switch to URL input">
                      <IconButton onClick={() => setPForm(f => ({ ...f, logoMode: "url" }))}>
                        <LinkIcon />
                      </IconButton>
                    </Tooltip>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      ref={singleFileInputRef}
                      onChange={e => handleEditLogoFile(e.target.files[0])}
                    />
                  </Box>
                )}

                {(pForm.logoMode === "url" ? pForm.logoUrl : pForm.previewUrl) && (
                  <Box display="flex" justifyContent="center" mt={1}>
                    <Avatar
                      src={pForm.logoMode === "url" ? pForm.logoUrl : pForm.previewUrl}
                      sx={{ width: 64, height: 64, border: "2px solid #6366f1" }}
                    />
                  </Box>
                )}
                
                <TextField label="Seed (optional)" type="number" value={pForm.seed} onChange={e => setPForm(f => ({ ...f, seed: e.target.value }))} fullWidth inputProps={{ min: 1 }} />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setParticipantDialog(false)} sx={{ color: "text.secondary" }}>Cancel</Button>
              <Button variant="contained" onClick={saveParticipant} disabled={pSaving}
                sx={{ px: 4, borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {pSaving ? "Saving..." : "Save"}
              </Button>
            </DialogActions>
          </>
        ) : (
          /* ── BULK ADD MODE ── */
          <>
            <DialogContent sx={{ pt: 2, pb: 1, px: 2.5 }}>
              {/* Toolbar */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Typography variant="body2" color="text.secondary">
                  Fill in each row — only <strong>Name</strong> is required.
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title="Auto-number seeds 1, 2, 3…">
                    <Button size="small" variant="outlined" startIcon={<AutoFixHigh />} onClick={autoSeedBulkRows}
                      sx={{ borderRadius: 2, fontSize: "0.75rem" }}>
                      Auto Seed
                    </Button>
                  </Tooltip>
                  <Button size="small" variant="contained" startIcon={<AddCircleOutline />} onClick={addBulkRow}
                    sx={{ borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: "0.75rem" }}>
                    Add Row
                  </Button>
                </Box>
              </Box>

              {/* ── Column headers ── */}
              {!isMobile && (
                <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "28px 44px 1fr 1fr 72px 1.2fr 36px",
                  gap: 1,
                  alignItems: "center",
                  px: 1, pb: 1,
                  borderBottom: "2px solid",
                  borderColor: "rgba(99,102,241,0.15)",
                  mb: 1,
                }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: "center" }}>#</Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Logo</Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Name *</Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Team</Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Seed</Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">Logo URL / Upload</Typography>
                  <Box />
                </Box>
              )}

              {/* ── Participant rows ── */}
              <Box sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
                {bulkRows.map((row, i) => {
                  const isDup = isDuplicateInBulk(row.displayName, i);
                  const logoSrc = row.logoMode === "url" ? row.logoUrl : row.previewUrl;
                  
                  if (isMobile) {
                    return (
                      <Paper
                        key={i}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          mb: 2,
                          position: "relative",
                          bgcolor: isDup
                            ? "rgba(239,68,68,0.04)"
                            : i % 2 === 0 ? "rgba(99,102,241,0.01)" : "transparent",
                          borderColor: isDup ? "rgba(239,68,68,0.4)" : "divider",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                        }}
                      >
                        {/* Header Row: # and Delete */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                              src={logoSrc}
                              sx={{
                                width: 28, height: 28,
                                bgcolor: isDup ? "#ef4444" : "#6366f1",
                                fontSize: 12, fontWeight: 700,
                                cursor: row.logoMode === "upload" ? "pointer" : "default",
                                border: isDup ? "2px solid #ef4444" : "2px solid transparent",
                              }}
                              onClick={() => row.logoMode === "upload" && fileInputRefs.current[i]?.click()}
                            >
                              {row.displayName ? row.displayName[0].toUpperCase() : "?"}
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight={700} color="primary">
                              Participant #{i + 1}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeBulkRow(i)}
                            disabled={bulkRows.length === 1}
                          >
                            <RemoveCircleOutline sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>

                        {/* Fields */}
                        <Stack spacing={1.5}>
                          <TextField
                            size="small"
                            label="Display name *"
                            placeholder="Display name *"
                            value={row.displayName}
                            onChange={e => updateBulkRow(i, "displayName", e.target.value)}
                            error={isDup}
                            helperText={isDup
                              ? (existingNames.includes(row.displayName.trim().toLowerCase())
                                ? "Already exists"
                                : "Duplicate")
                              : ""}
                            fullWidth
                            inputProps={{ style: { fontSize: "0.85rem" } }}
                          />

                          <Box display="flex" gap={1.5}>
                            <TextField
                              size="small"
                              label="Team (optional)"
                              placeholder="Team"
                              value={row.teamName}
                              onChange={e => updateBulkRow(i, "teamName", e.target.value)}
                              sx={{ flex: 2 }}
                              inputProps={{ style: { fontSize: "0.85rem" } }}
                            />
                            <TextField
                              size="small"
                              label="Seed"
                              placeholder="Seed"
                              type="number"
                              value={row.seed ?? ""}
                              onChange={e => updateBulkRow(i, "seed", e.target.value)}
                              inputProps={{ min: 1, style: { textAlign: "center", fontSize: "0.85rem" } }}
                              sx={{ flex: 1 }}
                            />
                          </Box>

                          {row.logoMode === "url" ? (
                            <TextField
                              size="small"
                              label="Logo URL"
                              placeholder="https://…"
                              value={row.logoUrl}
                              onChange={e => updateBulkRow(i, "logoUrl", e.target.value)}
                              fullWidth
                              inputProps={{ style: { fontSize: "0.82rem" } }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <LinkIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                                  </InputAdornment>
                                ),
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <Tooltip title="Switch to file upload">
                                      <IconButton size="small" onClick={() => updateBulkRow(i, "logoMode", "upload")} edge="end">
                                        <CloudUpload sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </InputAdornment>
                                ),
                              }}
                            />
                          ) : (
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Button
                                size="small"
                                variant={row.logoFile ? "contained" : "outlined"}
                                startIcon={<PhotoCamera sx={{ fontSize: 14 }} />}
                                onClick={() => fileInputRefs.current[i]?.click()}
                                sx={{ borderRadius: 2, flexShrink: 0, fontSize: "0.72rem", px: 2, py: 0.75,
                                  ...(row.logoFile && { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }) }}
                              >
                                {row.logoFile ? "Change" : "Upload Logo"}
                              </Button>
                              {row.logoFile && (
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1, fontSize: "0.7rem" }}>
                                  {row.logoFile.name}
                                </Typography>
                              )}
                              <Tooltip title="Switch to URL input">
                                <IconButton size="small" onClick={() => updateBulkRow(i, "logoMode", "url")}>
                                  <LinkIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                ref={el => fileInputRefs.current[i] = el}
                                onChange={e => handleBulkLogoFile(i, e.target.files[0])}
                              />
                            </Box>
                          )}
                        </Stack>
                      </Paper>
                    );
                  }

                  return (
                    <Box
                      key={i}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "28px 44px 1fr 1fr 72px 1.2fr 36px",
                        gap: 1,
                        alignItems: "center",
                        px: 1, py: 0.75,
                        borderRadius: 2,
                        mb: 0.5,
                        bgcolor: isDup
                          ? "rgba(239,68,68,0.04)"
                          : i % 2 === 0 ? "rgba(99,102,241,0.02)" : "transparent",
                        border: "1px solid",
                        borderColor: isDup ? "rgba(239,68,68,0.4)" : "transparent",
                        transition: "background 0.15s",
                        "&:hover": {
                          bgcolor: isDup ? "rgba(239,68,68,0.06)" : "rgba(99,102,241,0.05)",
                        },
                      }}
                    >
                      {/* Row number */}
                      <Typography variant="caption" color="text.disabled" sx={{ textAlign: "center", fontWeight: 600 }}>
                        {i + 1}
                      </Typography>

                      {/* Avatar preview */}
                      <Tooltip title={row.logoMode === "upload" ? "Click to choose image" : logoSrc ? "Logo preview" : "No logo"}>
                        <Avatar
                          src={logoSrc}
                          sx={{
                            width: 36, height: 36,
                            bgcolor: isDup ? "#ef4444" : "#6366f1",
                            fontSize: 14, fontWeight: 700,
                            cursor: row.logoMode === "upload" ? "pointer" : "default",
                            border: isDup ? "2px solid #ef4444" : "2px solid transparent",
                            transition: "all 0.2s",
                          }}
                          onClick={() => row.logoMode === "upload" && fileInputRefs.current[i]?.click()}
                        >
                          {row.displayName ? row.displayName[0].toUpperCase() : "?"}
                        </Avatar>
                      </Tooltip>

                      {/* Name */}
                      <TextField
                        size="small"
                        placeholder="Display name *"
                        value={row.displayName}
                        onChange={e => updateBulkRow(i, "displayName", e.target.value)}
                        error={isDup}
                        helperText={isDup
                          ? (existingNames.includes(row.displayName.trim().toLowerCase())
                            ? "Already exists"
                            : "Duplicate")
                          : ""}
                        sx={{ minWidth: 0 }}
                        inputProps={{ style: { fontSize: "0.85rem" } }}
                      />

                      {/* Team */}
                      <TextField
                        size="small"
                        placeholder="Team (optional)"
                        value={row.teamName}
                        onChange={e => updateBulkRow(i, "teamName", e.target.value)}
                        sx={{ minWidth: 0 }}
                        inputProps={{ style: { fontSize: "0.85rem" } }}
                      />

                      {/* Seed */}
                      <TextField
                        size="small"
                        placeholder="—"
                        type="number"
                        value={row.seed ?? ""}
                        onChange={e => updateBulkRow(i, "seed", e.target.value)}
                        inputProps={{ min: 1, style: { textAlign: "center", fontSize: "0.85rem" } }}
                        sx={{ minWidth: 0 }}
                      />

                      {/* Logo URL / Upload toggle */}
                      {row.logoMode === "url" ? (
                        <TextField
                          size="small"
                          placeholder="https://…"
                          value={row.logoUrl}
                          onChange={e => updateBulkRow(i, "logoUrl", e.target.value)}
                          sx={{ minWidth: 0 }}
                          inputProps={{ style: { fontSize: "0.82rem" } }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LinkIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title="Switch to file upload">
                                  <IconButton size="small" onClick={() => updateBulkRow(i, "logoMode", "upload")} edge="end">
                                    <CloudUpload sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ),
                          }}
                        />
                      ) : (
                        <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 0, overflow: "hidden" }}>
                          <Button
                            size="small"
                            variant={row.logoFile ? "contained" : "outlined"}
                            startIcon={<PhotoCamera sx={{ fontSize: 14 }} />}
                            onClick={() => fileInputRefs.current[i]?.click()}
                            sx={{ borderRadius: 2, flexShrink: 0, fontSize: "0.72rem", px: 1, py: 0.5,
                              ...(row.logoFile && { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }) }}
                          >
                            {row.logoFile ? "Change" : "Upload"}
                          </Button>
                          {row.logoFile && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1, fontSize: "0.7rem" }}>
                              {row.logoFile.name}
                            </Typography>
                          )}
                          <Tooltip title="Switch to URL input">
                            <IconButton size="small" onClick={() => updateBulkRow(i, "logoMode", "url")}>
                              <LinkIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            ref={el => fileInputRefs.current[i] = el}
                            onChange={e => handleBulkLogoFile(i, e.target.files[0])}
                          />
                        </Box>
                      )}

                      {/* Remove */}
                      <Tooltip title={bulkRows.length === 1 ? "Need at least one row" : "Remove row"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeBulkRow(i)}
                            disabled={bulkRows.length === 1}
                          >
                            <RemoveCircleOutline sx={{ fontSize: 18 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>

              {bulkSaving && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                    Adding participants… {bulkProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={bulkProgress} sx={{ borderRadius: 2 }} />
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                {bulkRows.filter(r => r.displayName.trim()).length} of {bulkRows.length} rows filled
                {bulkRows.some((r, i) => isDuplicateInBulk(r.displayName, i)) && (
                  <Typography component="span" variant="caption" color="error" sx={{ ml: 1, fontWeight: 700 }}>
                    · Duplicates found
                  </Typography>
                )}
              </Typography>
              <Box display="flex" gap={1}>
                <Button onClick={() => setParticipantDialog(false)} sx={{ color: "text.secondary" }} disabled={bulkSaving}>Cancel</Button>
                <Button variant="contained" onClick={saveBulkParticipants} disabled={bulkSaving}
                  sx={{ px: 4, borderRadius: 2, background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  {bulkSaving ? "Adding..." : `Add ${bulkRows.filter(r => r.displayName.trim()).length} Participant(s)`}
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Report Result Dialog ── */}
      <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        {/* Custom header */}
        <Box sx={{
          position: "relative",
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          color: "white",
          px: 3, py: 2.5,
          pr: 7,
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SportsSoccer sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                {selectedMatch?.isPlayed ? "Edit Result" : "Report Result"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                {selectedMatch?.isPlayed ? "Modify the recorded score" : "Enter the final score for this match"}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setReportDialog(false)}
            size="small"
            sx={{
              position: "absolute", top: 12, right: 12,
              color: "rgba(255,255,255,0.7)",
              bgcolor: "rgba(255,255,255,0.08)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.18)", color: "white" },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
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
              <Typography variant="body2" color="warning.main" fontWeight="bold">* Knockout matches must have a winner (no draws)</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "white", justifyContent: "center", gap: 2 }}>
          <Button onClick={() => setReportDialog(false)} sx={{ color: "text.secondary", fontWeight: "bold" }}>Cancel</Button>
          <Button variant="contained" onClick={submitReport} disabled={reporting}
            sx={{ px: 6, borderRadius: 2, fontWeight: "bold", background: "linear-gradient(to right,#6366f1,#8b5cf6)", "&:hover": { background: "linear-gradient(to right,#4f46e5,#7c3aed)" } }}>
            {reporting ? "Saving..." : "Confirm Result"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpecialTournamentAdminPage;
