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
    const amount = prompt(`ระบุราคาที่ต้องการประมูล (${type === "normal" ? "เพิ่มทีละ 1" : "มากกว่าราคาปัจจุบัน"}):`, currentPrice + 1);
    if (!amount) return;

    try {
      if (type === "normal") {
        await auctionService.placeNormalBid(auctionId, parseInt(amount));
      } else {
        await auctionService.placeFinalBid(auctionId, parseInt(amount));
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
                {summary.wallet?.availableBalance} <Typography component="span" variant="h6">G</Typography>
              </Typography>
              <Box mt={1}>
                <Typography variant="body2" color="text.secondary">
                  ติดจอง: <strong>{summary.wallet?.reservedBalance} G</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  บังคับสำรอง: <strong>{summary.requiredReserve} G</strong>
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

      <Grid container spacing={3}>
        {auctions.filter(a => a.dbStatus === "Active").map((auction) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={auction.auctionId}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)', 
              overflow: 'hidden',
              bgcolor: '#1a1a1c',
              color: 'white',
              border: '1px solid #2d2d30',
              transition: 'all 0.3s ease',
              '&:hover': { 
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)', 
                transform: 'translateY(-6px)',
                borderColor: '#4caf50'
              }
            }}>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  image={auction.imageUrl}
                  alt={auction.playerName}
                  sx={{ 
                    aspectRatio: "240/339", 
                    objectFit: "cover", 
                    width: "100%",
                    display: 'block'
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '35%',
                  background: 'linear-gradient(to top, #1a1a1c 0%, rgba(26,26,28,0) 100%)',
                  pointerEvents: 'none'
                }} />
              </Box>
              <CardContent sx={{ p: 1.5, pb: '16px !important', position: 'relative', zIndex: 1 }}>
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h5" color="#4caf50" fontWeight="900" sx={{ textShadow: '0 0 10px rgba(76,175,80,0.3)', lineHeight: 1 }}>
                    {auction.currentPrice} <Typography component="span" variant="caption" fontWeight="bold">G</Typography>
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: auction.displayStatus.includes('Final') ? '#ff9800' : '#4caf50', display: 'inline-block' }} /> 
                    <Typography variant="caption" sx={{ color: 'grey.300', fontWeight: 'bold' }}>
                      {auction.displayStatus === "Normal Bid" ? "Normal" : auction.displayStatus}
                    </Typography>
                  </Box>
                </Box>
                
                <Box mb={1.5}>
                   <Typography variant="caption" display="block" color="grey.400" sx={{ lineHeight: 1.3 }}>
                      นำ: <strong style={{ color: '#fff' }}>{auction.highestBidderName || "ไม่มี (รอยืนยัน)"}</strong><br/>
                      จบ: {new Date(auction.normalEndTime).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                   </Typography>
                </Box>
                
                <Box mt={2} display="flex" gap={1}>
                  {auction.displayStatus === "Normal Bid" && (
                    <Button variant="contained" size="small" fullWidth sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#43a047' }, fontWeight: 'bold', borderRadius: 2 }} onClick={() => handleBid(auction.auctionId, "normal", auction.currentPrice)}>
                      บิด (+1)
                    </Button>
                  )}
                  {auction.displayStatus === "Final Bid" && (
                    <Button variant="contained" size="small" fullWidth sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, fontWeight: 'bold', borderRadius: 2 }} onClick={() => handleBid(auction.auctionId, "final", auction.currentPrice)}>
                      บิดปิดผนึก
                    </Button>
                  )}
                  {auction.displayStatus === "Waiting Confirm" && user?.id === auction.highestBidderId && (
                    <Button variant="contained" size="small" fullWidth sx={{ bgcolor: '#2196f3', '&:hover': { bgcolor: '#1e88e5' }, fontWeight: 'bold', borderRadius: 2 }} onClick={() => handleConfirm(auction.auctionId)}>
                      ยินยันรับตัว
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {auctions.filter(a => a.dbStatus === "Active").length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            ขณะนี้ไม่มีนักเตะกำลังประมูล... เริ่มเปิดประมูลคนแรกได้เลย!
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
                  เปิด {p.playerOvr} G
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
