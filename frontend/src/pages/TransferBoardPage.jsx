import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, CardMedia, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  LinearProgress, Paper, Avatar, IconButton, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, InputAdornment, ToggleButton, ToggleButtonGroup, Slide,
  Chip, Divider
} from "@mui/material";
import { LocalOffer, CheckCircle, PeopleAlt, Close, Search, SearchOff, Handshake, Campaign, AccountBalanceWallet } from "@mui/icons-material";
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
const PlayerSearchDialog = ({ open, onClose, searchTerm, setSearchTerm, results, onSearch, searching, onSelect, user, hasMore, onLoadMore }) => (
    <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth={false} 
        fullWidth 
        PaperProps={{ 
            sx: { 
                borderRadius: 4, 
                width: 1200, 
                maxWidth: "95vw",
                height: '80vh',
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
                    <Typography>เนเธกเนเธเธเธเธฑเธเน€เธ•เธฐเธ—เธตเนเธกเธตเน€เธเนเธฒเธเธญเธเนเธฅเนเธงเนเธเธฃเธฐเธเธ</Typography>
                    <Typography variant="caption">เธฅเธญเธเธเนเธเธซเธฒเธ”เนเธงเธขเธเธทเนเธญเธ—เธตเนเน€เธเธเธฒเธฐเน€เธเธฒเธฐเธเธเธกเธฒเธเธเธถเนเธ</Typography>
                </Box>
            ) : (
                <Box sx={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(3, 1fr)", 
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
                                            <Typography variant="subtitle1" fontWeight="800" sx={{ color: "text.primary", lineHeight: 1.1, mb: 0.5 }}>
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
                    <Typography variant="caption">เธชเธดเนเธเธชเธธเธ”เธฃเธฒเธขเธเธฒเธฃเธเนเธเธซเธฒ</Typography>
                </Box>
            )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={onClose} color="inherit">เธเธดเธ”เธซเธเนเธฒเธ•เนเธฒเธ</Button>
        </DialogActions>
    </Dialog>
);

const TransferBoardPage = () => {
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

    const confirmBuy = window.confirm(`เธขเธทเธเธขเธฑเธเธเธฒเธฃเธเธตเธเธชเธฑเธเธเธฒ (Buy Out) ${player.playerName} เนเธเธฃเธฒเธเธฒ ${player.listingPrice} TP เนเธเนเธซเธฃเธทเธญเนเธกเน?`);
    if (!confirmBuy) return;

    if (userBalance < player.listingPrice) {
      enqueueSnackbar(`เธขเธญเธ”เน€เธเธดเธเนเธกเนเน€เธเธตเธขเธเธเธญ (เธ•เนเธญเธเธเธฒเธฃ ${player.listingPrice.toLocaleString()} TP, เธกเธตเธญเธขเธนเน ${userBalance.toLocaleString()} TP)`, { variant: "error" });
      return;
    }

    try {
      await auctionService.submitOffer(player.squadId, "Transfer", player.listingPrice);
      enqueueSnackbar(`เธชเนเธเธเธณเธชเธฑเนเธเธเธทเนเธญ ${player.playerName} เธชเธณเน€เธฃเนเธเนเธฅเนเธง (เธฃเธญเธเธนเนเธเธฒเธขเธ•เธญเธเธฃเธฑเธเธซเธฃเธทเธญเธ–เธนเธเธซเธฑเธเน€เธเธดเธเธญเธญเนเธ•เนเธ•เธฒเธกเธฃเธฐเธเธ)`, { variant: "success" });
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
      enqueueSnackbar("เธเธฃเธธเธ“เธฒเนเธชเนเธเธณเธเธงเธ TP เนเธซเนเธ–เธนเธเธ•เนเธญเธ", { variant: "warning" });
      return;
    }

    const amountInt = parseInt(offerAmount);
    const requiredReserve = marketSummary?.requiredReserve || 0;
    const purchasingPower = userBalance - requiredReserve;

    if (purchasingPower < amountInt) {
      enqueueSnackbar(`เธขเธญเธ”เน€เธเธดเธเธ—เธตเนเนเธเนเนเธ”เนเธเธฃเธดเธเนเธกเนเน€เธเธตเธขเธเธเธญ (เนเธเนเนเธ”เน ${purchasingPower.toLocaleString()} TP, เธ•เนเธญเธเธเธฒเธฃ ${amountInt.toLocaleString()} TP) เน€เธเธทเนเธญเธเธเธฒเธเธ•เนเธญเธเธชเธณเธฃเธญเธเน€เธเธดเธเนเธงเน ${requiredReserve.toLocaleString()} TP เธชเธณเธซเธฃเธฑเธเธ•เธณเนเธซเธเนเธเธ—เธตเนเน€เธซเธฅเธทเธญ`, { variant: "error" });
      return;
    }

    const remainingPower = purchasingPower - amountInt;
    const confirmMsg = `เธขเธทเธเธขเธฑเธเธเธฒเธฃเธขเธทเนเธเธเนเธญเน€เธชเธเธญ ${offerType === "Transfer" ? "เธเธทเนเธญ" : "เธขเธทเธก"} ${selectedPlayer.playerName} เนเธเธฃเธฒเธเธฒ ${amountInt.toLocaleString()} TP เนเธเนเธซเธฃเธทเธญเนเธกเน?\n\nเธซเธฅเธฑเธเธขเธทเนเธเธเนเธญเน€เธชเธเธญเธขเธญเธ”เน€เธเธดเธเธ—เธตเนเนเธเนเนเธ”เนเธเธฃเธดเธเธเธญเธเธเธธเธ“เธเธฐเน€เธซเธฅเธทเธญ: ${remainingPower.toLocaleString()} TP`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await auctionService.submitOffer(selectedPlayer.squadId, offerType, amountInt);
      enqueueSnackbar(`เธขเธทเนเธเธเนเธญเน€เธชเธเธญเธชเธณเธซเธฃเธฑเธ ${selectedPlayer.playerName} เธเธณเธเธงเธ ${offerAmount} TP เธชเธณเน€เธฃเนเธ`, { variant: "success" });
      handleCloseNegotiate();
      fetchData(true);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
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
      enqueueSnackbar("เธเธฒเธฃเธเนเธเธซเธฒเธฅเนเธกเธฅเนเธง", { variant: "error" });
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
        enqueueSnackbar("เธเธฑเธเน€เธ•เธฐเธเธเธเธตเนเธขเธฑเธเนเธกเนเธกเธตเน€เธเนเธฒเธเธญเธ (เน€เธเนเธ Free Agent) เธเธฃเธธเธ“เธฒเธเธฃเธฐเธกเธนเธฅเนเธเธฃเธฐเธเธเธ•เธฅเธฒเธ”เธเธเธ•เธด", { variant: "info" });
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
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Handshake color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Transfer Market</Typography>
            <Typography variant="body2" color="text.secondary">เธ•เธฅเธฒเธ”เธเธทเนเธญเธเธฒเธขเธเธฑเธเน€เธ•เธฐเนเธเธเน€เธเธดเธ”</Typography>
          </Box>
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button 
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
                เธขเธฑเธเนเธกเนเธกเธตเธเธฑเธเน€เธ•เธฐเธ–เธนเธเธ•เธฑเนเธเธเธฒเธขเนเธเธเธ“เธฐเธเธตเน
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(2,6,23,0.60)", mt: 0.75 }}>
                เธฅเธญเธเธเธ” `Search Players` เน€เธเธทเนเธญเธชเนเธเธเนเธญเน€เธชเธเธญเนเธเธ Private Offer
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
                                    <Typography variant="subtitle2" fontWeight="800" sx={{ color: "text.primary", lineHeight: 1.1, mb: 0.2 }}>
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
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            borderRadius: 5,
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 40px 120px -20px rgba(15,23,42,0.4)",
            overflow: "hidden"
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
            {/* Glossy Header Background */}
            <Box sx={{ 
                position: "absolute", top: 0, left: 0, right: 0, height: 160, 
                background: offerType === "Transfer" 
                    ? "linear-gradient(135deg, #0f172a 0%, #334155 100%)" 
                    : "linear-gradient(135deg, #92400e 0%, #d97706 100%)",
                zIndex: 0,
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
            }} />
            
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "white",
                pt: 2.5, pb: 0,
                position: "relative",
                zIndex: 1
              }}
            >
              <Box display="flex" alignItems="center" gap={1.2}>
                <Box sx={{ 
                    bgcolor: "rgba(255,255,255,0.15)", 
                    p: 0.8, borderRadius: 2, 
                    display: "flex", alignItems: "center",
                    backdropFilter: "blur(4px)"
                }}>
                    {offerType === "Transfer" ? <LocalOffer fontSize="small" /> : <Handshake fontSize="small" />}
                </Box>
                <Typography variant="subtitle1" fontWeight="900" sx={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.85rem" }}>
                    {offerType === "Transfer" ? "Purchase Offer" : "Loan Negotiation"}
                </Typography>
              </Box>
              <IconButton onClick={handleCloseNegotiate} size="small" sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.15)" } }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ position: "relative", zIndex: 1, px: { xs: 3, sm: 4 }, pt: 3, pb: 4, mt: 0.5 }}>
              {selectedPlayer && (
                <Grid container spacing={4} alignItems="center">
                  {/* Left Column: Premium Card Viewer */}
                  <Grid item xs={12} sm={5.2}>
                    <Box sx={{ 
                        position: "relative", 
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center"
                    }}>
                        <Box sx={{
                            position: "relative",
                            width: { xs: 150, sm: 165 },
                            height: { xs: 215, sm: 235 },
                            transition: "all 0.5s ease",
                            filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.45))",
                            "&:hover": { transform: "translateY(-8px) scale(1.02)" }
                        }}>
                             <Avatar
                                src={selectedPlayer.imageUrl || getPlayerCardUrl(selectedPlayer.playerId || selectedPlayer.PlayerId)}
                                variant="rounded"
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  bgcolor: "transparent",
                                  "& img": { objectFit: "contain" }
                                }}
                              />
                              
                              {/* Glowing Accent behind image */}
                              <Box sx={{ 
                                  position: "absolute", inset: 20, 
                                  bgcolor: offerType === "Transfer" ? "rgba(59,130,246,0.3)" : "rgba(245,158,11,0.3)",
                                  filter: "blur(40px)",
                                  zIndex: -1,
                                  borderRadius: "50%"
                              }} />
                        </Box>
                        
                        {/* PESDB link badge */}
                        {getPesdbLink(selectedPlayer.imageUrl) && (
                          <Button 
                            component="a" 
                            href={getPesdbLink(selectedPlayer.imageUrl)} 
                            target="_blank" 
                            size="small"
                            sx={{ mt: 1, color: "text.secondary", fontSize: "0.65rem", fontWeight: "bold", textTransform: "none" }}
                          >
                            View on pesdb.net
                          </Button>
                        )}

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h5" fontWeight="900" sx={{ color: "#0f172a", lineHeight: 1.2, mb: 0.5 }}>
                                {selectedPlayer.playerName}
                            </Typography>
                            <Box display="flex" justifyContent="center" gap={1}>
                                <Chip 
                                    label={selectedPlayer.position || "-"} 
                                    size="small" 
                                    sx={{ fontWeight: "bold", bgcolor: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)" }} 
                                />
                                <Chip 
                                    label={`${selectedPlayer.playerOvr || "-"} OVR`} 
                                    size="small" 
                                    sx={{ fontWeight: "900", bgcolor: "rgba(15,23,42,0.05)", color: "#0f172a" }} 
                                />
                            </Box>
                        </Box>
                    </Box>
                  </Grid>

                  {/* Right Column: Negotiation Controls */}
                  <Grid item xs={12} sm={6.8}>
                    <Box sx={{ 
                        p: 3, 
                        borderRadius: 5, 
                        bgcolor: "rgba(255,255,255,0.7)", 
                        border: "1px solid rgba(255,255,255,1)",
                        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)"
                    }}>
                        <Box mb={2.5}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", mb: 1.2, display: "block", letterSpacing: 0.5 }}>
                                AGREEMENT TYPE
                            </Typography>
                            <ToggleButtonGroup
                                color="primary"
                                value={offerType || "Transfer"}
                                exclusive
                                onChange={(e, val) => { if (val) setOfferType(val); }}
                                fullWidth
                                sx={{ 
                                    bgcolor: "#f1f5f9", 
                                    borderRadius: 1,
                                    p: 0.5,
                                    "& .MuiToggleButton-root": {
                                        borderRadius: 2.5,
                                        border: "none",
                                        fontWeight: "800",
                                        py: 1.2,
                                        fontSize: "0.85rem",
                                        textTransform: "none",
                                        transition: "all 0.3s ease",
                                        "&.Mui-selected": {
                                            bgcolor: "white",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                            color: offerType === "Transfer" ? "#0f172a" : "#b45309",
                                            "&:hover": { bgcolor: "white" }
                                        }
                                    }
                                }}
                            >
                                <ToggleButton value="Transfer">Transfer</ToggleButton>
                                <ToggleButton value="Loan">Loan</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        <Box mb={3}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", mb: 1, display: "block", letterSpacing: 0.5 }}>
                                {offerType === "Transfer" ? "PROPOSED FEE" : "LOAN FEE (1 SEASON)"}
                            </Typography>
                            <TextField
                              fullWidth
                              variant="outlined"
                              placeholder="Amount"
                              type="number"
                              value={offerAmount}
                              onChange={(e) => setOfferAmount(e.target.value)}
                              InputProps={{ 
                                  startAdornment: <InputAdornment position="start"><Typography variant="body2" fontWeight="900" color="primary.main">TP</Typography></InputAdornment>,
                                  sx: { 
                                      borderRadius: 1, 
                                      bgcolor: "white", 
                                      fontWeight: "900", 
                                      fontSize: "1.1rem",
                                      "& .MuiOutlinedInput-notchedOutline": { border: "2px solid rgba(0,0,0,0.04)" }
                                  }
                              }}
                            />
                            {selectedPlayer && selectedPlayer.listingPrice > 0 && (
                                <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary", fontWeight: "700", textAlign: "right" }}>
                                    Target: {selectedPlayer.listingPrice.toLocaleString()} TP
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ my: 3, borderStyle: "dashed", opacity: 0.6 }} />

                        {/* Premium Digital Wallet Card Display */}
                        <Box sx={{ 
                            p: 2, 
                            borderRadius: 3, 
                            background: (userBalance < (parseInt(offerAmount || "0") + (marketSummary?.requiredReserve || 0))) 
                                ? "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)" 
                                : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.35)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            mb: 3,
                            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
                        }}>
                            {/* Ambient Light Effect */}
                            <Box sx={{ 
                                position: "absolute", top: -40, right: -40, width: 140, height: 140, 
                                borderRadius: "50%", background: "white", opacity: 0.04, 
                                filter: "blur(20px)" 
                            }} />
                            
                            <Box sx={{ position: "relative", zIndex: 1 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase", fontSize: "0.6rem" }}>
                                            Available TP for Deal
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.8, mt: 0.3 }}>
                                            <Typography variant="h5" sx={{ 
                                                color: "white", 
                                                fontWeight: "900", 
                                                letterSpacing: -1,
                                                textShadow: "0 2px 10px rgba(0,0,0,0.2)"
                                            }}>
                                                {(userBalance - (marketSummary?.requiredReserve || 0)).toLocaleString()}
                                            </Typography>
                                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: "800" }}>TP</Typography>
                                        </Box>
                                    </Box>
                                    <Avatar sx={{ 
                                        bgcolor: "rgba(255,255,255,0.12)", 
                                        backdropFilter: "blur(8px)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        width: 34, height: 34
                                    }}>
                                        <AccountBalanceWallet sx={{ color: "white", fontSize: 17 }} />
                                    </Avatar>
                                </Box>

                                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 1.2, mt: 1.2, borderStyle: "dashed" }} />

                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: "800", display: "block", fontSize: "0.55rem", letterSpacing: 0.5 }}>
                                            TRADING STATUS
                                        </Typography>
                                        <Typography variant="caption" sx={{ 
                                            color: (userBalance < (parseInt(offerAmount || "0") + (marketSummary?.requiredReserve || 0))) ? "#f87171" : "#4ade80", 
                                            fontWeight: "900", 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 0.8,
                                            fontSize: "0.75rem"
                                        }}>
                                            <Box sx={{ 
                                                width: 8, height: 8, borderRadius: "50%", 
                                                bgcolor: "currentColor",
                                                boxShadow: `0 0 10px currentColor`
                                            }} />
                                            {(userBalance < (parseInt(offerAmount || "0") + (marketSummary?.requiredReserve || 0))) ? "BUDGET LOCKED" : "READY TO OFFER"}
                                        </Typography>
                                    </Box>
                                    
                                    {marketSummary?.requiredReserve > 0 && (
                                        <Box sx={{ textAlign: "right" }}>
                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: "800", display: "block", fontSize: "0.55rem", letterSpacing: 0.5 }}>
                                                RESERVE LOCK
                                            </Typography>
                                            <Typography variant="subtitle1" sx={{ color: "white", fontWeight: "900", opacity: 0.9 }}>
                                                {marketSummary.requiredReserve?.toLocaleString()} <Typography component="span" sx={{ fontSize: "0.65rem", opacity: 0.5, fontWeight: "700" }}>TP</Typography>
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Button 
                            onClick={handleSubmitOffer} 
                            variant="contained" 
                            fullWidth
                            size="large"
                            disabled={!offerAmount || parseInt(offerAmount) <= 0}
                            sx={{ 
                                borderRadius: 2, 
                                fontWeight: "900", 
                                height: 56,
                                textTransform: "none",
                                fontSize: "1rem",
                                bgcolor: offerType === "Transfer" ? "#0f172a" : "#d97706",
                                boxShadow: offerType === "Transfer" ? "0 10px 25px rgba(15,23,42,0.4)" : "0 10px 25px rgba(217,119,6,0.4)",
                                "&:hover": { 
                                    bgcolor: offerType === "Transfer" ? "#1e293b" : "#b45309",
                                    transform: "translateY(-3px)",
                                    boxShadow: 20
                                },
                                "&.Mui-disabled": { bgcolor: "rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.2)" },
                                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                            }}
                        >
                            Confirm {offerType} Offer
                        </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </DialogContent>
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
