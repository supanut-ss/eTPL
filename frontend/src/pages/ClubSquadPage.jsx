import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Autocomplete,
  TextField,
  LinearProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Slide,
  useMediaQuery,
  useTheme,
  InputAdornment
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import {
  Groups,
  AccountBalanceWallet,
  Diversity3,
  Search,
  People,
  LocalOffer,
  Close,
  Handshake,
  AccountBalance
} from "@mui/icons-material";
import { checkMarketOpen } from "../utils/marketUtils";
import auctionService from "../services/auctionService";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import { getPlayerFaceUrl, getPesdbInfoUrl, getPlayerCardUrl } from "../utils/imageUtils";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const GRADE_STYLE_MAP = {
  S: { color: "#ffb300", bg: "rgba(255,179,0,0.15)" },
  A: { color: "#f4511e", bg: "rgba(244,81,30,0.15)" },
  B: { color: "#8e24aa", bg: "rgba(142,36,170,0.15)" },
  C: { color: "#1e88e5", bg: "rgba(30,136,229,0.15)" },
  D: { color: "#43a047", bg: "rgba(67,160,71,0.15)" },
  E: { color: "#757575", bg: "rgba(117,117,117,0.15)" },
  DEFAULT: { color: "#9e9e9e", bg: "rgba(158,158,158,0.12)" },
};

const POSITION_GROUP_STYLE = {
  GK: {
    bg: "rgba(56, 189, 248, 0.22)",
    border: "rgba(125, 211, 252, 0.45)",
    label: "#dbeafe",
  },
  DEF: {
    bg: "rgba(129, 140, 248, 0.2)",
    border: "rgba(165, 180, 252, 0.45)",
    label: "#e0e7ff",
  },
  MID: {
    bg: "rgba(16, 185, 129, 0.2)",
    border: "rgba(110, 231, 183, 0.45)",
    label: "#d1fae5",
  },
  ATT: {
    bg: "rgba(244, 114, 182, 0.2)",
    border: "rgba(251, 182, 206, 0.45)",
    label: "#ffe4f0",
  },
};

const positionGroups = [
  ["GK"],
  ["CB", "RB", "LB"],
  ["DMF", "CMF", "RMF", "LMF", "AMF"],
  ["LWF", "RWF", "SS", "CF"],
];

const getPositionGroup = (pos) => {
  if (positionGroups[0].includes(pos)) return "GK";
  if (positionGroups[1].includes(pos)) return "DEF";
  if (positionGroups[2].includes(pos)) return "MID";
  if (positionGroups[3].includes(pos)) return "ATT";
  return "MID"; // fallback
};

const PlayerAvatar = ({ playerId }) => {
  const [src, setSrc] = useState(getPlayerFaceUrl(playerId, "png"));
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (!failed) {
      setSrc(getPlayerFaceUrl(playerId, "webp"));
      setFailed(true);
    }
  };

  return (
    <Avatar
      src={src}
      variant="rounded"
      imgProps={{ referrerPolicy: "no-referrer" }}
      sx={{ 
        width: 64, 
        height: 64, 
        bgcolor: "transparent"
      }}
      imgProps={{
        onError: handleError,
        referrerPolicy: "no-referrer"
      }}
    />
  );
};

// New Component for Player Cards with Fallback
const PlayerCard = ({ playerId, playerName, sx = {} }) => {
  const [src, setSrc] = useState(getPlayerCardUrl(playerId));
  const [status, setStatus] = useState("loading"); // loading, success, fallback

  const handleCardError = () => {
    // We stay true to the Card request, no face fallback
    setStatus("error");
  };

  return (
    <Box sx={{ 
      position: "relative", 
      width: "100%", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      overflow: 'visible',
      ...sx 
    }}>
      <Avatar
        src={src}
        variant="rounded"
        imgProps={{
          onError: handleCardError,
          referrerPolicy: "no-referrer",
          style: { 
            objectFit: "contain",
            width: "100%",
            height: "100%",
            filter: status === "error" ? "grayscale(1) opacity(0.3)" : "none"
          }
        }}
        sx={{
          width: "100%",
          height: "100%",
          bgcolor: "transparent",
          borderRadius: 0,
          overflow: "visible",
          "& .MuiAvatar-img": {
             transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
             opacity: status === "loading" && !src ? 0 : 1,
             objectFit: "contain"
          }
        }}
      >
         {!src && <People sx={{ fontSize: 60, opacity: 0.1 }} />}
      </Avatar>
      
      {/* Decorative Card Glow for premium feel */}
      {status !== "fallback" && (
          <Box sx={{
              position: 'absolute',
              inset: -10,
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              zIndex: -1,
              pointerEvents: 'none'
          }} />
      )}
    </Box>
  );
};

const ClubSquadPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [squadData, setSquadData] = useState({ squad: [], quotas: [] });
  const [loading, setLoading] = useState(true);
  const [squadLoading, setSquadLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  // Negotiation States
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedPlayer, setTargetPlayer] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerType, setOfferType] = useState("Transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    if (currentUser) {
      fetchClubs();
    }
  }, [currentUser]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getClubs();
      const rawList = (res?.data || res) || [];
      
      const filteredList = Array.isArray(rawList) ? rawList.filter(c => c.userId !== currentUser?.userId) : [];
      setClubs(filteredList);

      // Fetch Market Summary & Wallet
      const [sumRes, walletRes] = await Promise.all([
        auctionService.getSummary(),
        auctionService.getWallet()
      ]);
      setSummary(sumRes?.data || sumRes);
      setWallet(walletRes?.data || walletRes);
      setUserBalance((walletRes?.data?.availableBalance ?? walletRes?.availableBalance) || 0);
      
      // Handle auto-selection from URL parameter
      const targetUserId = searchParams.get("userId");
      if (targetUserId) {
        const targetClub = filteredList.find(c => c.userId === targetUserId);
        if (targetClub) {
          setSelectedClub(targetClub);
          fetchSquad(targetClub.userId);
        } else if (filteredList.length > 0) {
          setSelectedClub(filteredList[0]);
          fetchSquad(filteredList[0].userId);
        }
      } else if (filteredList.length > 0) {
        setSelectedClub(filteredList[0]);
        fetchSquad(filteredList[0].userId);
      }
    } catch (err) {
      console.error("Fetch clubs error:", err);
      enqueueSnackbar("Failed to fetch club list", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSquad = async (userStrId) => {
    try {
      setSquadLoading(true);
      const res = await auctionService.getClubSquad(userStrId);
      setSquadData(res?.data || res || { squad: [], quotas: [] });
    } catch (err) {
      console.error("Fetch squad error:", err);
      enqueueSnackbar("Failed to fetch squad data", { variant: "error" });
    } finally {
      setSquadLoading(false);
    }
  };

  const handleClubChange = (event, newValue) => {
    setSelectedClub(newValue);
    if (newValue) {
      fetchSquad(newValue.userId);
    } else {
      setSquadData(null);
    }
  };

  const handleOpenNegotiate = (player) => {
    // Market Hour Validation
    const market = checkMarketOpen(summary);
    if (!market.isOpen) {
      enqueueSnackbar(market.message, { variant: "error" });
      return;
    }

    setTargetPlayer(player);
    setOfferAmount("");
    setOfferType("Transfer");
    setOfferModalOpen(true);
  };

  const handleCloseNegotiate = () => {
    setOfferModalOpen(false);
    setTargetPlayer(null);
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || isNaN(offerAmount) || offerAmount <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "warning" });
      return;
    }

    try {
      setIsSubmitting(true);
      await auctionService.submitOffer(selectedPlayer.squadId, offerType, parseInt(offerAmount));
      enqueueSnackbar("Offer submitted successfully", { variant: "success" });
      handleCloseNegotiate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const marketStatus = checkMarketOpen(summary);

  const calculateTotalValue = () => {
    if (!squadData?.squad) return 0;
    return squadData.squad.reduce((sum, p) => sum + (p.pricePaid || 0), 0);
  };

  const getPositionDistribution = () => {
    if (!squadData?.squad) return {};
    return squadData.squad.reduce((acc, p) => {
      const pos = p.position || "Unknown";
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: 2,
          mb: 4,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <People color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: -0.5 }}>
              League Teams
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              VIEW SQUADS OF OTHER TEAMS
            </Typography>
          </Box>
        </Box>

        <Autocomplete
          options={clubs}
          getOptionLabel={(option) => `${option.userId} ${option.lineName ? `(${option.lineName})` : ""}`}
          value={selectedClub}
          onChange={handleClubChange}
          sx={{ width: { xs: "100%", sm: 320 } }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Club"
              variant="outlined"
              size="small"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <Search sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "background.paper",
                },
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ gap: 1.5 }}>
              <Avatar src={option.linePic} sx={{ width: 24, height: 24 }} />
              <Typography variant="body2" fontWeight={600}>
                {option.userId}
              </Typography>
              {option.lineName && (
                <Typography variant="caption" color="text.secondary">
                  - {option.lineName}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>

      {squadLoading && <LinearProgress sx={{ mb: 2 }} />}

      {squadData && squadData.squad ? (
        (() => {
          const positionSummary = getPositionDistribution();
          const gradeSummary = (squadData.quotas || []).map(q => ({
            label: q.gradeName,
            count: (squadData.squad || []).filter(p => (p.playerOvr || 0) >= q.minOVR && (p.playerOvr || 0) <= q.maxOVR).length || 0,
            gradient: GRADE_STYLE_MAP[q.gradeName]?.bg || GRADE_STYLE_MAP.DEFAULT.bg,
            color: GRADE_STYLE_MAP[q.gradeName]?.color || GRADE_STYLE_MAP.DEFAULT.color
          })) || [];

          return (
            <>
              {/* Summary Dashboard - Soft Minimal Theme */}
              <Box
                sx={{
                  p: { xs: 3, md: 4 },
                  mb: 5,
                  borderRadius: "32px",
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)",
                  position: "relative",
                }}
              >
                <Grid container spacing={3}>
                  {/* Market Value */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 1, opacity: 0.8, fontSize: "0.75rem" }}>
                        Team Value
                      </Typography>
                      <Box display="flex" alignItems="baseline" gap={1}>
                        <Typography variant="h3" fontWeight={1000} color="primary" sx={{ letterSpacing: -1 }}>
                          {calculateTotalValue().toLocaleString()}
                        </Typography>
                        <Typography variant="h6" fontWeight={1000} color="text.secondary" sx={{ opacity: 0.4 }}>TP</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Squad size */}
                  <Grid item xs={12} sm={6} md={2}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 1, opacity: 0.8, fontSize: "0.75rem" }}>
                        Players
                      </Typography>
                      <Box display="flex" alignItems="baseline" gap={0.5}>
                        <Typography variant="h3" fontWeight={1000} sx={{ letterSpacing: -1, color: "text.primary" }}>
                          {squadData.squad?.length || 0}
                        </Typography>
                        <Typography variant="h6" fontWeight={1000} color="text.secondary" sx={{ opacity: 0.4 }}>/ 23</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Grade Summary */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 2, opacity: 0.8, fontSize: "0.75rem" }}>
                        Grade
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.2 }}>
                        {gradeSummary.map((g) => (
                           <Box
                            key={`grade-dist-${g.label}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "10px",
                              bgcolor: alpha(g.color, 0.12),
                              border: `1.5px solid ${alpha(g.color, 0.3)}`,
                              overflow: "hidden",
                              height: 38,
                            }}
                          >
                            <Box sx={{ px: 1.5, height: "100%", display: "flex", alignItems: "center", bgcolor: g.color, color: "white", fontWeight: 1000, fontSize: "0.9rem" }}>
                              {g.label}
                            </Box>
                            <Box sx={{ px: 1.5, fontWeight: 900, fontSize: "1rem", color: "text.primary" }}>{g.count}</Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Position Summary */}
                  <Grid item xs={12} md={3.5}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 2, opacity: 0.8, fontSize: "0.75rem" }}>
                        Position
                      </Typography>
                      <Box sx={{ 
                        display: "flex", 
                        gap: 1.2, 
                        overflowX: "auto", 
                        pb: 1,
                        "&::-webkit-scrollbar": { height: 4 },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: "rgba(0,0,0,0.05)",
                          borderRadius: 999,
                        },
                      }}>
                        {positionGroups.flat().map((pos) => {
                          const group = getPositionGroup(pos);
                          const style = POSITION_GROUP_STYLE[group];
                          const count = positionSummary[pos] || 0;
                          
                          return (
                            <Box
                              key={`pos-sum-box-${pos}`}
                              sx={{
                                minWidth: 42,
                                height: 48,
                                borderRadius: "10px",
                                border: "1.5px solid",
                                borderColor: style.border,
                                bgcolor: alpha(style.bg, 0.4),
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: "0 0 auto",
                                transition: "all 0.2s",
                                opacity: count > 0 ? 1 : 0.6, // Slightly muted if empty but still colored
                              }}
                            >
                              <Typography variant="caption" sx={{ 
                                fontWeight: 1000, 
                                color: style.label, 
                                filter: "brightness(0.35)", // Much darker for better contrast
                                fontSize: "0.7rem",
                                lineHeight: 1,
                                textTransform: "uppercase"
                              }}>
                                {pos}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                mt: 0.5,
                                fontWeight: 1000, 
                                color: "text.primary",
                                fontSize: "0.95rem",
                                lineHeight: 1
                              }}>
                                {count}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Player Roster - Minimal Minimal Table */}
              <Typography variant="h6" fontWeight={1000} sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, color: "text.primary" }}>
                Team Roster <Chip label={squadData.squad?.length || 0} size="small" sx={{ fontWeight: 1000, bgcolor: "primary.main", color: "white", px: 0.5 }} />
              </Typography>

              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: "24px", border: "1.5px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table>
                  <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase", pl: 3 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Player Information</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>OVR</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Value</TableCell>
                      {marketStatus.isOpen && (
                        <TableCell align="right" sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase", pr: 3 }}>Action</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {squadData.squad?.map((player) => {
                      const gradeInfo = squadData.quotas?.find(q => player.playerOvr >= q.minOVR && player.playerOvr <= q.maxOVR);
                      const gradeName = gradeInfo?.gradeName || "E";
                      const gradeStyle = GRADE_STYLE_MAP[gradeName] || GRADE_STYLE_MAP.DEFAULT;
                      const group = getPositionGroup(player.position);
                      const posStyle = POSITION_GROUP_STYLE[group];

                      return (
                        <TableRow 
                          key={player.squadId} 
                          sx={{ 
                            "&:nth-of-type(even)": { bgcolor: "rgba(0,0,0,0.02)" },
                            "&:hover": { bgcolor: "rgba(0,0,0,0.04)" }, 
                            transition: "background 0.2s" 
                          }}
                        >
                          <TableCell sx={{ pl: 3 }}>
                            <Box sx={{ 
                              width: 38, 
                              height: 38, 
                              borderRadius: "10px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              bgcolor: gradeStyle.bg,
                              color: gradeStyle.color,
                              fontWeight: 1000,
                              fontSize: "1.1rem",
                              border: `1.5px solid ${alpha(gradeStyle.color, 0.3)}`,
                            }}>
                              {gradeName}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box 
                              component="a"
                              href={getPesdbInfoUrl(player.playerId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 2,
                                textDecoration: "none",
                                color: "inherit",
                                "&:hover .player-name": { color: "primary.main" }
                              }}
                            >
                              <PlayerAvatar playerId={player.playerId} />
                              <Box>
                                <Typography variant="body1" fontWeight={1000} className="player-name" sx={{ mb: 0.5, transition: "color 0.2s" }}>
                                  {player.playerName}
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                                  <Typography variant="caption" sx={{ fontWeight: 1000, color: posStyle.label, filter: "brightness(0.7)", textTransform: "uppercase" }}>
                                    {player.position}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 1000 }}>•</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 1000, color: "text.secondary" }}>
                                    {player.playingStyle || "No Style"}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", mt: 0.25 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 1000, color: "text.disabled", fontSize: "0.65rem" }}>
                                    {player.teamName || "Free Agent"} ({player.league || "Unknown"})
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" fontWeight={1000} color="primary">
                              {player.playerOvr}
                            </Typography>
                          </TableCell>
                           <TableCell align="center">
                            <Typography variant="body1" fontWeight={1000}>
                              {(player.pricePaid || 0).toLocaleString()} <Typography component="span" variant="caption" sx={{ opacity: 0.4 }}>TP</Typography>
                            </Typography>
                          </TableCell>
                          {marketStatus.isOpen && (
                            <TableCell align="right" sx={{ pr: 3 }}>
                               <Button
                                 variant="contained"
                                 size="small"
                                 startIcon={<LocalOffer sx={{ fontSize: '0.9rem !important' }} />}
                                 onClick={() => handleOpenNegotiate(player)}
                                 sx={{ 
                                   borderRadius: "10px",
                                   textTransform: "none",
                                   fontWeight: 1000,
                                   px: 2,
                                   bgcolor: "primary.main",
                                   "&:hover": { bgcolor: "primary.dark", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
                                   boxShadow: "none"
                                 }}
                               >
                                 Offer
                               </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
               {/* Negotiation Modal */}
               <Dialog
                open={offerModalOpen}
                onClose={handleCloseNegotiate}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
                TransitionComponent={Transition}
                PaperProps={{
                  sx: {
                    borderRadius: isMobile ? 0 : 5,
                    bgcolor: "#f1f5f9",
                    boxShadow: "0 40px 120px -20px rgba(15,23,42,0.4)",
                    overflow: "hidden"
                  },
                }}
              >
                <Box sx={{ position: "relative" }}>
                    {(() => {
                        const isTransfer = offerType === "Transfer";
                        const themeColor = isTransfer ? "#2563eb" : "#f97316";
                        const headerBg = isTransfer ? "#1e293b" : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
                        
                        return (
                          <>
                            {/* Header Area */}
                            <Box sx={{ 
                                position: "absolute", top: 0, left: 0, right: 0, 
                                height: { xs: 200, sm: 140 }, 
                                background: headerBg,
                                zIndex: 0,
                                transition: "background 0.3s"
                            }} />
                            
                            <DialogTitle
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                color: "white",
                                pt: { xs: 2, sm: 3 }, pb: 0,
                                position: "relative",
                                zIndex: 1
                              }}
                            >
                              <Box display="flex" alignItems="center" gap={1.2}>
                                <LocalOffer fontSize="small" sx={{ opacity: 0.8 }} />
                                <Typography variant="subtitle2" fontWeight="900" sx={{ letterSpacing: 1.5, textTransform: "uppercase" }}>
                                    {offerType === "Transfer" ? "Purchase Offer" : "Loan Negotiation"}
                                </Typography>
                              </Box>
                              <IconButton onClick={handleCloseNegotiate} size="small" sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.1)" } }}>
                                <Close fontSize="small" />
                              </IconButton>
                            </DialogTitle>
                
                            <DialogContent sx={{ position: "relative", zIndex: 1, px: { xs: 2, sm: 4 }, pt: { xs: 1, sm: 3 }, pb: 5, overflowX: 'hidden' }}>
                              {selectedPlayer && (
                                <Grid container spacing={{ xs: 2, sm: 2 }} alignItems="center" justifyContent="center" sx={{ mt: { xs: 0, sm: 1 } }}>
                                  {/* Left Column: Player Card Visual */}
                                  <Grid item xs={12} sm={5.5}>
                                     <Box sx={{ 
                                        display: "flex", 
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textAlign: "center",
                                        height: "100%"
                                     }}>
                                       <Box 
                                            sx={{
                                                position: "relative",
                                                width: { xs: 160, sm: 180 },
                                                height: { xs: 220, sm: 250 },
                                                mb: 2,
                                                filter: "drop-shadow(0 15px 35px rgba(0,0,0,0.4))",
                                                display: "block",
                                                transition: "transform 0.3s ease",
                                                "&:hover": { transform: "translateY(-5px) scale(1.02)" }
                                            }}
                                        >
                                         <PlayerCard 
                                            playerId={selectedPlayer.playerId} 
                                            playerName={selectedPlayer.playerName}
                                          />
                                       </Box>
                                       <Box sx={{ mt: 0.5 }}>
                                           <Typography 
                                                variant="h6" 
                                                fontWeight="1000" 
                                                sx={{ 
                                                    color: "#0f172a", 
                                                    mb: 1, 
                                                    lineHeight: 1.1,
                                                    fontSize: "1.25rem"
                                                }}
                                            >
                                                {selectedPlayer.playerName}
                                            </Typography>
                                            <Box display="flex" justifyContent="center" gap={1}>
                                                <Box sx={{ px: 2, py: 0.5, borderRadius: 2, bgcolor: "#f1f5f9", fontWeight: 1000, color: "#64748b", fontSize: "0.75rem" }}>
                                                  {selectedPlayer.position}
                                                </Box>
                                                <Box sx={{ px: 2, py: 0.5, borderRadius: 2, bgcolor: "#f1f5f9", fontWeight: 1000, color: "#1e293b", fontSize: "0.75rem" }}>
                                                  {selectedPlayer.playerOvr} OVR
                                                </Box>
                                            </Box>
                                       </Box>
                                     </Box>
                                  </Grid>
                                  
                                  {/* Right Column: Interaction Paper */}
                                  <Grid item xs={12} sm={6.5}>
                                    <Paper elevation={0} sx={{ 
                                        p: { xs: 2, sm: 3 }, 
                                        borderRadius: 5, 
                                        bgcolor: "white",
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
                                        border: "1px solid #fff"
                                    }}>
                                        <Box mb={2}>
                                            <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ mb: 1, display: "block", letterSpacing: 0.5 }}>AGREEMENT TYPE</Typography>
                                            <ToggleButtonGroup
                                                value={offerType}
                                                exclusive
                                                onChange={(e, val) => val && setOfferType(val)}
                                                fullWidth
                                                size="small"
                                                sx={{ 
                                                    p: 0.5, bgcolor: "#f1f5f9", borderRadius: 3,
                                                    "& .MuiToggleButton-root": {
                                                        border: "none",
                                                        borderRadius: 2.5,
                                                        fontWeight: "800",
                                                        fontSize: '0.75rem',
                                                        "&.Mui-selected": {
                                                            bgcolor: "white",
                                                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                                            color: themeColor,
                                                            "&:hover": { bgcolor: "white" }
                                                        }
                                                    }
                                                }}
                                            >
                                                <ToggleButton value="Transfer">Transfer</ToggleButton>
                                                <ToggleButton value="Loan">Loan</ToggleButton>
                                            </ToggleButtonGroup>
                                        </Box>
                                        <Box mb={2.5}>
                                            <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ mb: 0.8, display: "block", letterSpacing: 0.5 }}>PROPOSED FEE</Typography>
                                            <TextField
                                                fullWidth
                                                placeholder="0"
                                                type="number"
                                                size="small"
                                                value={offerAmount}
                                                onChange={(e) => setOfferAmount(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                InputProps={{ 
                                                  startAdornment: <InputAdornment position="start"><Typography variant="caption" fontWeight="900" color={themeColor}>TP</Typography></InputAdornment>,
                                                    sx: { 
                                                        borderRadius: 2, bgcolor: "white", fontWeight: "900", 
                                                        fontSize: "1.1rem",
                                                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
                                                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: themeColor, borderWidth: 2 }
                                                    }
                                                }}
                                            />
                                        </Box>
        
                                        {/* Wallet Status Box - Exact Match */}
                                        <Box sx={{ 
                                            p: 2, borderRadius: 4, 
                                            bgcolor: isTransfer ? "#0f172a" : "#431407", // Matching orange-brown tone for Loan
                                            color: "white",
                                            mb: 2,
                                            position: "relative",
                                            overflow: "hidden",
                                            transition: "all 0.3s"
                                        }}>
                                             <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                <Box>
                                                    <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: "900", fontSize: "0.55rem", letterSpacing: 1 }}>AVAILABLE TP FOR DEAL</Typography>
                                                    <Typography variant={isMobile ? "h6" : "h5"} fontWeight="900" sx={{ color: isTransfer ? "white" : "#fb923c" }}>
                                                        {(userBalance - (summary?.requiredReserve || 0)).toLocaleString()} <Typography component="span" variant="caption" sx={{ opacity: 0.5 }}>TP</Typography>
                                                    </Typography>
                                                </Box>
                                                <AccountBalanceWallet sx={{ opacity: 0.3, fontSize: 20, color: isTransfer ? "inherit" : "#fb923c" }} />
                                             </Box>
                                             <Divider sx={{ borderColor: isTransfer ? "rgba(255,255,255,0.1)" : "rgba(251,146,60,0.1)", my: 1, borderStyle: "dashed" }} />
                                             <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" sx={{ 
                                                    color: (userBalance < (parseInt(offerAmount || "0") + (summary?.requiredReserve || 0))) ? "#f87171" : (isTransfer ? "#4ade80" : "#fb923c"),
                                                    fontWeight: "900",
                                                    display: "flex", alignItems: "center", gap: 0.5,
                                                    fontSize: '0.65rem'
                                                }}>
                                                    ● {(userBalance < (parseInt(offerAmount || "0") + (summary?.requiredReserve || 0))) ? "LOW BUDGET" : "READY TO OFFER"}
                                                </Typography>
                                                {summary?.requiredReserve > 0 && (
                                                    <Box textAlign="right">
                                                        <Typography variant="caption" sx={{ opacity: 0.4, display: "block", fontSize: "0.5rem", color: isTransfer ? "white" : "#fb923c" }}>RESERVE LOCK</Typography>
                                                        <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.65rem', color: isTransfer ? "white" : "#fb923c" }}>{summary.requiredReserve.toLocaleString()} TP</Typography>
                                                    </Box>
                                                )}
                                             </Box>
                                        </Box>
        
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={handleSubmitOffer}
                                            disabled={!offerAmount || parseInt(offerAmount) <= 0 || (userBalance < (parseInt(offerAmount) + (summary?.requiredReserve || 0))) || isSubmitting}
                                            sx={{ 
                                                borderRadius: 3, fontWeight: "900", height: 48, textTransform: "none",
                                                bgcolor: isTransfer ? "#e2e8f0" : "#fff7ed", 
                                                color: isTransfer ? "#475569" : "#ea580c",
                                                boxShadow: "none",
                                                "&:not(:disabled)": {
                                                    "&:hover": { 
                                                        bgcolor: isTransfer ? "#cbd5e1" : "#ffedd5",
                                                        transform: "translateY(-1px)"
                                                    }
                                                },
                                                "&.Mui-disabled": { opacity: 0.5 },
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            {isSubmitting ? "Sending..." : `Confirm ${offerType} Offer`}
                                        </Button>
                                    </Paper>
                                  </Grid>
                                </Grid>
                              )}
                            </DialogContent>
                          </>
                        );
                    })()}
                </Box>
              </Dialog>
            </>
          );
        })()
      ) : (
        !squadLoading && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Groups sx={{ fontSize: 60, color: "divider", mb: 2 }} />
            <Typography color="text.secondary">Please select a club to view their roster.</Typography>
          </Box>
        )
      )}
    </Box>
  );
};

export default ClubSquadPage;
