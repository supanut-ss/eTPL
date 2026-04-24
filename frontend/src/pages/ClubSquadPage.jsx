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
  InputAdornment,
  CircularProgress,
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
  AccountBalance,
  Shield,
  AutoAwesome,
  Refresh,
} from "@mui/icons-material";
import { checkMarketOpen } from "../utils/marketUtils";
import auctionService from "../services/auctionService";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import {
  getPlayerFaceUrl,
  getPesdbInfoUrl,
  getPlayerCardUrl,
} from "../utils/imageUtils";
import adminService from "../services/adminService";

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
      sx={{
        width: 64,
        height: 64,
        bgcolor: "transparent",
      }}
      imgProps={{
        onError: handleError,
        referrerPolicy: "no-referrer",
      }}
    />
  );
};

const PlayerCard = ({ playerId, imageUrl, playerName, sx = {} }) => {
  const resolvedSrc = imageUrl || getPlayerCardUrl(playerId);
  const [src, setSrc] = useState(resolvedSrc);
  const [status, setStatus] = useState(resolvedSrc ? "loading" : "error");

  useEffect(() => {
    setSrc(resolvedSrc);
    setStatus(resolvedSrc ? "loading" : "error");
  }, [resolvedSrc]);

  const handleCardLoad = () => {
    setStatus("success");
  };

  const handleCardError = () => {
    setStatus("error");
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
        ...sx,
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt={playerName || "Player card"}
          referrerPolicy="no-referrer"
          onLoad={handleCardLoad}
          onError={handleCardError}
          sx={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: status === "error" ? "grayscale(1) opacity(0.3)" : "none",
            opacity: status === "loading" ? 0.4 : 1,
          }}
        />
      ) : (
        <People sx={{ fontSize: 60, opacity: 0.1 }} />
      )}

      {status === "error" && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            color: "text.secondary",
            textAlign: "center",
            px: 2,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.22) 100%)",
          }}
        >
          <People sx={{ fontSize: 40, opacity: 0.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Card image unavailable
          </Typography>
        </Box>
      )}

      {status !== "error" && (
        <Box
          sx={{
            position: "absolute",
            inset: -10,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
            zIndex: -1,
            pointerEvents: "none",
          }}
        />
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

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedPlayer, setTargetPlayer] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerType, setOfferType] = useState("Transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotas, setQuotas] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaData, setQuotaData] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchClubs();
    }
  }, [currentUser]);

  // Auto-reload effect (every 1 minute)
  useEffect(() => {
    let interval;
    if (selectedClub) {
      interval = setInterval(() => {
        console.log("Auto-reloading squad data...");
        fetchSquad(selectedClub.userId);
      }, 60000); // 1 minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedClub]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getClubs();
      const rawList = res?.data || res || [];

      const filteredList = Array.isArray(rawList)
        ? rawList.filter((c) => c.userId !== currentUser?.userId)
        : [];
      setClubs(filteredList);

      const [sumRes, walletRes, quotaRes] = await Promise.all([
        auctionService.getSummary(),
        auctionService.getWallet(),
        auctionService.getQuotas(),
      ]);
      setSummary(sumRes?.data || sumRes);
      setQuotas(quotaRes?.data || []);
      setUserBalance(
        (walletRes?.data?.availableBalance ?? walletRes?.availableBalance) || 0,
      );

      const targetUserId = searchParams.get("userId");
      if (targetUserId) {
        const targetClub = filteredList.find((c) => c.userId === targetUserId);
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

  const fetchQuotaSummary = async () => {
    try {
      setLoadingQuota(true);
      const res = await adminService.getQuotaSummary();
      setQuotaData(res.data);
    } catch (err) {
      console.error("Failed to fetch quota summary", err);
      enqueueSnackbar("Failed to sync team quotas", { variant: "error" });
    } finally {
      setLoadingQuota(false);
    }
  };

  const handleOpenQuotaModal = () => {
    fetchQuotaSummary();
    setQuotaModalOpen(true);
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
    const amountInt = parseInt(offerAmount);
    if (!window.confirm(`Confirm submitting ${offerType} offer for ${selectedPlayer.playerName} at ${amountInt.toLocaleString()} TP?`)) return;

    try {
      setIsSubmitting(true);
      await auctionService.submitOffer(
        selectedPlayer.squadId,
        offerType,
        parseInt(offerAmount),
      );
      enqueueSnackbar("Offer submitted successfully", { variant: "success" });
      handleCloseNegotiate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, {
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        px: { xs: 1, sm: 0 }
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <People color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">League Teams</Typography>
            <Typography variant="body2" color="text.secondary">VIEW SQUADS OF OTHER TEAMS</Typography>
          </Box>
        </Box>


        <Box display="flex" gap={2} sx={{ width: isMobile ? "100%" : "auto" }}>
          <Button
            variant="outlined"
            startIcon={<Shield />}
            onClick={handleOpenQuotaModal}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
          >
            Quota Summary
          </Button>

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
                <Typography variant="body2" fontWeight={600}>{option.userId}</Typography>
              </Box>
            )}
          />
        </Box>
      </Box>

      {squadLoading && <LinearProgress sx={{ mb: 2 }} />}

      {squadData && squadData.squad ? (
        <>
          <Box
            sx={{
              p: { xs: 3, md: 4 },
              mb: 5,
              borderRadius: "32px",
              bgcolor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)",
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" sx={{ fontWeight: 1000, display: "block", mb: 1 }}>TEAM VALUE</Typography>
                <Box display="flex" alignItems="baseline" gap={1}>
                  <Typography variant="h3" fontWeight={1000} color="primary">{calculateTotalValue().toLocaleString()}</Typography>
                  <Typography variant="h6" fontWeight={1000} color="text.secondary">TP</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Typography variant="caption" sx={{ fontWeight: 1000, display: "block", mb: 1 }}>PLAYERS</Typography>
                <Typography variant="h3" fontWeight={1000}>{squadData.squad.length} / 23</Typography>
              </Grid>
            </Grid>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: "24px", border: "1.5px solid rgba(0,0,0,0.06)" }}>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 1000 }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 1000 }}>Player Information</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 1000 }}>OVR</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 1000 }}>Value</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 1000 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {squadData.squad.map((player) => (
                  <TableRow key={player.squadId}>
                    <TableCell>
                      <Box sx={{ width: 38, height: 38, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", color: "white", fontWeight: 1000 }}>
                        {player.playerOvr >= 90 ? "S" : "A"}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <PlayerAvatar playerId={player.playerId} />
                        <Typography fontWeight={1000}>{player.playerName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center"><Typography fontWeight={1000} color="primary">{player.playerOvr}</Typography></TableCell>
                    <TableCell align="center"><Typography fontWeight={1000}>{player.pricePaid?.toLocaleString()} TP</Typography></TableCell>
                    <TableCell align="right">
                      <Button variant="contained" size="small" startIcon={<LocalOffer />} onClick={() => handleOpenNegotiate(player)}>Offer</Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                      overflow: "hidden",
                    },
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    {(() => {
                      const isTransfer = offerType === "Transfer";
                      const themeColor = isTransfer ? "#2563eb" : "#f97316";
                      const headerBg = isTransfer
                        ? "#1e293b"
                        : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";

                      return (
                        <>
                          {/* Header Area */}
                          <Box
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              height: { xs: 120, sm: 140 },
                              background: headerBg,
                              zIndex: 0,
                              transition: "background 0.3s",
                            }}
                          />

                          <DialogTitle
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              color: "white",
                              pt: { xs: 2, sm: 3 },
                              pb: 0,
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1.2}>
                              <LocalOffer
                                fontSize="small"
                                sx={{ opacity: 0.8 }}
                              />
                              <Typography
                                variant="subtitle2"
                                fontWeight="900"
                                sx={{
                                  letterSpacing: 1.5,
                                  textTransform: "uppercase",
                                }}
                              >
                                {offerType === "Transfer"
                                  ? "Purchase Offer"
                                  : "Loan Negotiation"}
                              </Typography>
                            </Box>
                            <IconButton
                              onClick={handleCloseNegotiate}
                              size="small"
                              sx={{
                                color: "rgba(255,255,255,0.6)",
                                "&:hover": {
                                  color: "white",
                                  bgcolor: "rgba(255,255,255,0.1)",
                                },
                              }}
                            >
                              <Close fontSize="small" />
                            </IconButton>
                          </DialogTitle>

                          <DialogContent
                            sx={{
                              position: "relative",
                              zIndex: 1,
                              px: { xs: 2, sm: 4 },
                              pt: { xs: 1, sm: 3 },
                              pb: { xs: 10, sm: 5 },
                              overflowY: "auto",
                            }}
                          >
                            {selectedPlayer && (
                              <Grid
                                container
                                spacing={{ xs: 2, sm: 2 }}
                                alignItems="center"
                                justifyContent="center"
                                sx={{ mt: { xs: 0, sm: 1 } }}
                              >
                                {/* Left Column: Player Card Visual */}
                                <Grid item xs={12} sm={5.5}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      textAlign: "center",
                                      height: "100%",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        position: "relative",
                                        width: { xs: 160, sm: 180 },
                                        height: { xs: 220, sm: 250 },
                                        mb: 2,
                                        filter:
                                          "drop-shadow(0 15px 35px rgba(0,0,0,0.4))",
                                        display: "block",
                                        transition: "transform 0.3s ease",
                                        "&:hover": {
                                          transform:
                                            "translateY(-5px) scale(1.02)",
                                        },
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
                                          fontSize: "1.25rem",
                                        }}
                                      >
                                        {selectedPlayer.playerName}
                                      </Typography>
                                      <Box
                                        display="flex"
                                        justifyContent="center"
                                        gap={1}
                                      >
                                        <Box
                                          sx={{
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 2,
                                            bgcolor: "#f1f5f9",
                                            fontWeight: 1000,
                                            color: "#64748b",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          {selectedPlayer.position}
                                        </Box>
                                        <Box
                                          sx={{
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 2,
                                            bgcolor: "#f1f5f9",
                                            fontWeight: 1000,
                                            color: "#1e293b",
                                            fontSize: "0.75rem",
                                          }}
                                        >
                                          {selectedPlayer.playerOvr} OVR
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Grid>

                                {/* Right Column: Interaction Paper */}
                                <Grid item xs={12} sm={6.5}>
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      p: { xs: 2, sm: 3 },
                                      borderRadius: 5,
                                      bgcolor: "white",
                                      boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
                                      border: "1px solid #fff",
                                    }}
                                  >
                                    <Box mb={2}>
                                      <Typography
                                        variant="caption"
                                        fontWeight="900"
                                        color="text.secondary"
                                        sx={{
                                          mb: 1,
                                          display: "block",
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        AGREEMENT TYPE
                                      </Typography>
                                      <ToggleButtonGroup
                                        value={offerType}
                                        exclusive
                                        onChange={(e, val) =>
                                          val && setOfferType(val)
                                        }
                                        fullWidth
                                        size="small"
                                        sx={{
                                          p: 0.5,
                                          bgcolor: "#f1f5f9",
                                          borderRadius: 3,
                                          "& .MuiToggleButton-root": {
                                            border: "none",
                                            borderRadius: 2.5,
                                            fontWeight: "800",
                                            fontSize: "0.75rem",
                                            "&.Mui-selected": {
                                              bgcolor: "white",
                                              boxShadow:
                                                "0 2px 8px rgba(0,0,0,0.05)",
                                              color: themeColor,
                                              "&:hover": { bgcolor: "white" },
                                            },
                                          },
                                        }}
                                      >
                                        <ToggleButton value="Transfer">
                                          Transfer
                                        </ToggleButton>
                                        <ToggleButton value="Loan">
                                          Loan
                                        </ToggleButton>
                                      </ToggleButtonGroup>
                                    </Box>
                                    <Box mb={2.5}>
                                      <Typography
                                        variant="caption"
                                        fontWeight="900"
                                        color="text.secondary"
                                        sx={{
                                          mb: 0.8,
                                          display: "block",
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        PROPOSED FEE
                                      </Typography>
                                      <TextField
                                        fullWidth
                                        placeholder="0"
                                        type="number"
                                        size="small"
                                        value={offerAmount}
                                        onChange={(e) =>
                                          setOfferAmount(e.target.value)
                                        }
                                        onFocus={(e) => e.target.select()}
                                        InputProps={{
                                          startAdornment: (
                                            <InputAdornment position="start">
                                              <Typography
                                                variant="caption"
                                                fontWeight="900"
                                                color={themeColor}
                                              >
                                                TP
                                              </Typography>
                                            </InputAdornment>
                                          ),
                                          sx: {
                                            borderRadius: 3,
                                            bgcolor: "#f8fafc",
                                          },
                                        }}
                                      />
                                    </Box>

                                    {/* Wallet Status Box */}
                                    <Box
                                      sx={{
                                        p: 2,
                                        borderRadius: 4,
                                        bgcolor: isTransfer
                                          ? "#0f172a"
                                          : "#431407",
                                        color: "white",
                                        mb: 2,
                                      }}
                                    >
                                      <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        mb={1}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{ opacity: 0.6, fontWeight: "900" }}
                                        >
                                          AVAILABLE TP
                                        </Typography>
                                        <AccountBalanceWallet sx={{ fontSize: 16, opacity: 0.6 }} />
                                      </Box>
                                      <Typography variant="h5" fontWeight="900">
                                        {(userBalance - (summary?.requiredReserve || 0)).toLocaleString()} TP
                                      </Typography>
                                      {summary?.requiredReserve > 0 && (
                                        <Typography variant="caption" sx={{ opacity: 0.5, mt: 0.5, display: "block" }}>
                                          (Reserved: {summary.requiredReserve.toLocaleString()} TP)
                                        </Typography>
                                      )}
                                    </Box>

                                    <Button
                                      fullWidth
                                      variant="contained"
                                      onClick={handleSubmitOffer}
                                      disabled={!offerAmount || parseInt(offerAmount) <= 0 || isSubmitting}
                                      sx={{
                                        borderRadius: 3,
                                        fontWeight: "900",
                                        height: 48,
                                        bgcolor: themeColor,
                                        "&:hover": { bgcolor: themeColor, opacity: 0.9 }
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
      ) : (
        !squadLoading && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Groups sx={{ fontSize: 60, color: "divider", mb: 2 }} />
            <Typography color="text.secondary">Please select a club to view their roster.</Typography>
          </Box>
        )
      )}
      {/* Quota Summary Dialog - Premium Design */}
      <Dialog 
        open={quotaModalOpen} 
        onClose={() => setQuotaModalOpen(false)}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{
          sx: { 
            borderRadius: '28px', 
            p: 1,
            bgcolor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 25px 70px -15px rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.8)"
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          pb: 2, 
          pt: 2.5,
          px: 3,
          background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
          backdropFilter: "blur(15px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          color: "#0f172a",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)"
        }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ 
              p: 1.2, 
              borderRadius: '14px', 
              bgcolor: "#0f172a",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: "0 8px 20px -5px rgba(15,23,42,0.3)"
            }}>
              <Shield sx={{ fontSize: 24, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="1000" sx={{ letterSpacing: -0.8, color: "#0f172a", lineHeight: 1.1 }}>Team Quota Monitor</Typography>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', opacity: 0.5, fontWeight: 800, letterSpacing: 1.2, color: "#475569", fontSize: '0.65rem' }}>Automated Compliance System</Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={() => setQuotaModalOpen(false)} 
            sx={{ 
              color: "#64748b",
              bgcolor: 'rgba(0,0,0,0.03)', 
              '&:hover': { bgcolor: '#ef4444', color: 'white' } 
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, maxHeight: '70vh' }}>
          <TableContainer sx={{ 
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4 }
          }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 1000, py: 2.5, pl: 4, bgcolor: '#f8fafc', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>Team / Owner</TableCell>
                  {quotaData?.grades?.map(g => (
                    <TableCell key={g.gradeId} align="center" sx={{ fontWeight: 1000, py: 2.5, bgcolor: '#f8fafc', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Grade {g.gradeName} <Typography component="span" variant="caption" sx={{ opacity: 0.5 }}>({g.maxAllowedPerUser})</Typography>
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 1000, py: 2.5, bgcolor: '#f8fafc', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>Loan In</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 1000, py: 2.5, bgcolor: '#f8fafc', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>Loan Out</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 1000, py: 2.5, pr: 4, bgcolor: '#f8fafc', color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingQuota && !quotaData ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                      <CircularProgress size={30} thickness={5} />
                    </TableCell>
                  </TableRow>
                ) : quotaData?.summary?.map((row) => (
                  <TableRow key={row.userId} hover sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                    <TableCell sx={{ pl: 4, py: 1.5 }}>
                      <Typography variant="body2" fontWeight="1000" color="text.primary">{row.userId}</Typography>
                    </TableCell>
                    {row.grades.map((g, idx) => {
                      const isOver = g.count > g.limit;
                      return (
                        <TableCell key={idx} align="center">
                          <Box sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: isOver ? alpha(theme.palette.error.main, 0.1) : g.count > 0 ? alpha(theme.palette.success.main, 0.08) : 'transparent',
                            border: '1.5px solid',
                            borderColor: isOver ? alpha(theme.palette.error.main, 0.3) : g.count > 0 ? alpha(theme.palette.success.main, 0.2) : 'rgba(0,0,0,0.04)',
                            transition: 'all 0.2s'
                          }}>
                            <Typography variant="body2" fontWeight="1000" color={isOver ? 'error.main' : g.count > 0 ? 'success.main' : 'text.disabled'}>
                              {g.count}
                            </Typography>
                          </Box>
                        </TableCell>
                      );
                    })}
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="1000" color={row.loanInCount > 0 ? "primary.main" : "text.disabled"}>
                        {row.loanInCount || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="1000" color={row.loanOutCount > 0 ? "warning.main" : "text.disabled"}>
                        {row.loanOutCount || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ pr: 4 }}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: '8px', 
                        bgcolor: row.totalPlayers > row.maxLimit ? 'error.main' : 'rgba(0,0,0,0.04)',
                        color: row.totalPlayers > row.maxLimit ? 'white' : 'text.primary',
                        display: 'inline-block',
                        minWidth: 40,
                        textAlign: 'center'
                      }}>
                        <Typography variant="body2" fontWeight="1000">
                          {row.totalPlayers}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <Box sx={{ p: 2.5, textAlign: 'right', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ opacity: 0.5 }}>
            AUTO-REFRESH IS ACTIVE ON MAIN PAGE ONLY • DATA SYNCED WITH AUCTION SETTINGS
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ClubSquadPage;
