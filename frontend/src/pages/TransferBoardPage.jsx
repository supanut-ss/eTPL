import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, CardMedia, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  LinearProgress, Paper, Avatar, IconButton, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, InputAdornment, ToggleButton, ToggleButtonGroup, Slide,
  Chip, Divider,
  useMediaQuery, useTheme
} from "@mui/material";
import { LocalOffer, CheckCircle, PeopleAlt, Close, Search, SearchOff, Handshake, Campaign, AccountBalanceWallet, Storefront } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { checkMarketOpen } from "../utils/marketUtils";
import { getPesdbLinkFromUrl, getPlayerCardUrl } from "../utils/imageUtils";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const getPesdbLink = getPesdbLinkFromUrl;

// Sync Grade Styles with My Squad Page
const GRADE_STYLE_MAP = {
  S: {
    color: "#ffb300",
    bg: "rgba(255,179,0,0.15)",
    border: "#ffb300",
    gradient: "linear-gradient(135deg, #ffe082 0%, #ffb300 100%)",
  },
  A: {
    color: "#f4511e",
    bg: "rgba(244,81,30,0.15)",
    border: "#f4511e",
    gradient: "linear-gradient(135deg, #ffab91 0%, #f4511e 100%)",
  },
  B: {
    color: "#8e24aa",
    bg: "rgba(142,36,170,0.15)",
    border: "#8e24aa",
    gradient: "linear-gradient(135deg, #ce93d8 0%, #8e24aa 100%)",
  },
  C: {
    color: "#1e88e5",
    bg: "rgba(30,136,229,0.15)",
    border: "#1e88e5",
    gradient: "linear-gradient(135deg, #90caf9 0%, #1e88e5 100%)",
  },
  D: {
    color: "#43a047",
    bg: "rgba(67,160,71,0.15)",
    border: "#43a047",
    gradient: "linear-gradient(135deg, #a5d6a7 0%, #43a047 100%)",
  },
  E: {
    color: "#757575",
    bg: "rgba(117,117,117,0.12)",
    border: "#757575",
    gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)",
  },
  DEFAULT: {
    color: "#9e9e9e",
    bg: "rgba(158,158,158,0.12)",
    border: "#9e9e9e",
    gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)",
  },
};

const getGradeStyle = (gradeLetter) => {
  const normalized = (gradeLetter || "DEFAULT").toUpperCase();
  return GRADE_STYLE_MAP[normalized] || GRADE_STYLE_MAP.DEFAULT;
};

// Search Modal
const PlayerSearchDialog = ({ open, onClose, searchTerm, setSearchTerm, results, onSearch, searching, onSelect, user, hasMore, onLoadMore }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    
    return (
    <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth 
        fullScreen={isMobile}
        PaperProps={{ 
            sx: { 
                borderRadius: isMobile ? 0 : 4, 
                width: isMobile ? "100%" : 1200, 
                maxWidth: isMobile ? "100%" : "95vw",
                height: isMobile ? "100%" : '80vh',
                background: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 25px 60px rgba(0,0,0,0.18)",
            } 
        }}
    >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Search Owned Players
            <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent 
            sx={{ 
                px: 3, pt: 2, pb: 4,
                overflowY: "auto",
                scrollBehavior: 'smooth'
            }}
            onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 100) {
                    if (hasMore && !searching) {
                        onLoadMore();
                    }
                }
            }}
        >
            <Box sx={{ mb: 4 }}>
                <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Search player name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && onSearch()}
                    InputProps={{
                        sx: { 
                            borderRadius: 3, 
                            pr: 0.5,
                            height: 52,
                            bgcolor: "rgba(0,0,0,0.02)",
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.1)" }
                        },
                        endAdornment: (
                            <InputAdornment position="end">
                                <Button 
                                    variant="contained" 
                                    onClick={onSearch} 
                                    disabled={searching}
                                    sx={{ 
                                        borderRadius: 2.5, 
                                        minWidth: 120,
                                        height: 42,
                                        fontWeight: "900",
                                        textTransform: "none",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    }}
                                >
                                    {searching ? <CircularProgress size={20} color="inherit" /> : "Search"}
                                </Button>
                            </InputAdornment>
                        )
                    }}
                />
            </Box>
            
            {searching ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : results.length === 0 ? (
                <Box textAlign="center" py={4} color="text.secondary">
                    <SearchOff sx={{ fontSize: 48, opacity: 0.2 }} />
                    <Typography>No players found with owners in the system</Typography>
                    <Typography variant="caption">Try searching with a more specific name</Typography>
                </Box>
            ) : (
                <Box sx={{ 
                    display: "grid", 
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, 
                    gap: 3,
                    width: "100%"
                }}>
                    {results.map(p => {
                        const style = getGradeStyle(p.grade || p.Grade);
                        const isOwner = p.ownedByUserId === user?.id;
                        return (
                            <Card key={p.idPlayer} sx={{ 
                                display: "flex", 
                                p: 1.8, 
                                gap: 2, 
                                height: 150, 
                                width: "100%",
                                borderRadius: 3,
                                alignItems: "center",
                                bgcolor: "#fff",
                                position: "relative",
                                border: `2.5px solid ${style.color}`, // Using exact My Squad color
                                boxShadow: `0 8px 24px ${style.bg}`,
                                "&:hover": {
                                    boxShadow: `0 12px 32px ${style.bg}`,
                                    transform: "translateY(-4px)",
                                },
                                transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                overflow: "hidden"
                            }}>
                                {/* Subtle grade accent background */}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        background: style.gradient,
                                        opacity: 0.08,
                                        pointerEvents: "none",
                                    }}
                                />

                                <Box 
                                    component={getPesdbLink(p.imageUrl || getPlayerCardUrl(p.idPlayer || p.IdPlayer)) ? "a" : "div"}
                                    href={getPesdbLink(p.imageUrl || getPlayerCardUrl(p.idPlayer || p.IdPlayer))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ 
                                        position: "relative", 
                                        zIndex: 1, 
                                        width: 80, 
                                        height: 110, 
                                        flexShrink: 0,
                                        cursor: "pointer",
                                        transition: "transform 0.2s",
                                        "&:hover": { transform: "scale(1.05)" }
                                    }}
                                >
                                    <Avatar 
                                        src={p.imageUrl || getPlayerCardUrl(p.idPlayer || p.IdPlayer)}
                                        variant="rounded"
                                        imgProps={{ referrerPolicy: "no-referrer" }}
                                        sx={{ 
                                            width: "100%", 
                                            height: "100%", 
                                            bgcolor: "rgba(0,0,0,0.03)",
                                            "& img": { objectFit: "contain" } 
                                        }}
                                    />
                                    <Box sx={{ 
                                        position: "absolute", 
                                        top: -8, 
                                        left: -8, 
                                        background: style.gradient,
                                        color: "white", 
                                        minWidth: 32,
                                        height: 32,
                                        borderRadius: "50%", 
                                        fontSize: "1rem", 
                                        fontWeight: "900",
                                        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "2px solid white",
                                        zIndex: 2
                                    }}>
                                        {(p.grade || p.Grade || "??").toUpperCase()}
                                    </Box>
                                </Box>

                                <Box sx={{ 
                                    position: "relative",
                                    zIndex: 1,
                                    flexGrow: 1, 
                                    display: "flex", 
                                    flexDirection: "column", 
                                    justifyContent: "space-between",
                                    height: "100%",
                                    overflow: "hidden" 
                                }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography 
                                                variant="subtitle1" 
                                                fontWeight="800" 
                                                sx={{ 
                                                    color: "text.primary", 
                                                    lineHeight: 1.1, 
                                                    mb: 0.5,
                                                    textDecoration: "none",
                                                    "&:hover": { color: "primary.main", textDecoration: "underline" }
                                                }}
                                                component="a"
                                                href={getPesdbLink(p.imageUrl || getPlayerCardUrl(p.idPlayer || p.IdPlayer))}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {p.playerName}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                                Owner: <b style={{ color: "primary.main" }}>{p.winnerName || p.ownedByUserName || "N/A"}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "bold" }}>
                                                OVR: {p.playerOvr}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ textAlign: "right", ml: 1 }}>
                                            <Typography variant="h5" sx={{ color: style.color, fontWeight: "900", lineHeight: 1 }}>
                                                {(p.pricePaid || 0).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "bold" }}>
                                                TP
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Button 
                                        size="small" 
                                        variant="contained" 
                                        fullWidth
                                        disabled={isOwner}
                                        onClick={() => onSelect(p)}
                                        startIcon={<LocalOffer fontSize="small" />}
                                        sx={{ 
                                            mt: 1.5,
                                            py: 0.8,
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: "800",
                                            bgcolor: "#2c3e50",
                                            "&:hover": { bgcolor: style.color, color: "#fff" }
                                        }}
                                    >
                                        Private Offer
                                    </Button>
                                </Box>
                            </Card>
                        );
                    })}
                </Box>
            )}

            {searching && results.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {!hasMore && results.length > 0 && (
                <Box sx={{ textAlign: 'center', p: 3, opacity: 0.5 }}>
                    <Typography variant="caption">End of search results</Typography>
                </Box>
            )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={onClose} color="inherit">Close Window</Button>
        </DialogActions>
    </Dialog>
    );
};

const TransferBoardPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quotas, setQuotas] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  const [marketSummary, setMarketSummary] = useState(null);

  // Negotiation Modal State
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerType, setOfferType] = useState("Transfer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [boardRes, quotaRes, walletRes, sumRes] = await Promise.all([
        auctionService.getTransferBoard(),
        auctionService.getQuotas(),
        auctionService.getWallet(),
        auctionService.getSummary()
      ]);
      setPlayers(boardRes?.data || []);
      setQuotas(quotaRes?.data || []);
      setUserBalance(walletRes?.data?.availableBalance || 0);
      setMarketSummary(sumRes?.data || null);
    } catch (err) {
      console.error("Fetch data error:", err);
      if (!isSilent) enqueueSnackbar("Failed to load board data", { variant: "error" });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getDynamicGrade = (ovr) => {
    const safeOvr = typeof ovr === "number" ? ovr : parseInt(ovr || "0", 10);

    const quota = quotas.find((q) => {
      const min = q.minOvr ?? q.minOVR ?? q.MinOVR;
      const max = q.maxOvr ?? q.maxOVR ?? q.MaxOVR;
      return safeOvr >= min && safeOvr <= max;
    });

    if (!quota) return { label: "-", ...getGradeStyle("DEFAULT") };
    const name = quota.gradeName ?? quota.GradeName;
    return { label: name, ...getGradeStyle(name) };
  };

  const handleBuyOut = async (player) => {
    const market = checkMarketOpen(marketSummary);
    if (!market.isOpen) {
      enqueueSnackbar(market.message, { variant: "error" });
      return;
    }

    const confirmBuy = window.confirm(`Confirm Buy Out ${player.playerName} for ${player.listingPrice} TP?`);
    if (!confirmBuy) return;

    if (userBalance < player.listingPrice) {
      enqueueSnackbar(`Insufficient funds (Required ${player.listingPrice.toLocaleString()} TP, Available ${userBalance.toLocaleString()} TP)`, { variant: "error" });
      return;
    }

    try {
      await auctionService.submitOffer(player.squadId, "Transfer", player.listingPrice);
      enqueueSnackbar(`Buy Out order for ${player.playerName} submitted successfully (waiting for seller response or auto-process)`, { variant: "success" });
      fetchData(true);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleOpenNegotiate = (player) => {
    const market = checkMarketOpen(marketSummary);
    if (!market.isOpen) {
      enqueueSnackbar(market.message, { variant: "error" });
      return;
    }
    setSelectedPlayer(player);
    setOfferAmount("");
    setOfferType("Transfer");
    setOfferModalOpen(true);
  };

  const handleCloseNegotiate = () => {
    setOfferModalOpen(false);
    setSelectedPlayer(null);
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || isNaN(offerAmount) || parseInt(offerAmount) <= 0) {
      enqueueSnackbar("Please enter a valid TP amount", { variant: "warning" });
      return;
    }

    const amountInt = parseInt(offerAmount);
    const requiredReserve = marketSummary?.requiredReserve || 0;
    const purchasingPower = userBalance - requiredReserve;

    if (purchasingPower < amountInt) {
      enqueueSnackbar(`Insufficient actual purchasing power (Available ${purchasingPower.toLocaleString()} TP, Need ${amountInt.toLocaleString()} TP) due to required reserve of ${requiredReserve.toLocaleString()} TP for remaining slots.`, { variant: "error" });
      return;
    }

    const remainingPower = purchasingPower - amountInt;
    const confirmMsg = `Confirm submitting ${offerType === "Transfer" ? "Buy" : "Loan"} offer for ${selectedPlayer.playerName} at ${amountInt.toLocaleString()} TP?\n\nYour remaining purchasing power will be: ${remainingPower.toLocaleString()} TP`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsSubmitting(true);
      await auctionService.submitOffer(selectedPlayer.squadId, offerType, amountInt);
      enqueueSnackbar(`Offer for ${selectedPlayer.playerName} for ${offerAmount} TP submitted successfully`, { variant: "success" });
      handleCloseNegotiate();
      fetchData(true);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async (termOverride, isNew = true) => {
    const term = typeof termOverride === 'string' ? termOverride : searchTerm;
    if (searching) return;
    
    try {
      setSearching(true);
      const nextPage = isNew ? 1 : searchPage + 1;
      const res = await auctionService.searchPlayers({ 
        searchTerm: term.trim(), 
        ownedOnly: true, 
        page: nextPage,
        pageSize: 15 
      });

      const newItems = res?.data?.items || res?.items || [];
      
      if (isNew) {
        setSearchResults(newItems);
        setSearchPage(1);
      } else {
        setSearchResults(prev => [...prev, ...newItems]);
        setSearchPage(nextPage);
      }

      setHasMore(newItems.length >= 15);
    } catch (err) {
      console.error("Search error:", err);
      enqueueSnackbar("Search failed", { variant: "error" });
    } finally {
      setSearching(false);
    }
  };

  const handleOpenSearch = () => {
    setSearchModalOpen(true);
    setSearchTerm("");
    setSearchResults([]);
    setSearchPage(1);
    setHasMore(true);
    handleSearch("", true); 
  };

  const handleCloseSearch = () => {
    setSearchModalOpen(false);
  };

  const handleSelectFromSearch = (player) => {
    const market = checkMarketOpen(marketSummary);
    if (!market.isOpen) {
      enqueueSnackbar(market.message, { variant: "error" });
      return;
    }
    // Check if player is already Won/Owned in the search result
    if (player.status !== "Won") {
        enqueueSnackbar("This player is not owned (Free Agent). Please bid via the normal auction system.", { variant: "info" });
        return;
    }
    
    // Propose to the squad ID
    setSelectedPlayer({
        squadId: player.squadId,
        playerId: player.idPlayer || player.IdPlayer,
        playerName: player.playerName,
        imageUrl: player.imageUrl,
        playerOvr: player.playerOvr,
        position: player.position,
        grade: player.grade,
        listingPrice: 0 // No listing price for private offers
    });
    setOfferAmount("");
    setOfferType("Transfer");
    setOfferModalOpen(true);
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center", 
        mb: 3, 
        gap: 1.5 
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Storefront color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Transfer Market</Typography>
            <Typography variant="body2" color="text.secondary">OPEN PLAYER TRANSFER MARKET</Typography>
          </Box>
        </Box>
        
        <Box sx={{ width: isMobile ? "100%" : "auto" }}>
          <Button 
            fullWidth={isMobile}
            variant="contained" 
            disableElevation
            startIcon={<Search />} 
            onClick={handleOpenSearch}
            sx={{ 
                borderRadius: '12px',
                bgcolor: "#0f172a",
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                height: 42,
                transition: 'all 0.2s',
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)",
                "&:hover": { 
                    bgcolor: "#1e293b",
                    transform: 'translateY(-1px)',
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.3)"
                }
            }}
        >
            Offer Search
        </Button>
        </Box>
      </Box>

      {marketSummary && !checkMarketOpen(marketSummary).isOpen && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, mb: 3, bgcolor: "rgba(239, 68, 68, 0.1)", 
            border: "1px solid rgba(239, 68, 68, 0.2)", 
            borderRadius: 2, display: "flex", alignItems: "center", gap: 2 
          }}
        >
          <Campaign color="error" />
          <Typography variant="body2" color="error.main" fontWeight="bold">
            {checkMarketOpen(marketSummary).message}
          </Typography>
        </Paper>
      )}

      {/* Glassmorphism Content Wrapper */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.95) 100%)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(2,6,23,0.06)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 25px 60px -25px rgba(15,23,42,0.16)",
          minHeight: "80vh"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 240,
            height: 240,
            background: "radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 70%)",
            zIndex: 0,
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          {players.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 6, md: 8 },
                textAlign: "center",
                borderRadius: 3,
                bgcolor: "rgba(2,6,23,0.02)",
                border: "1px dashed rgba(2,6,23,0.14)",
              }}
            >
              <PeopleAlt sx={{ fontSize: 48, color: "rgba(2,6,23,0.55)", mb: 1, opacity: 0.35 }} />
              <Typography variant="h6" sx={{ color: "rgba(2,6,23,0.78)" }}>
                No players listed for sale at the moment
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(2,6,23,0.60)", mt: 0.75 }}>
                Click 'Offer Search' to send a Private Offer
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {players.map((p) => {
                const grade = getDynamicGrade(p.playerOvr);
                const style = grade;
                const gradeLabel = grade.label;
                const isOwner = p.ownerId === user?.id;

                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={p.squadId}>
                    <Card sx={{ 
                        display: "flex", 
                        p: 1.8, 
                        gap: 2, 
                        height: 155, 
                        width: "100%",
                        borderRadius: 3,
                        alignItems: "center",
                        bgcolor: "#fff",
                        position: "relative",
                        border: `2.5px solid ${style.color}`,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        "&:hover": {
                            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                            transform: "translateY(-4px)",
                        },
                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        overflow: "hidden"
                    }}>
                        <Box 
                            component={getPesdbLink(p.imageUrl) ? "a" : "div"}
                            href={getPesdbLink(p.imageUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ 
                                position: "relative", 
                                zIndex: 1, 
                                width: 80, 
                                height: 110, 
                                flexShrink: 0,
                                cursor: getPesdbLink(p.imageUrl) ? "pointer" : "default",
                                transition: "all 0.2s",
                                "&:hover": { transform: getPesdbLink(p.imageUrl) ? "scale(1.05)" : "none" }
                            }}
                        >
                            <Avatar 
                                src={p.imageUrl}
                                variant="rounded"
                                sx={{ 
                                    width: "100%", 
                                    height: "100%", 
                                    bgcolor: "rgba(0,0,0,0.03)",
                                    "& img": { objectFit: "contain" } 
                                }}
                            />
                            <Box sx={{ 
                                position: "absolute", 
                                top: -8, 
                                left: -8, 
                                background: style.gradient,
                                color: "white", 
                                minWidth: 28,
                                height: 28,
                                borderRadius: "50%", 
                                fontSize: "0.85rem", 
                                fontWeight: "900",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "2px solid white",
                                zIndex: 2
                            }}>
                                {gradeLabel}
                            </Box>
                        </Box>

                        <Box sx={{ 
                            position: "relative",
                            zIndex: 1,
                            flexGrow: 1, 
                            display: "flex", 
                            flexDirection: "column", 
                            justifyContent: "space-between",
                            height: "100%",
                            overflow: "hidden" 
                        }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography 
                                        variant="subtitle2" 
                                        fontWeight="800" 
                                        sx={{ 
                                            color: "text.primary", 
                                            lineHeight: 1.1, 
                                            mb: 0.2,
                                            textDecoration: "none",
                                            "&:hover": { color: "primary.main", textDecoration: "underline" }
                                        }}
                                        component="a"
                                        href={getPesdbLink(p.imageUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {p.playerName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                        Owner: <b>{p.ownerName || "-"}</b>
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                        OVR: <b>{p.playerOvr}</b>
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right", ml: 1 }}>
                                    <Typography variant="h6" sx={{ color: "primary.main", fontWeight: "900", lineHeight: 1 }}>
                                        {(p.listingPrice || 0).toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "bold" }}>
                                        TP
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                                <Button 
                                    variant="contained" 
                                    size="small"
                                    fullWidth
                                    disabled={isOwner}
                                    onClick={() => handleBuyOut(p)} 
                                    sx={{ 
                                        borderRadius: 2, 
                                        textTransform: "none",
                                        fontWeight: "800",
                                        bgcolor: "#22c55e",
                                        fontSize: "0.75rem",
                                        "&:hover": { bgcolor: "#16a34a" }
                                    }}
                                >
                                    Buy
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    size="small"
                                    fullWidth
                                    disabled={isOwner}
                                    onClick={() => handleOpenNegotiate(p)} 
                                    sx={{ 
                                        borderRadius: 2, 
                                        textTransform: "none",
                                        fontWeight: "800",
                                        borderColor: style.color,
                                        color: style.color,
                                        fontSize: "0.75rem",
                                        "&:hover": { bgcolor: style.bg, borderColor: style.color }
                                    }}
                                >
                                    Offer
                                </Button>
                            </Box>
                        </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>

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
            background: "#f1f5f9",
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
                  {/* Left Column: Card */}
                  <Grid item xs={12} sm={5}>
                    <Box sx={{ 
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center"
                    }}>
                        <Box 
                            component="a"
                            href={getPesdbLink(selectedPlayer.imageUrl || getPlayerCardUrl(selectedPlayer.playerId))}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                position: "relative",
                                width: { xs: 150, sm: 165 },
                                height: { xs: 200, sm: 220 },
                                mb: { xs: 1, sm: 2 },
                                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))",
                                display: "block",
                                cursor: "pointer",
                                transition: "transform 0.2s",
                                "&:hover": { transform: "scale(1.05)" }
                            }}
                        >
                             <Avatar
                                src={selectedPlayer.imageUrl || getPlayerCardUrl(selectedPlayer.playerId)}
                                variant="rounded"
                                imgProps={{ referrerPolicy: "no-referrer" }}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  bgcolor: "transparent",
                                  "& img": { objectFit: "contain" }
                                }}
                              />
                        </Box>
                        
                        <Box sx={{ mt: { xs: 0, sm: 1 } }}>
                            <Typography 
                                variant={isMobile ? "h6" : "subtitle1"} 
                                fontWeight="900" 
                                sx={{ 
                                    color: isMobile ? "white" : "#0f172a", 
                                    mb: 0.5, 
                                    lineHeight: 1.1,
                                    textDecoration: "none",
                                    "&:hover": { color: "primary.main", textDecoration: "underline" }
                                }}
                                component="a"
                                href={getPesdbLink(selectedPlayer.imageUrl || getPlayerCardUrl(selectedPlayer.playerId))}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {selectedPlayer.playerName}
                            </Typography>
                            <Box display="flex" justifyContent="center" gap={1}>
                                <Chip label={selectedPlayer.position} size="small" sx={{ fontWeight: "bold", bgcolor: isMobile ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", color: isMobile ? "white" : "inherit" }} />
                                <Chip label={`${selectedPlayer.playerOvr} OVR`} size="small" sx={{ fontWeight: "900", bgcolor: "#f1f5f9", fontSize: '0.7rem' }} />
                            </Box>
                        </Box>
                    </Box>
                  </Grid>

                  {/* Right Column: Interaction Card */}
                  <Grid item xs={12} sm={7}>
                    <Paper elevation={0} sx={{ 
                        p: { xs: 2, sm: 3 }, 
                        borderRadius: 5, 
                        bgcolor: "white",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
                        border: "1px solid #fff"
                    }}>
                        <Box mb={2}>
                            <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ mb: 1, display: "block", letterSpacing: 0.5 }}>
                                AGREEMENT TYPE
                            </Typography>
                            <ToggleButtonGroup
                                value={offerType || "Transfer"}
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
                            <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ mb: 0.8, display: "block", letterSpacing: 0.5 }}>
                                PROPOSED FEE
                            </Typography>
                            <TextField
                              fullWidth
                              placeholder="Amount"
                              type="number"
                              size="small"
                              value={offerAmount}
                              onChange={(e) => setOfferAmount(e.target.value)}
                              InputProps={{ 
                                startAdornment: <InputAdornment position="start"><Typography variant="caption" fontWeight="900" color={themeColor}>TP</Typography></InputAdornment>,
                                sx: { 
                                    borderRadius: 2, bgcolor: "white", fontWeight: "900", 
                                    fontSize: "1rem",
                                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.1)" },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: themeColor, borderWidth: 2 }
                                }
                              }}
                            />
                        </Box>

                        <Box sx={{ 
                            p: 2, borderRadius: 4, 
                            bgcolor: isTransfer ? "#0f172a" : "#431407",
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
                                        {(userBalance - (marketSummary?.requiredReserve || 0)).toLocaleString()} <Typography component="span" variant="caption" sx={{ opacity: 0.5 }}>TP</Typography>
                                    </Typography>
                                </Box>
                                <AccountBalanceWallet sx={{ opacity: 0.3, fontSize: 20, color: isTransfer ? "inherit" : "#fb923c" }} />
                             </Box>
                             <Divider sx={{ borderColor: isTransfer ? "rgba(255,255,255,0.1)" : "rgba(251,146,60,0.1)", my: 1, borderStyle: "dashed" }} />
                             <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" sx={{ 
                                    color: (userBalance < (parseInt(offerAmount || "0") + (marketSummary?.requiredReserve || 0))) ? "#f87171" : (isTransfer ? "#4ade80" : "#fb923c"),
                                    fontWeight: "900",
                                    display: "flex", alignItems: "center", gap: 0.5,
                                    fontSize: '0.65rem'
                                }}>
                                    ● {(userBalance < (parseInt(offerAmount || "0") + (marketSummary?.requiredReserve || 0))) ? "LOW BUDGET" : "READY TO OFFER"}
                                </Typography>
                                {marketSummary?.requiredReserve > 0 && (
                                    <Box textAlign="right">
                                        <Typography variant="caption" sx={{ opacity: 0.4, display: "block", fontSize: "0.5rem", color: isTransfer ? "white" : "#fb923c" }}>RESERVE LOCK</Typography>
                                        <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.65rem', color: isTransfer ? "white" : "#fb923c" }}>{marketSummary.requiredReserve.toLocaleString()} TP</Typography>
                                    </Box>
                                )}
                             </Box>
                        </Box>

                        <Button 
                            onClick={handleSubmitOffer} 
                            variant="contained" 
                            fullWidth
                            size="large"
                            disabled={!offerAmount || parseInt(offerAmount) <= 0 || (userBalance < (parseInt(offerAmount) + (marketSummary?.requiredReserve || 0))) || isSubmitting}
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
      {/* Global Search Dialog */}
        <PlayerSearchDialog 
            open={searchModalOpen}
            onClose={handleCloseSearch}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            results={searchResults}
            onSearch={() => handleSearch(searchTerm, true)}
            onLoadMore={() => handleSearch(searchTerm, false)}
            hasMore={hasMore}
            searching={searching}
            onSelect={handleSelectFromSearch}
            user={user}
        />
    </Box>
  );
};

export default TransferBoardPage;
