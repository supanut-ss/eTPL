import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Paper,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
} from "@mui/material";
import { Gavel, Refresh, Search, SportsSoccer, AccountBalanceWallet, Groups } from "@mui/icons-material";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";

const AuctionPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [summary, setSummary] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Real-time connection
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("/hubs/auction")
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        console.log("SignalR Connected!");
        connection.on("AuctionStarted", (newAuction) => {
          setAuctions((prev) => [...prev, newAuction]);
        });
        connection.on("AuctionUpdated", (updatedAuction) => {
          setAuctions((prev) => {
            const index = prev.findIndex((a) => a.auctionId === updatedAuction.auctionId);
            if (index !== -1) {
              const newArr = [...prev];
              newArr[index] = updatedAuction;
              return newArr;
            }
            return [...prev, updatedAuction];
          });
        });
      })
      .catch((e) => console.log("Connection failed: ", e));

    return () => {
      connection.stop();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, boardRes] = await Promise.all([
        auctionService.getSummary(),
        auctionService.getBoard(),
      ]);
      setSummary(sumRes.data);
      setAuctions(boardRes.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSearch = async () => {
    try {
      const res = await auctionService.searchPlayers(searchTerm, 1, 10);
      setSearchResults(res.data.items);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleStartAuction = async (playerId) => {
    try {
      await auctionService.startAuction(playerId);
      enqueueSnackbar("เปิดประมูลสำเร็จ", { variant: "success" });
      setSearchOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleBid = async (auctionId, type, currentPrice) => {
    const amount = currentPrice + 1;
    try {
      if (type === "normal") {
        await auctionService.placeNormalBid(auctionId, amount);
      } else {
        await auctionService.placeFinalBid(auctionId, amount);
      }
      enqueueSnackbar("เสนอราคาสำเร็จ", { variant: "success" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleConfirm = async (auctionId) => {
    if (!window.confirm("กดยืนยันการรับนักเตะ?")) return;
    try {
      await auctionService.confirmAuction(auctionId);
      enqueueSnackbar("ยืนยันสำเร็จ รับนักเตะเข้าทีม", { variant: "success" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <SportsSoccer color="primary" />
          <Typography variant="h5" fontWeight="bold">Auction Draft Board</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            startIcon={<Search />} 
            onClick={() => setSearchOpen(true)}
          >
            เริ่มเปิดประมูลนักเตะ
          </Button>
        </Box>
      </Box>

      {/* Summary Dashboard */}
      {summary && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ borderRadius: 2, p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AccountBalanceWallet color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="600">งบประมาณ (Budget)</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="secondary">
                {summary.wallet?.availableBalance} <Typography component="span" variant="h6">TP</Typography>
              </Typography>
              <Box mt={1}>
                <Typography variant="body2" color="text.secondary">
                  ติดจอง: <strong>{summary.wallet?.reservedBalance} TP</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  บังคับสำรอง: <strong>{summary.requiredReserve} TP</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ borderRadius: 2, p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Groups color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="600">โควตานักเตะ (Quotas)</Typography>
                <Chip
                    label={`${summary.currentSquadCount} / ${summary.maxSquadSize}`}
                    color={summary.currentSquadCount >= summary.maxSquadSize ? "error" : "primary"}
                    size="small"
                    sx={{ ml: 'auto', fontWeight: 'bold' }}
                  />
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {summary.quotas?.map((q) => (
                  <Chip
                    key={q.gradeName}
                    label={`${q.gradeName}: ${q.currentCount}/${q.maxAllowed > 90 ? "∞" : q.maxAllowed}`}
                    color={q.currentCount >= q.maxAllowed ? "error" : "default"}
                    variant={q.currentCount > 0 ? "filled" : "outlined"}
                    size="small"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Active Auctions Section */}
      <Box mb={2} display="flex" alignItems="center" gap={1}>
        <Gavel color="warning" fontSize="small" />
        <Typography variant="h6" fontWeight="bold">🔥 กำลังประมูล (Live)</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {auctions.filter(a => a.dbStatus === "Active" && a.bidderUserIds?.includes(user?.id)).map((auction) => (
          <Box key={auction.auctionId} sx={{ width: 160, flexShrink: 0 }}>
            <Card sx={{ 
              borderRadius: 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)', 
              overflow: 'hidden',
              color: 'white',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': { 
                boxShadow: '0 8px 20px rgba(76, 175, 80, 0.4)', 
                transform: 'translateY(-3px)'
              }
            }}>
              <Box sx={{ position: 'relative', lineHeight: 0 }}>
                <CardMedia
                  component="img"
                  image={auction.imageUrl}
                  alt={auction.playerName}
                  sx={{ 
                    aspectRatio: "240/339", 
                    objectFit: "cover", 
                    objectPosition: "top center",
                    width: "100%",
                    display: 'block',
                    borderRadius: 0
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '70%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0) 100%)',
                  pointerEvents: 'none'
                }} />
              </Box>
              <CardContent sx={{ 
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                p: '4px !important', 
                zIndex: 1 
              }}>
                {/* Row 1: Status (left) | Price (right) */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
                  <Box display="flex" alignItems="center" gap={0.3}>
                    <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: auction.displayStatus.includes('Final') ? '#ff9800' : '#4caf50', display: 'inline-block', flexShrink: 0 }} />
                    <Typography sx={{ color: 'grey.300', fontWeight: 'bold', fontSize: '0.75rem', lineHeight: 1 }}>
                      {auction.displayStatus === "Normal Bid" ? "Normal" : auction.displayStatus === "Final Bid" ? "Final" : "Wait"}
                    </Typography>
                  </Box>
                  <Typography fontWeight="900" sx={{ color: '#4caf50', textShadow: '0 0 6px rgba(76,175,80,0.6)', lineHeight: 1, fontSize: '1.1rem' }}>
                    {auction.currentPrice}<Typography component="span" sx={{ fontSize: '0.5rem', fontWeight: 'bold' }}> TP</Typography>
                  </Typography>
                </Box>

                {/* Row 2: Name+Time (left) | Bid Button (right) */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-end" gap={0.5}>
                  <Box sx={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {auction.highestBidderName || "-"}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#bdbdbd', lineHeight: 1.2 }}>
                      {new Date(auction.finalEndTime).toLocaleString("th-TH", { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                  </Box>
                  <Box sx={{ flexShrink: 0 }}>
                    {auction.displayStatus === "Normal Bid" && (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={auction.highestBidderId === user?.id}
                        sx={{
                          minWidth: '40px', p: '2px 6px',
                          bgcolor: auction.highestBidderId === user?.id ? '#555 !important' : '#4caf50',
                          '&:hover': { bgcolor: '#43a047' },
                          '&.Mui-disabled': { bgcolor: 'rgba(248, 244, 4, 1) !important', color: '#0c0b0bff !important' },
                          fontWeight: 'bold', borderRadius: 0.75, fontSize: '0.7rem', height: '22px', lineHeight: 1
                        }}
                        onClick={() => handleBid(auction.auctionId, "normal", auction.currentPrice)}
                      >
                        {auction.highestBidderId === user?.id ? "Lead" : "+1"}
                      </Button>
                    )}
                    {auction.displayStatus === "Final Bid" && (
                      <Button variant="contained" size="small" sx={{ minWidth: '40px', p: '2px 6px', bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, fontWeight: 'bold', borderRadius: 0.75, fontSize: '0.7rem', height: '22px', lineHeight: 1 }} onClick={() => handleBid(auction.auctionId, "final", auction.currentPrice)}>
                        Final
                      </Button>
                    )}
                    {auction.displayStatus === "Waiting Confirm" && user?.id === auction.highestBidderId && (
                      <Button variant="contained" size="small" sx={{ minWidth: '40px', p: '2px 6px', bgcolor: '#2196f3', '&:hover': { bgcolor: '#1e88e5' }, fontWeight: 'bold', borderRadius: 0.75, fontSize: '0.65rem', height: '22px', lineHeight: 1 }} onClick={() => handleConfirm(auction.auctionId)}>
                        ยืนยัน
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
      
      {auctions.filter(a => a.dbStatus === "Active" && a.bidderUserIds?.includes(user?.id)).length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            ขณะนี้คุณยังไม่มีรายการที่กำลัง bid อยู่
          </Typography>
        </Paper>
      )}

      {/* Start Auction Modal */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>🔍 ค้นหานักเตะเพื่อเปิดประมูล</DialogTitle>
        <Divider />
        <DialogContent>
          <Box display="flex" gap={1} mt={1} mb={2}>
            <TextField
              size="small"
              fullWidth
              label="ชื่อนักเตะ"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="contained" onClick={handleSearch} startIcon={<Search />}>ค้นหา</Button>
          </Box>
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {searchResults.map((p) => (
              <Box key={p.idPlayer} sx={{ 
                p: 1.5, 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                '&:hover': { bgcolor: 'grey.50' }
              }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box 
                    component="img"
                    src={`https://pesdb.net/assets/img/card/b${p.idPlayer}.png`} 
                    sx={{ width: 72, height: 102, objectFit: 'contain', borderRadius: 1 }} 
                  />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">{p.playerName}</Typography>
                    <Typography variant="caption" color="text.secondary">OVR: {p.playerOvr}</Typography>
                  </Box>
                </Box>
                <Button variant="outlined" color="primary" size="small" onClick={() => handleStartAuction(p.idPlayer)}>
                  เปิด {p.playerOvr} TP
                </Button>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSearchOpen(false)}>ปิด</Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
};

export default AuctionPage;
