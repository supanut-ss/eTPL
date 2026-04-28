import { useState, useEffect } from "react";
import { getLogoUrl } from "../utils/imageUtils";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  useMediaQuery,
  useTheme,
  Avatar,
  Stack,
  IconButton,
} from "@mui/material";
import {
  SportsSoccer,
  StyleOutlined,
  SquareRounded,
  EditNote,
  Close,
} from "@mui/icons-material";
import {
  reportFixtureResult,
  editFixtureResult,
  getFixtureDetail,
} from "../api/fixtureReportApi";

const CardInput = ({ label, color, value, onChange }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      p: 1.5,
      px: 2,
      borderRadius: 2,
      bgcolor: "white",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      width: "100%",
    }}
  >
    <SquareRounded sx={{ color, fontSize: 20 }} />
    <Typography variant="body2" fontWeight="700" color="text.secondary" sx={{ flex: 1 }}>
      {label}
    </Typography>
    <TextField
      type="number"
      size="small"
      variant="standard"
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      inputProps={{ min: 0 }}
      InputProps={{
        disableUnderline: true,
        sx: {
          fontWeight: "800",
          fontSize: 18,
          width: 40,
          "& input": { textAlign: "right" },
        },
      }}
    />
  </Box>
);

const ScoreInput = ({ label, value, onChange }) => (
  <Box sx={{ textAlign: "center" }}>
    <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
      {label}
    </Typography>
    <Box
      sx={{
        bgcolor: "white",
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        px: 2,
        py: 0.5,
      }}
    >
      <TextField
        type="number"
        variant="standard"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        inputProps={{ min: 0 }}
        InputProps={{
          disableUnderline: true,
          sx: {
            fontSize: "2.5rem",
            fontWeight: "900",
            width: 60,
            "& input": { textAlign: "center", p: 0 },
          },
        }}
      />
    </Box>
  </Box>
);




const extractPlayer = (team) => {
  if (!team) return "";
  const match = team.match(/\(([^)]+)\)/);
  return match ? match[1] : team;
};

const ReportResultDialog = ({ open, fixture, isAdmin, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeYellow, setHomeYellow] = useState(0);
  const [homeRed, setHomeRed] = useState(0);
  const [awayYellow, setAwayYellow] = useState(0);
  const [awayRed, setAwayRed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditMode =
    isAdmin && fixture?.homeScore != null && fixture?.awayScore != null;

  // Pre-fill scores when admin opens an already-played fixture
  useEffect(() => {
    if (open && fixture) {
      if (isAdmin && fixture.homeScore != null && fixture.awayScore != null) {
        setHomeScore(fixture.homeScore ?? 0);
        setAwayScore(fixture.awayScore ?? 0);
        // fetch yellow/red from detail endpoint (VFixtureAll view doesn't have these columns)
        getFixtureDetail(fixture.fixtureId)
          .then((res) => {
            const d = res.data?.data ?? {};
            setHomeYellow(d.homeYellow ?? 0);
            setHomeRed(d.homeRed ?? 0);
            setAwayYellow(d.awayYellow ?? 0);
            setAwayRed(d.awayRed ?? 0);
          })
          .catch(() => {
            setHomeYellow(0);
            setHomeRed(0);
            setAwayYellow(0);
            setAwayRed(0);
          });
      } else {
        setHomeScore(0);
        setAwayScore(0);
        setHomeYellow(0);
        setHomeRed(0);
        setAwayYellow(0);
        setAwayRed(0);
      }
      setError("");
    }
  }, [open, fixture, isAdmin]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    if (homeScore < 0 || awayScore < 0 || homeYellow < 0 || homeRed < 0 || awayYellow < 0 || awayRed < 0) {
      setError("คะแนนและจำนวนบัตรห้ามติดลบ");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        homeScore,
        awayScore,
        homeYellow,
        homeRed,
        awayYellow,
        awayRed,
      };
      if (isEditMode) {
        await editFixtureResult(fixture.fixtureId, payload);
      } else {
        await reportFixtureResult(fixture.fixtureId, payload);
      }
      handleClose();
      onSuccess();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Save failed, please try again";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!fixture) return null;

  const homeName = extractPlayer(fixture.home);
  const awayName = extractPlayer(fixture.away);

  const resultColor =
    homeScore > awayScore
      ? "success.main"
      : homeScore < awayScore
        ? "error.main"
        : "text.secondary";

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth 
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 4,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          background: "linear-gradient(to right, #1e293b, #334155)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          {isEditMode ? (
            <EditNote sx={{ fontSize: 28, color: "#fbbf24" }} />
          ) : (
            <SportsSoccer sx={{ fontSize: 28 }} />
          )}
          <Box>
            <Typography variant="h6" fontWeight="900" sx={{ letterSpacing: 0.5, lineHeight: 1.2 }}>
              {isEditMode ? "EDIT MATCH RESULT" : "REPORT MATCH RESULT"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: "700" }}>
              MATCH #{fixture.match} · {fixture.division} · SEASON {fixture.season}
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={handleClose} 
          sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "white" } }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", overflowY: "auto" }}>
        {error && (
          <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Teams & Score Section */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: { xs: 2, md: 4 },
            mb: 6,
            mt: 1,
          }}
        >
          {/* Home */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Avatar
              src={getLogoUrl(fixture.homeTeamName)}
              sx={{
                width: { xs: 64, md: 80 },
                height: { xs: 64, md: 80 },
                mx: "auto",
                mb: 2,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                bgcolor: "white",
                border: "4px solid white",
                "& img": { objectFit: "contain", p: 1 },
              }}
            >
              H
            </Avatar>
            <Typography variant="subtitle1" fontWeight="900" color="text.primary" noWrap>
              {homeName}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ display: "block" }} noWrap>
              {fixture.homeTeamName || "HOME TEAM"}
            </Typography>
          </Box>

          {/* Score Inputs */}
          <Box display="flex" alignItems="center" gap={2}>
            <ScoreInput label="HOME" value={homeScore} onChange={setHomeScore} />
            <Typography variant="h4" fontWeight="900" color="grey.300" sx={{ mt: 3 }}>
              :
            </Typography>
            <ScoreInput label="AWAY" value={awayScore} onChange={setAwayScore} />
          </Box>

          {/* Away */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Avatar
              src={getLogoUrl(fixture.awayTeamName)}
              sx={{
                width: { xs: 64, md: 80 },
                height: { xs: 64, md: 80 },
                mx: "auto",
                mb: 2,
                boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                bgcolor: "white",
                border: "4px solid white",
                "& img": { objectFit: "contain", p: 1 },
              }}
            >
              A
            </Avatar>
            <Typography variant="subtitle1" fontWeight="900" color="text.primary" noWrap>
              {awayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ display: "block" }} noWrap>
              {fixture.awayTeamName || "AWAY TEAM"}
            </Typography>
          </Box>
        </Box>

        {/* Cards Section */}
        <Box sx={{ bgcolor: "rgba(0,0,0,0.02)", p: 3, borderRadius: 4, border: "1px dashed", borderColor: "divider" }}>
          <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ display: "block", mb: 2, textAlign: "center", letterSpacing: 2 }}>
            DISCIPLINARY RECORDS (CARDS)
          </Typography>
          
          <Box display="flex" gap={3} flexDirection={isMobile ? "column" : "row"}>
            {/* Home Cards */}
            <Stack spacing={1.5} flex={1}>
              <CardInput label="Yellow" color="#f59e0b" value={homeYellow} onChange={setHomeYellow} />
              <CardInput label="Red" color="#ef4444" value={homeRed} onChange={setHomeRed} />
            </Stack>

            <Divider orientation={isMobile ? "horizontal" : "vertical"} flexItem sx={{ opacity: 0.5 }} />

            {/* Away Cards */}
            <Stack spacing={1.5} flex={1}>
              <CardInput label="Yellow" color="#f59e0b" value={awayYellow} onChange={setAwayYellow} />
              <CardInput label="Red" color="#ef4444" value={awayRed} onChange={setAwayRed} />
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 4, bgcolor: "white", justifyContent: "center", gap: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={saving} 
          sx={{ px: 4, borderRadius: 2, fontWeight: "bold", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{
            px: 6,
            py: 1.2,
            borderRadius: 2.5,
            fontWeight: "900",
            fontSize: "1rem",
            background: isEditMode 
              ? "linear-gradient(to right, #f59e0b, #d97706)"
              : "linear-gradient(to right, #2563eb, #3b82f6)",
            boxShadow: isEditMode
              ? "0 4px 12px rgba(217, 119, 6, 0.3)"
              : "0 4px 12px rgba(37, 99, 235, 0.3)",
            "&:hover": {
              opacity: 0.9,
            },
          }}
          startIcon={
            saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : isEditMode ? (
              <EditNote />
            ) : (
              <SportsSoccer />
            )
          }
        >
          {saving ? "SAVING..." : isEditMode ? "SAVE CHANGES" : "CONFIRM RESULT"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportResultDialog;
