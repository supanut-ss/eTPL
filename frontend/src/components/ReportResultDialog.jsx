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
} from "@mui/material";
import {
  SportsSoccer,
  StyleOutlined,
  SquareRounded,
  EditNote,
} from "@mui/icons-material";
import {
  reportFixtureResult,
  editFixtureResult,
  getFixtureDetail,
} from "../api/fixtureReportApi";

const CardInput = ({ label, color, value, onChange }) => (
  <Box display="flex" alignItems="center" gap={1}>
    <SquareRounded sx={{ color, fontSize: 18 }} />
    <Typography fontSize={14} color="text.secondary" sx={{ minWidth: 90 }}>
      {label}
    </Typography>
    <TextField
      type="number"
      size="small"
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      inputProps={{ min: 0, style: { textAlign: "center", width: 56 } }}
      sx={{ width: 80 }}
    />
  </Box>
);

const ScoreInput = ({ label, value, onChange }) => (
  <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
    <Typography variant="caption" color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
    <TextField
      type="number"
      size="small"
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      inputProps={{
        min: 0,
        style: {
          textAlign: "center",
          fontSize: 28,
          fontWeight: 700,
          width: 56,
        },
      }}
      sx={{ width: 88 }}
    />
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          {isEditMode ? (
            <EditNote sx={{ color: "warning.main" }} />
          ) : (
            <SportsSoccer color="primary" />
          )}
          <Typography fontWeight={700} fontSize={17}>
            {isEditMode ? "Edit Match Result" : "Report Match Result"}
          </Typography>
          {isEditMode && (
            <Chip
              label="Edit Mode"
              size="small"
              color="warning"
              icon={<EditNote />}
              sx={{ ml: 0.5 }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Match #{fixture.match} · {fixture.division}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Teams & Score */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          mb={3}
          mt={1}
        >
          {/* Home */}
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={0.5}
            flex={1}
          >
            <Box
              component="img"
              src={getLogoUrl(fixture.homeTeamName)}
              alt={fixture.homeTeamName}
              onError={(e) => {
                e.target.style.display = "none";
              }}
              sx={{ width: 48, height: 48, objectFit: "contain" }}
            />
            <Typography
              fontSize={14}
              fontWeight={600}
              textAlign="center"
              noWrap
            >
              {homeName}
            </Typography>
          </Box>

          {/* Score inputs */}
          <Box display="flex" alignItems="center" gap={1}>
            <ScoreInput
              label="Home"
              value={homeScore}
              onChange={setHomeScore}
            />
            <Typography
              fontSize={22}
              fontWeight={700}
              color={resultColor}
              sx={{ mt: 2.5 }}
            >
              -
            </Typography>
            <ScoreInput
              label="Away"
              value={awayScore}
              onChange={setAwayScore}
            />
          </Box>

          {/* Away */}
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={0.5}
            flex={1}
          >
            <Box
              component="img"
              src={getLogoUrl(fixture.awayTeamName)}
              alt={fixture.awayTeamName}
              onError={(e) => {
                e.target.style.display = "none";
              }}
              sx={{ width: 48, height: 48, objectFit: "contain" }}
            />
            <Typography
              fontSize={14}
              fontWeight={600}
              textAlign="center"
              noWrap
            >
              {awayName}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Cards */}
        <Box display="flex" gap={4} justifyContent="center" flexWrap="wrap">
          {/* Home Cards */}
          <Box>
            <Typography
              fontSize={13}
              fontWeight={700}
              color="text.secondary"
              mb={1}
            >
              {homeName} — Cards
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <CardInput
                label="Yellow"
                color="#f59e0b"
                value={homeYellow}
                onChange={setHomeYellow}
              />
              <CardInput
                label="Red"
                color="#ef4444"
                value={homeRed}
                onChange={setHomeRed}
              />
            </Box>
          </Box>

          <Divider orientation={isMobile ? "horizontal" : "vertical"} flexItem sx={{ my: isMobile ? 2 : 0 }} />

          {/* Away Cards */}
          <Box>
            <Typography
              fontSize={13}
              fontWeight={700}
              color="text.secondary"
              mb={1}
            >
              {awayName} — Cards
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <CardInput
                label="Yellow"
                color="#f59e0b"
                value={awayYellow}
                onChange={setAwayYellow}
              />
              <CardInput
                label="Red"
                color="#ef4444"
                value={awayRed}
                onChange={setAwayRed}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isEditMode ? "warning" : "primary"}
          onClick={handleSave}
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : isEditMode ? (
              <EditNote />
            ) : (
              <SportsSoccer />
            )
          }
        >
          {saving
            ? isEditMode
              ? "Saving..."
              : "Saving..."
            : isEditMode
              ? "Save Changes"
              : "Save Result"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportResultDialog;
