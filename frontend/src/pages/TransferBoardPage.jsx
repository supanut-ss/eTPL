import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, CardMedia, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  LinearProgress, Paper, Chip, Avatar, IconButton, CircularProgress,
  List, ListItem, ListItemAvatar, ListItemText, InputAdornment
} from "@mui/material";
import { LocalOffer, CheckCircle, MonetizationOn, PeopleAlt, Close, Search, SearchOff } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";

// Sync Grade Styles with My Squad Page
const GRADE_STYLE_MAP = {
  S: { color: "#ffb300", bg: "rgba(255,179,0,0.1)", border: "#ffb300" },
  A: { color: "#f4511e", bg: "rgba(244,81,30,0.1)", border: "#f4511e" },
  B: { color: "#8e24aa", bg: "rgba(142,36,170,0.1)", border: "#8e24aa" },
  C: { color: "#1e88e5", bg: "rgba(30,136,229,0.1)", border: "#1e88e5" },
  D: { color: "#43a047", bg: "rgba(67,160,71,0.1)", border: "#43a047" },
  E: { color: "#757575", bg: "rgba(117,117,117,0.1)", border: "#757575" },
  DEFAULT: { color: "#9e9e9e", bg: "rgba(158,158,158,0.1)", border: "#9e9e9e" },
};

const getGradeStyle = (gradeLetter) => {
  const normalized = (gradeLetter || "DEFAULT").toUpperCase();
  return GRADE_STYLE_MAP[normalized] || GRADE_STYLE_MAP.DEFAULT;
};

// Search Modal
const PlayerSearchDialog = ({ open, onClose, searchTerm, setSearchTerm, results, onSearch, searching, onSelect }) => (
    <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth={false} // Disable standard breakpoints
        fullWidth 
        PaperProps={{ 
            sx: { 
                borderRadius: 4, 
                width: 1200, // Fixed width for perfect calculation
                maxWidth: "95vw" 
            } 
        }}
    >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Search Owned Players
            <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2, pb: 4 }}>
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
                    <Typography>ไม่พบนักเตะที่มีเจ้าของแล้วในระบบ</Typography>
                    <Typography variant="caption">ลองค้นหาด้วยชื่อที่เฉพาะเจาะจงมากขึ้น</Typography>
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
                                transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                            }}>
                                <Box sx={{ position: "relative", width: 80, height: 110, flexShrink: 0 }}>
                                    <Avatar 
                                        src={p.imageUrl || `https://pesdb.net/pes2022/images/players/${p.idPlayer || p.IdPlayer}.png`}
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
                                        bgcolor: style.color, 
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
                                        {p.grade || p.Grade || "?"}
                                    </Box>
                                </Box>

                                <Box sx={{ 
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={onClose} color="inherit">ปิดหน้าต่าง</Button>
        </DialogActions>
    </Dialog>
);

const TransferBoardPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Negotiation Modal State
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");

  // Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getTransferBoard();
      setPlayers(res?.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to load Transfer Board", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleBuyOut = async (player) => {
    const confirmBuy = window.confirm(`ยืนยันการฉีกสัญญา (Buy Out) ${player.playerName} ในราคา ${player.listingPrice} TP ใช่หรือไม่?`);
    if (!confirmBuy) return;

    try {
      await auctionService.submitOffer(player.squadId, "Transfer", player.listingPrice);
      enqueueSnackbar(`ส่งคำสั่งซื้อ ${player.playerName} สำเร็จแล้ว (รอผู้ขายตอบรับหรือถูกหักเงินออโต้ตามระบบ)`, { variant: "success" });
      fetchBoard();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleOpenNegotiate = (player) => {
    setSelectedPlayer(player);
    setOfferAmount("");
    setOfferModalOpen(true);
  };

  const handleCloseNegotiate = () => {
    setOfferModalOpen(false);
    setSelectedPlayer(null);
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || isNaN(offerAmount) || parseInt(offerAmount) <= 0) {
      enqueueSnackbar("กรุณาใส่จำนวน TP ให้ถูกต้อง", { variant: "warning" });
      return;
    }

    try {
      await auctionService.submitOffer(selectedPlayer.squadId, "Transfer", parseInt(offerAmount));
      enqueueSnackbar(`ยื่นข้อเสนอสำหรับ ${selectedPlayer.playerName} จำนวน ${offerAmount} TP สำเร็จ`, { variant: "success" });
      handleCloseNegotiate();
      fetchBoard();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleSearch = async (termOverride) => {
    const term = typeof termOverride === 'string' ? termOverride : searchTerm;
    
    try {
      setSearching(true);
      const res = await auctionService.searchPlayers({ 
        searchTerm: term.trim(), 
        ownedOnly: true, // Only show players who have current owners
        pageSize: 15 
      });
      setSearchResults(res?.data?.items || []);
    } catch (err) {
      console.error("Search error:", err);
      enqueueSnackbar("การค้นหาล้มเหลว", { variant: "error" });
    } finally {
      setSearching(false);
    }
  };

  const handleOpenSearch = () => {
    setSearchModalOpen(true);
    setSearchTerm("");
    setSearchResults([]);
    handleSearch(""); // Load all owned players by default
  };

  const handleCloseSearch = () => {
    setSearchModalOpen(false);
  };

  const handleSelectFromSearch = (player) => {
    // Check if player is already Won/Owned in the search result
    if (player.status !== "Won") {
        enqueueSnackbar("นักเตะคนนี้ยังไม่มีเจ้าของ (เป็น Free Agent) กรุณาประมูลในระบบตลาดปกติ", { variant: "info" });
        return;
    }
    
    // Propose to the squad ID
    setSelectedPlayer({
        squadId: player.squadId,
        playerName: player.playerName,
        imageUrl: player.imageUrl,
        listingPrice: 0 // No listing price for private offers
    });
    setOfferAmount("");
    setOfferModalOpen(true);
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Transfer Market</Typography>
          <Typography variant="body2" color="text.secondary">ตลาดซื้อขายนักเตะแบบเปิด</Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button 
            variant="outlined" 
            startIcon={<Search />} 
            onClick={handleOpenSearch}
            sx={{ borderRadius: 2 }}
        >
            Search Players (Private Offer)
        </Button>
      </Box>

      {players.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px dashed rgba(0,0,0,0.12)" }}>
          <PeopleAlt sx={{ fontSize: 48, color: "text.secondary", mb: 1, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary">ยังไม่มีนักเตะถูกตั้งขายในขณะนี้</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {players.map((p) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={p.squadId}>
              <Card sx={{ 
                borderRadius: 3, 
                bgcolor: "#1a1a2e", 
                color: "white",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden"
              }}>
                <CardMedia
                  component="img"
                  height="220"
                  image={p.imageUrl}
                  alt={p.playerName}
                  sx={{ objectFit: "contain", bgcolor: "#111", pt: 2 }}
                />
                <Box sx={{ position: "absolute", top: 10, right: 10 }}>
                  <Chip 
                    label={`OVR ${p.playerOvr}`} 
                    sx={{ bgcolor: "#ffb300", color: "#000", fontWeight: "bold" }} 
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Typography variant="h6" fontWeight="bold" noWrap>
                    {p.playerName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7, mb: 1.5 }}>
                    {p.position || "UNK"}
                  </Typography>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>Listing Price</Typography>
                    <Typography variant="subtitle2" fontWeight="bold" color="#4ade80">{p.listingPrice?.toLocaleString()} TP</Typography>
                  </Box>
                </CardContent>
                
                <Box sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="success" 
                    onClick={() => handleBuyOut(p)}
                    startIcon={<CheckCircle />}
                  >
                    Buy Out
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    color="warning" 
                    onClick={() => handleOpenNegotiate(p)}
                    startIcon={<LocalOffer />}
                  >
                    Negotiate
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Negotiation Modal */}
      <Dialog open={offerModalOpen} onClose={handleCloseNegotiate} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          ยื่นข้อเสนอซื้อนักเตะ
          <IconButton onClick={handleCloseNegotiate} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPlayer && (
            <Box mb={3} textAlign="center">
              <Avatar src={selectedPlayer.imageUrl} sx={{ width: 80, height: 80, mx: "auto", mb: 1, border: "2px solid #ccc" }} />
              <Typography variant="h6">{selectedPlayer.playerName}</Typography>
              <Typography variant="body2" color="text.secondary">ราคาตั้งขาย: <b>{selectedPlayer.listingPrice?.toLocaleString()} TP</b></Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="คำเสนอราคา (TP)"
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseNegotiate} color="inherit">ยกเลิก</Button>
          <Button onClick={handleSubmitOffer} variant="contained" color="primary">ยื่นข้อเสนอ</Button>
        </DialogActions>
      </Dialog>

      {/* Global Search Dialog */}
      <PlayerSearchDialog 
        open={searchModalOpen}
        onClose={handleCloseSearch}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        results={searchResults}
        onSearch={handleSearch}
        searching={searching}
        onSelect={handleSelectFromSearch}
      />
    </Box>
  );
};

export default TransferBoardPage;
