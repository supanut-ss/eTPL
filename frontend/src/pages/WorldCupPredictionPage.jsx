import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  alpha,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Divider,
  Fade,
  Chip,
  Tooltip,
  CircularProgress,
  Autocomplete,
  Button,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import {
  SportsSoccer,
  EmojiEvents as TrophyIcon,
  Timer as TimerIcon,
  TimerOff as TimerOffIcon,
  AdminPanelSettings as AdminIcon,
  Search,
  CheckCircle,
  TrendingUp,
  Save,
  Edit,
  Delete as DeleteIcon,
  Login as LoginIcon,
  Stadium,
} from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";
import SEO from "../components/SEO";
import worldCupService from "../services/worldCupService";

// Complete list of FIFA World Cup 2026 Teams
const WORLD_CUP_TEAMS = [
  // AFC
  { name: "Japan", nameTh: "ญี่ปุ่น", emoji: "🇯🇵", code: "jp", group: "AFC" },
  { name: "South Korea", nameTh: "เกาหลีใต้", emoji: "🇰🇷", code: "kr", group: "AFC" },
  { name: "Iran", nameTh: "อิหร่าน", emoji: "🇮🇷", code: "ir", group: "AFC" },
  { name: "Australia", nameTh: "ออสเตรเลีย", emoji: "🇦🇺", code: "au", group: "AFC" },
  { name: "Saudi Arabia", nameTh: "ซาอุดีอาระเบีย", emoji: "🇸🇦", code: "sa", group: "AFC" },
  { name: "Iraq", nameTh: "อิรัก", emoji: "🇮🇶", code: "iq", group: "AFC" },
  { name: "Uzbekistan", nameTh: "อุซเบกิสถาน", emoji: "🇺🇿", code: "uz", group: "AFC" },
  { name: "Jordan", nameTh: "จอร์แดน", emoji: "🇯🇴", code: "jo", group: "AFC" },
  { name: "Qatar", nameTh: "กาตาร์", emoji: "🇶🇦", code: "qa", group: "AFC" },
  // CAF
  { name: "Morocco", nameTh: "โมร็อกโก", emoji: "🇲🇦", code: "ma", group: "CAF" },
  { name: "Senegal", nameTh: "เซเนกัล", emoji: "🇸🇳", code: "sn", group: "CAF" },
  { name: "Tunisia", nameTh: "ตูนิเซีย", emoji: "🇹🇳", code: "tn", group: "CAF" },
  { name: "Algeria", nameTh: "แอลจีเรีย", emoji: "🇩🇿", code: "dz", group: "CAF" },
  { name: "Egypt", nameTh: "อียิปต์", emoji: "🇪🇬", code: "eg", group: "CAF" },
  { name: "Nigeria", nameTh: "ไนจีเรีย", emoji: "🇳🇬", code: "ng", group: "CAF" },
  { name: "Cameroon", nameTh: "แคเมอรูน", emoji: "🇨🇲", code: "cm", group: "CAF" },
  { name: "Côte d'Ivoire", nameTh: "ไอวอรีโคสต์", emoji: "🇨🇮", code: "ci", group: "CAF" },
  { name: "Mali", nameTh: "มาลี", emoji: "🇲🇱", code: "ml", group: "CAF" },
  { name: "South Africa", nameTh: "แอฟริกาใต้", emoji: "🇿🇦", code: "za", group: "CAF" },
  { name: "Cape Verde", nameTh: "เคปเวิร์ด", emoji: "🇨🇻", code: "cv", group: "CAF" },
  // CONCACAF
  { name: "United States", nameTh: "สหรัฐอเมริกา", emoji: "🇺🇸", code: "us", group: "CONCACAF" },
  { name: "Mexico", nameTh: "เม็กซิโก", emoji: "🇲🇽", code: "mx", group: "CONCACAF" },
  { name: "Canada", nameTh: "แคนาดา", emoji: "🇨🇦", code: "ca", group: "CONCACAF" },
  { name: "Costa Rica", nameTh: "คอสตาริกา", emoji: "🇨🇷", code: "cr", group: "CONCACAF" },
  { name: "Panama", nameTh: "ปานามา", emoji: "🇵🇦", code: "pa", group: "CONCACAF" },
  { name: "Jamaica", nameTh: "จาเมกา", emoji: "🇯🇲", code: "jm", group: "CONCACAF" },
  { name: "Honduras", nameTh: "ฮอนดูรัส", emoji: "🇭🇳", code: "hn", group: "CONCACAF" },
  { name: "Curaçao", nameTh: "คูราเซา", emoji: "🇨🇼", code: "cw", group: "CONCACAF" },
  // CONMEBOL
  { name: "Argentina", nameTh: "อาร์เจนตินา", emoji: "🇦🇷", code: "ar", group: "CONMEBOL" },
  { name: "Brazil", nameTh: "บราซิล", emoji: "🇧🇷", code: "br", group: "CONMEBOL" },
  { name: "Uruguay", nameTh: "อุรุกวัย", emoji: "🇺🇾", code: "uy", group: "CONMEBOL" },
  { name: "Colombia", nameTh: "โคลอมเบีย", emoji: "🇨🇴", code: "co", group: "CONMEBOL" },
  { name: "Ecuador", nameTh: "เอกวาดอร์", emoji: "🇪🇨", code: "ec", group: "CONMEBOL" },
  { name: "Paraguay", nameTh: "ปารากวัย", emoji: "🇵🇾", code: "py", group: "CONMEBOL" },
  { name: "Chile", nameTh: "ชิลี", emoji: "🇨🇱", code: "cl", group: "CONMEBOL" },
  { name: "Venezuela", nameTh: "เวเนซุเอลา", emoji: "🇻🇪", code: "ve", group: "CONMEBOL" },
  // OFC
  { name: "New Zealand", nameTh: "นิวซีแลนด์", emoji: "🇳🇿", code: "nz", group: "OFC" },
  // UEFA
  { name: "France", nameTh: "ฝรั่งเศส", emoji: "🇫🇷", code: "fr", group: "UEFA" },
  { name: "England", nameTh: "อังกฤษ", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "gb-eng", group: "UEFA" },
  { name: "Spain", nameTh: "สเปน", emoji: "🇪🇸", code: "es", group: "UEFA" },
  { name: "Germany", nameTh: "เยอรมนี", emoji: "🇩🇪", code: "de", group: "UEFA" },
  { name: "Belgium", nameTh: "เบลเยียม", emoji: "🇧🇪", code: "be", group: "UEFA" },
  { name: "Portugal", nameTh: "โปรตุเกส", emoji: "🇵🇹", code: "pt", group: "UEFA" },
  { name: "Netherlands", nameTh: "เนเธอร์แลนด์", emoji: "🇳🇱", code: "nl", group: "UEFA" },
  { name: "Italy", nameTh: "อิตาลี", emoji: "🇮🇹", code: "it", group: "UEFA" },
  { name: "Croatia", nameTh: "โครเอเชีย", emoji: "🇭🇷", code: "hr", group: "UEFA" },
  { name: "Denmark", nameTh: "เดนมาร์ก", emoji: "🇩🇰", code: "dk", group: "UEFA" },
  { name: "Switzerland", nameTh: "สวิตเซอร์แลนด์", emoji: "🇨🇭", code: "ch", group: "UEFA" },
  { name: "Norway", nameTh: "นอร์เวย์", emoji: "🇳🇴", code: "no", group: "UEFA" },
  { name: "Scotland", nameTh: "สกอตแลนด์", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", code: "gb-sct", group: "UEFA" },
];

// Helper to render flag image
const getTeamFlag = (teamName) => {
  if (!teamName) return null;
  const team = WORLD_CUP_TEAMS.find(
    (t) =>
      t.name.toLowerCase() === teamName.toLowerCase() ||
      t.nameTh.toLowerCase() === teamName.toLowerCase()
  );
  if (!team || !team.code) return null;
  return (
    <Box
      component="img"
      src={`https://flagcdn.com/w40/${team.code.toLowerCase()}.png`}
      sx={{ width: 20, height: 14, objectFit: "cover", borderRadius: "1px", verticalAlign: "middle" }}
    />
  );
};

// Top Contenders highlighted for fast grid selection
const TOP_CONTENDERS = [
  "Argentina",
  "France",
  "Brazil",
  "England",
  "Spain",
  "Germany",
  "Portugal",
  "Netherlands",
  "Italy",
  "Uruguay",
];

const WorldCupPredictionPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [predictions, setPredictions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);

  const navigate = useNavigate();

  // Form selections
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [predictOpen, setPredictOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Admin controls state
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminDeadline, setAdminDeadline] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  const isAdmin = useMemo(() => {
    return user?.userLevel === "admin" || user?.userLevel === "moderator";
  }, [user]);

  // Load Initial API Data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await worldCupService.getPredictions();
      if (res.data?.success) {
        const payload = res.data.data;
        setPredictions(payload.predictions || []);
        setAllUsers(payload.allUsers || []);
        setDeadline(new Date(payload.deadline));
        setIsExpired(payload.isExpired);
        if (payload.deadline) {
          setAdminDeadline(payload.deadline.slice(0, 16)); // YYYY-MM-DDTHH:mm format for TextField datetime-local
        }
        if (payload.serverTime) {
          const serverTime = new Date(payload.serverTime);
          const clientTime = new Date();
          setTimeOffset(serverTime.getTime() - clientTime.getTime());
        }
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to load prediction data", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Detect current prediction of logged-in user
  const currentPrediction = useMemo(() => {
    if (!user) return null;
    return predictions.find((p) => p.userId === user.id);
  }, [user, predictions]);

  // Sync selected team with user's existing prediction
  useEffect(() => {
    if (currentPrediction) {
      const matchedTeam = WORLD_CUP_TEAMS.find(
        (t) =>
          t.name.toLowerCase() === currentPrediction.predictedTeam.toLowerCase() ||
          t.nameTh.toLowerCase() === currentPrediction.predictedTeam.toLowerCase()
      );
      if (matchedTeam) {
        setSelectedTeam(matchedTeam);
      } else {
        setSelectedTeam(null);
      }
    } else {
      setSelectedTeam(null);
    }
  }, [currentPrediction]);

  // Countdown Timer Calculation
  useEffect(() => {
    if (!deadline) return;

    const interval = setInterval(() => {
      const now = new Date().getTime() + timeOffset; // Synchronize with server time
      const distance = deadline.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, timeOffset]);

  // Analytics - Statistics logic
  const analyticsData = useMemo(() => {
    if (predictions.length === 0) return [];
    
    // Count predictions per country
    const counts = {};
    predictions.forEach((p) => {
      counts[p.predictedTeam] = (counts[p.predictedTeam] || 0) + 1;
    });

    // Map to list with details and sort descending
    return Object.keys(counts)
      .map((teamName) => {
        const teamInfo = WORLD_CUP_TEAMS.find(
          (t) =>
            t.name.toLowerCase() === teamName.toLowerCase() ||
            t.nameTh.toLowerCase() === teamName.toLowerCase()
        ) || {
          name: teamName,
          nameTh: teamName,
          emoji: "🏳️",
        };
        const count = counts[teamName];
        const percentage = Math.round((count / predictions.length) * 100);

        return {
          ...teamInfo,
          count,
          percentage,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [predictions]);

  // Search filter list
  const filteredPredictionsList = useMemo(() => {
    let list = predictions.map((p) => {
      const matchTeam = WORLD_CUP_TEAMS.find(
        (t) =>
          t.name.toLowerCase() === p.predictedTeam.toLowerCase() ||
          t.nameTh.toLowerCase() === p.predictedTeam.toLowerCase()
      );
      return {
        ...p,
        teamEmoji: matchTeam?.emoji || "🏳️",
        teamName: matchTeam?.name || p.predictedTeam,
      };
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.userIdString.toLowerCase().includes(term) ||
          p.lineName?.toLowerCase().includes(term) ||
          p.teamNickname?.toLowerCase().includes(term) ||
          p.currentTeam?.toLowerCase().includes(term) ||
          p.predictedTeam.toLowerCase().includes(term) ||
          p.teamName.toLowerCase().includes(term)
      );
    }

    // Sort by updated time descending
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [predictions, searchTerm]);

  // Handlers
  const handleSelectContender = (team) => {
    if (isExpired) return;
    setSelectedTeam(team);
  };

  const handleSubmit = async () => {
    if (!user) {
      enqueueSnackbar("Please log in before submitting your prediction", { variant: "warning" });
      return;
    }
    if (!selectedTeam) {
      enqueueSnackbar("Please select a team as the World Cup 2026 champion", { variant: "warning" });
      return;
    }
    if (isExpired) {
      enqueueSnackbar("Prediction deadline has passed", { variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await worldCupService.submitPrediction(selectedTeam.name);
      if (res.data?.success) {
        enqueueSnackbar("Prediction saved successfully! 🔥", {
          variant: "success",
        });
        loadData(); // Reload listings & statistics
        setPredictOpen(false); // Close dialog on success
      } else {
        enqueueSnackbar("Failed to save prediction", {
          variant: "error",
        });
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "An error occurred while saving your prediction";
      enqueueSnackbar(errMsg, { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrediction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this prediction?")) {
      return;
    }
    try {
      const res = await worldCupService.deletePrediction(id);
      if (res.data?.success) {
        enqueueSnackbar("Prediction deleted successfully", { variant: "success" });
        loadData();
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to delete prediction", { variant: "error" });
    }
  };

  const handleSaveDeadline = async () => {
    if (!adminDeadline) return;
    setAdminSaving(true);
    try {
      // Ensure adminDeadline is sliced to 16 characters (YYYY-MM-DDTHH:mm) before adding seconds and GMT+7 offset
      const formattedDate = adminDeadline.slice(0, 16);
      const isoOffsetString = `${formattedDate}:00+07:00`;
      const res = await worldCupService.updateDeadline(isoOffsetString);
      if (res.data?.success) {
        enqueueSnackbar("New deadline saved successfully", { variant: "success" });
        setAdminOpen(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to update prediction deadline", { variant: "error" });
    } finally {
      setAdminSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        pb: 10,
        pt: { xs: 2, sm: 2.5, lg: 3 },
        px: { xs: 1.5, sm: 2.5, lg: 3.5 },
        mx: { xs: -1.5, sm: -2.5, lg: -3.5 },
        mt: { xs: -2, sm: -2.5, lg: -3 },
        mb: { xs: -2, sm: -2.5, lg: -3 },
        background: "radial-gradient(circle at 50% 0%, #17153a 0%, #0a0b12 50%, #030408 100%)",
        color: "#f8fafc",
      }}
    >
      <SEO
        title="World Cup 2026 Champion Prediction"
        description="Predict the winner of the FIFA World Cup 2026 with eTPL members. Choose your favorite team and win rewards! You can change your prediction anytime before the group stage ends."
        keywords="World Cup 2026 prediction, FIFA World Cup 2026, eTPL, eFootball league prediction"
      />

      {/* Hero Banner Grid BG */}
      <Box
        sx={{
          position: "absolute",
          top: -150,
          right: -50,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(255,255,255,0) 70%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <Fade in={true} timeout={600}>
        <Box sx={{ position: "relative", zIndex: 1, px: { xs: 1, md: 2 }, maxWidth: 1400, mx: "auto" }}>
          {/* Header Layout */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
              mb: 4,
              px: { xs: 1, sm: 0 },
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Stadium sx={{ fontSize: 36, color: "#818cf8" }} />
              <Box>
                <Typography variant="h5" fontWeight="900" sx={{
                  background: "linear-gradient(90deg, #ffffff 0%, #cbd5e1 60%, #818cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  World Cup 2026 Champion Prediction
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  Predict the champion of the FIFA World Cup 2026 to earn bonus points and league perks.
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1.5}>
              {!isExpired && (
                user ? (
                  <Button
                    variant="contained"
                    onClick={() => setPredictOpen(true)}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: "bold",
                      px: 3,
                      py: 1,
                      bgcolor: "#6366f1",
                      color: "#ffffff",
                      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                      "&:hover": {
                        bgcolor: "#4f46e5"
                      },
                      animation: !currentPrediction ? "pulseSoccer 2s infinite ease-in-out" : "none",
                      "@keyframes pulseSoccer": {
                        "0%": { boxShadow: "0 0 0 0 rgba(99, 102, 241, 0.4)" },
                        "70%": { boxShadow: "0 0 0 8px rgba(99, 102, 241, 0)" },
                        "100%": { boxShadow: "0 0 0 0 rgba(99, 102, 241, 0)" }
                      }
                    }}
                    startIcon={<TrophyIcon />}
                  >
                    {currentPrediction ? "Edit Prediction" : "Predict Champion"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<LoginIcon />}
                    onClick={() => navigate("/login")}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: "bold",
                      px: 3,
                      py: 1,
                    }}
                  >
                    Log in to Predict
                  </Button>
                )
              )}

              {isAdmin && (
                <Button
                  variant="outlined"
                  startIcon={<AdminIcon />}
                  onClick={() => setAdminOpen(true)}
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 600,
                    color: "#94a3b8",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    "&:hover": {
                      borderColor: "rgba(255, 255, 255, 0.4)",
                      color: "#ffffff",
                    }
                  }}
                >
                  Admin Panel
                </Button>
              )}
            </Box>
          </Box>

          {/* Countdown & Status Banner */}
          <Box
            sx={{
              mb: 4,
              p: { xs: 2.5, md: 3 },
              borderRadius: "24px",
              background: isExpired
                ? "linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.02) 100%)"
                : "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.02) 100%)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
              border: "1px solid",
              borderColor: isExpired ? "rgba(244, 63, 94, 0.3)" : "rgba(99, 102, 241, 0.3)",
              backdropFilter: "blur(20px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={7}>
                <Box display="flex" alignItems="center" gap={2} mb={1}>
                  <Chip
                    icon={isExpired ? <TimerOffIcon /> : <TimerIcon />}
                    label={isExpired ? "Predictions Closed" : "Predictions Open"}
                    color={isExpired ? "error" : "success"}
                    sx={{ fontWeight: "bold", fontSize: 13 }}
                  />
                  <Typography variant="caption" color="rgba(255,255,255,0.6)">
                    Closes at the end of the group stage: {deadline?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </Typography>
                </Box>
                <Typography variant={isMobile ? "h6" : "h5"} fontWeight={900} color="white" lineHeight={1.2}>
                  {isExpired
                    ? "Predictions have closed! Let's see which country will conquer the World Cup 2026 🏆"
                    : "You can change your prediction as many times as you want until the deadline 🔄"}
                </Typography>
              </Grid>

              {!isExpired && (
                <Grid item xs={12} md={5}>
                  <Box
                    display="flex"
                    justifyContent={{ xs: "center", md: "flex-end" }}
                    gap={2}
                  >
                    {[
                      { val: timeLeft.days, label: "Days" },
                      { val: timeLeft.hours, label: "Hours" },
                      { val: timeLeft.minutes, label: "Minutes" },
                      { val: timeLeft.seconds, label: "Seconds" },
                    ].map((t, idx) => (
                      <Box key={idx} sx={{ textAlign: "center", minWidth: 64 }}>
                        <Box
                          sx={{
                            background: "rgba(99, 102, 241, 0.08)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(99, 102, 241, 0.2)",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                            borderRadius: "16px",
                            py: 1,
                            px: 1.5,
                            color: "white",
                            fontWeight: 900,
                            fontSize: { xs: 20, md: 24 },
                          }}
                        >
                          {String(t.val).padStart(2, "0")}
                        </Box>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" mt={0.5}>
                          {t.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Row 1: Popular Teams and groups image (Side-by-Side) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 2fr",
              },
              gap: 3,
              mb: 3,
              alignItems: "stretch",
            }}
          >
            {/* Column 1: Popularity Statistics */}
            <Card
              sx={{
                borderRadius: "24px",
                p: 2,
                height: "100%",
                background: "rgba(10, 14, 26, 0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                color: "#f8fafc",
              }}
            >
              <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1} sx={{ color: "#ffffff" }}>
                  <TrendingUp sx={{ color: "#818cf8" }} />
                  Popular Teams
                </Typography>
                <Typography variant="body2" sx={{ color: "#94a3b8", mb: 3 }}>
                  Prediction statistics of league members ({predictions.length} members)
                </Typography>

                {analyticsData.length === 0 ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    flexGrow={1}
                    py={8}
                    sx={{ opacity: 0.5 }}
                  >
                    <SportsSoccer sx={{ fontSize: 60, mb: 1, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.disabled">
                      No predictions submitted yet
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2.5} sx={{ flexGrow: 1 }}>
                    {analyticsData.slice(0, 8).map((data, idx) => (
                      <Box key={data.name}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTeamFlag(data.name)}
                            <Typography variant="body1" fontWeight={idx === 0 ? 800 : 500} sx={{ ml: 0.5, color: "#ffffff" }}>
                              {data.name}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: "#818cf8" }}>
                            {data.count} members ({data.percentage}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={data.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "rgba(255, 255, 255, 0.08)",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                              background:
                                idx === 0
                                  ? "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)"
                                  : "#6366f1",
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Column 2: World Cup 2026 Groups Image (Edge-to-Edge) */}
            <Card
              onClick={() => setImagePreviewOpen(true)}
              sx={{
                borderRadius: "24px",
                height: "100%",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                cursor: "pointer",
                bgcolor: "#000000",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "0 12px 32px rgba(99, 102, 241, 0.3)",
                },
              }}
            >
              <Box
                component="img"
                src="https://digitalhub.fifa.com/transform/1a4a6303-888e-48e7-bc0d-d325f7a94a69/All-FIFA-World-Cup-2026-groups-complete-4x3?focuspoint=0.5,0.39&io=transform:fill,width:1024&quality=75"
                alt="FIFA World Cup 2026 Groups Table"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Card>
          </Box>

          {/* Row 2: All Predictions summary table */}
          <Box sx={{ mb: 3 }}>
            <Card
              sx={{
                borderRadius: "24px",
                p: 2,
                background: "rgba(10, 14, 26, 0.75)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(99, 102, 241, 0.15)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                color: "#f8fafc",
              }}
            >
              <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", p: { xs: 1, sm: 2 } }}>
                <Box
                  display="flex"
                  flexDirection={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  gap={2}
                  mb={3}
                >
                  <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center" gap={1} sx={{ color: "#ffffff" }}>
                    <TrophyIcon sx={{ color: "#818cf8" }} />
                    All Predictions
                  </Typography>

                  <TextField
                    size="small"
                    placeholder="Search member..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                      width: { xs: "100%", sm: 220 },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: "rgba(5, 7, 12, 0.8)",
                        color: "#ffffff",
                        "& fieldset": { borderColor: "rgba(99, 102, 241, 0.2)" },
                        "&:hover fieldset": { borderColor: "rgba(99, 102, 241, 0.4)" },
                        "&.Mui-focused fieldset": { borderColor: "#818cf8" },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {filteredPredictionsList.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <Search sx={{ fontSize: 60, color: "text.disabled", opacity: 0.2, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No predictions match your search
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(99, 102, 241, 0.15)", background: "rgba(8, 10, 18, 0.85)" }}>
                          <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>User ID</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>Line Name</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>Current Team</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>Predicted Champion</th>
                          <th style={{ padding: "12px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>Predicted Date</th>
                          {isAdmin && (
                            <th style={{ padding: "12px 16px", textAlign: "center", color: "#94a3b8", fontWeight: 700, fontSize: "0.85rem" }}>Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPredictionsList.map((row, idx) => (
                          <tr
                            key={row.id}
                            style={{
                              borderBottom: idx === filteredPredictionsList.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.03)",
                              backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(99, 102, 241, 0.02)",
                            }}
                          >
                            <td style={{ padding: "12px 16px" }}>
                              <Typography variant="body2" fontWeight={600} sx={{ color: "#ffffff" }}>
                                {row.userIdString || "-"}
                              </Typography>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <Box display="flex" alignItems="center" gap={1.5}>
                                <Avatar src={row.linePic || ""} sx={{ width: 28, height: 28 }} />
                                <Typography variant="body2" fontWeight={600} sx={{ color: "#ffffff" }}>
                                  {row.lineName || "-"}
                                </Typography>
                              </Box>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                                {row.currentTeam || "-"}
                              </Typography>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "left" }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                {(() => {
                                  const matchTeam = WORLD_CUP_TEAMS.find(
                                    (t) =>
                                      t.name.toLowerCase() === row.predictedTeam.toLowerCase() ||
                                      t.nameTh.toLowerCase() === row.predictedTeam.toLowerCase()
                                  );
                                  if (!matchTeam || !matchTeam.code) return null;
                                  return (
                                    <Box
                                      component="img"
                                      src={`https://flagcdn.com/w40/${matchTeam.code.toLowerCase()}.png`}
                                      sx={{ width: 18, height: 12, objectFit: "cover", borderRadius: "1px" }}
                                    />
                                  );
                                })()}
                                <Typography variant="body2" fontWeight={600} sx={{ color: "#818cf8" }}>
                                  {row.teamName}
                                </Typography>
                              </Box>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "left" }}>
                              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)" }}>
                                {new Date(row.updatedAt).toLocaleString("en-US")}
                              </Typography>
                            </td>
                            {isAdmin && (
                              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeletePrediction(row.id)}
                                  title="Delete Prediction"
                                  sx={{ color: "rgba(239, 68, 68, 0.7)", "&:hover": { color: "#ef4444" } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Fade>

      {/* Prediction Dialog (Popup) */}
      <Dialog
        open={predictOpen}
        onClose={() => setPredictOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            p: 1,
            bgcolor: "#070a13",
            color: "#ffffff",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)"
          }
        }}
      >
        <DialogTitle display="flex" alignItems="center" gap={1.5} sx={{ pb: 1 }}>
          <SportsSoccer sx={{ fontSize: 28, color: "#818cf8" }} />
          <Box>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
              FIFA World Cup 2026 Champion Prediction
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Predict the champion under your member account
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 3, borderColor: "rgba(255, 255, 255, 0.08)" }}>
          {user && (
            <Box display="flex" flexDirection="column" gap={3}>
              {/* Member Profile Display */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "16px",
                  bgcolor: "rgba(99, 102, 241, 0.03)",
                  border: "1px solid rgba(99, 102, 241, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Avatar src={user.linePic || ""} sx={{ width: 44, height: 44 }} />
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {user.userId}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    {user.lineName || "eTPL Member"} ({user.currentTeam || "-"})
                  </Typography>
                </Box>
              </Box>

              {/* Current Prediction Display */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "16px",
                  bgcolor: currentPrediction ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)",
                  border: "1px solid",
                  borderColor: currentPrediction ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)" }} display="block">
                    Your Current Prediction
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {currentPrediction ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        Predicted:{" "}
                        <Box component="span" sx={{ color: "success.main", display: "inline-flex", alignItems: "center", gap: 1 }}>
                          {getTeamFlag(currentPrediction.predictedTeam)}
                          {WORLD_CUP_TEAMS.find((t) => t.name === currentPrediction.predictedTeam)?.name ||
                            currentPrediction.predictedTeam}
                        </Box>
                      </span>
                    ) : (
                      <span style={{ color: theme.palette.warning.main }}>No prediction submitted yet</span>
                    )}
                  </Typography>
                </Box>
                {currentPrediction && (
                  <Chip
                    icon={<CheckCircle />}
                    label="Saved"
                    color="success"
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  />
                )}
              </Box>

              {/* Country Selection */}
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="body2" fontWeight="600">
                    Select the country you predict to win
                  </Typography>
                  {selectedTeam && (
                    <Chip
                      icon={
                        <Box
                          component="img"
                          src={`https://flagcdn.com/w40/${selectedTeam.code?.toLowerCase()}.png`}
                          sx={{ width: 18, height: 12, objectFit: "cover", borderRadius: "1px", ml: "8px !important" }}
                        />
                      }
                      label={`Selected: ${selectedTeam.name}`}
                      color="primary"
                      size="small"
                      onDelete={() => setSelectedTeam(null)}
                      disabled={isExpired}
                    />
                  )}
                </Box>

                {/* Autocomplete for complete 48 teams */}
                <Autocomplete
                  options={WORLD_CUP_TEAMS}
                  getOptionLabel={(option) => option.name}
                  value={selectedTeam}
                  onChange={(event, newValue) => setSelectedTeam(newValue)}
                  disabled={isExpired}
                  sx={{ mb: 3 }}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: "#070a13",
                        color: "#ffffff",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        "& .MuiAutocomplete-option": {
                          "&:hover": {
                            bgcolor: "rgba(99, 102, 241, 0.1)",
                          },
                          '&[aria-selected="true"]': {
                            bgcolor: "rgba(99, 102, 241, 0.25)",
                            "&:hover": {
                              bgcolor: "rgba(99, 102, 241, 0.35)",
                            },
                          },
                        },
                      },
                    },
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        component="img"
                        loading="lazy"
                        width="20"
                        height="14"
                        src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
                        alt={option.name}
                        sx={{ objectFit: "cover", borderRadius: "1px", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
                      />
                      {option.name}
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search country..."
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                          bgcolor: "rgba(5, 7, 12, 0.8)",
                          color: "#ffffff",
                          "& fieldset": { borderColor: "rgba(99, 102, 241, 0.2)" },
                          "&:hover fieldset": { borderColor: "rgba(99, 102, 241, 0.4)" },
                          "&.Mui-focused fieldset": { borderColor: "#818cf8" },
                        },
                      }}
                    />
                  )}
                />

                {/* Hot Contenders Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(2, 1fr)",
                      sm: "repeat(5, 1fr)",
                    },
                    gap: 1.5,
                  }}
                >
                  {WORLD_CUP_TEAMS.filter((t) => TOP_CONTENDERS.includes(t.name)).map((t) => {
                    const isSelected = selectedTeam?.name === t.name;
                    return (
                      <Box
                        key={t.name}
                        onClick={() => handleSelectContender(t)}
                        sx={{
                          border: "1.5px solid",
                          borderColor: isSelected
                            ? "#818cf8"
                            : "rgba(99, 102, 241, 0.15)",
                          borderRadius: "14px",
                          p: 1.2,
                          textAlign: "center",
                          cursor: isExpired ? "default" : "pointer",
                          bgcolor: isSelected
                            ? "rgba(99, 102, 241, 0.15)"
                            : "rgba(255, 255, 255, 0.02)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            borderColor: isExpired ? "none" : "#818cf8",
                            bgcolor: isExpired
                              ? "rgba(255, 255, 255, 0.02)"
                              : isSelected
                              ? "rgba(99, 102, 241, 0.15)"
                              : "rgba(255, 255, 255, 0.05)",
                          },
                        }}
                      >
                        <Box display="flex" justifyContent="center" sx={{ mb: 1, mt: 0.5 }}>
                          <Box
                            component="img"
                            src={`https://flagcdn.com/w40/${t.code.toLowerCase()}.png`}
                            alt={t.name}
                            sx={{
                              width: 32,
                              height: 21,
                              objectFit: "cover",
                              borderRadius: "1.5px",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                            }}
                          />
                        </Box>
                        <Typography variant="caption" fontWeight="bold" noWrap display="block">
                          {t.name}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "rgba(5, 7, 12, 0.5)", borderTop: "1px solid rgba(99, 102, 241, 0.2)" }}>
          <Button onClick={() => setPredictOpen(false)} variant="text" sx={{ textTransform: "none", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)", "&:hover": { color: "#ffffff" } }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isExpired || submitting || !selectedTeam}
            startIcon={submitting ? <CircularProgress size={18} /> : <CheckCircle />}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px", px: 3, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
          >
            {currentPrediction ? "Save Changes" : "Save Prediction"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Settings Dialog */}
      <Dialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { 
            borderRadius: "24px", 
            p: 1, 
            bgcolor: "#070a13", 
            color: "#ffffff", 
            border: "1px solid rgba(99, 102, 241, 0.25)",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)"
          }
        }}
      >
        <DialogTitle display="flex" alignItems="center" gap={1}>
          <AdminIcon sx={{ color: "#818cf8" }} />
          Edit Prediction Deadline (Admin)
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
              Update the official deadline for World Cup 2026 champion predictions.
            </Typography>
            <TextField
              label="End Date & Time (Local Time)"
              type="datetime-local"
              value={adminDeadline}
              onChange={(e) => setAdminDeadline(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "rgba(5, 7, 12, 0.8)",
                  color: "#ffffff",
                  "& fieldset": { borderColor: "rgba(99, 102, 241, 0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(99, 102, 241, 0.4)" },
                  "&.Mui-focused fieldset": { borderColor: "#818cf8" },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255, 255, 255, 0.6)",
                  "&.Mui-focused": { color: "#818cf8" }
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "rgba(15, 23, 42, 0.4)", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Button onClick={() => setAdminOpen(false)} variant="text" sx={{ textTransform: "none", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)", "&:hover": { color: "#ffffff" } }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveDeadline}
            variant="contained"
            disabled={adminSaving}
            startIcon={adminSaving ? <CircularProgress size={18} /> : <Save />}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px", bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Groups Image Preview Dialog */}
      <Dialog
        open={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: "24px", 
            overflow: "hidden", 
            p: 0.5, 
            bgcolor: "#070a13", 
            border: "1px solid rgba(99, 102, 241, 0.25)",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)"
          }
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Box
            component="img"
            src="https://digitalhub.fifa.com/transform/1a4a6303-888e-48e7-bc0d-d325f7a94a69/All-FIFA-World-Cup-2026-groups-complete-4x3?focuspoint=0.5,0.39&io=transform:fill,width:1024&quality=75"
            alt="FIFA World Cup 2026 Groups Fullscreen"
            sx={{ width: "100%", height: "auto", display: "block" }}
          />
          <IconButton
            onClick={() => setImagePreviewOpen(false)}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              color: "#ffffff",
              bgcolor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.75)" },
            }}
          >
            <Typography variant="body2" fontWeight="bold" px={0.5}>✕</Typography>
          </IconButton>
        </Box>
      </Dialog>
    </Box>
  );
};

export default WorldCupPredictionPage;
