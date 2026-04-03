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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
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
  const [searchGrade, setSearchGrade] = useState("All");
  const [freeAgentOnly, setFreeAgentOnly] = useState(false);
  
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

  const handleSearch = async (term = searchTerm, grade = searchGrade, free = freeAgentOnly) => {
    try {
      const res = await auctionService.searchPlayers(term, 1, 20, free, grade);
      setSearchResults(res.data.items);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleBidFromSearch = async (auctionId, currentPrice) => {
    try {
      await auctionService.placeNormalBid(auctionId, currentPrice + 1);
      enqueueSnackbar("Bid placed successfully", { variant: "success" });
      handleSearch(); // refresh search results
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleStartAuction = async (playerId) => {
    try {
      await auctionService.startAuction(playerId);
      enqueueSnackbar("Auction started successfully", { variant: "success" });
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
      enqueueSnackbar("Bid placed successfully", { variant: "success" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleConfirm = async (auctionId) => {
    if (!window.confirm("Confirm receiving player?")) return;
    try {
      await auctionService.confirmAuction(auctionId);
      enqueueSnackbar("Confirmed, player added to squad", { variant: "success" });
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
            onClick={() => {
              setSearchOpen(true);
              setSearchResults([]);
              setSearchTerm("");
              setSearchGrade("All");
              setFreeAgentOnly(false);
            }}
          >
            Start Auction
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
                <Typography variant="subtitle1" fontWeight="600">Budget</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="secondary">
                {summary.wallet?.availableBalance} <Typography component="span" variant="h6">TP</Typography>
              </Typography>
              <Box mt={1}>
                <Typography variant="body2" color="text.secondary">
                  Reserved: <strong>{summary.wallet?.reservedBalance} TP</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Required Reserve: <strong>{summary.requiredReserve} TP</strong>
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ borderRadius: 2, p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Groups color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="600">Player Quotas</Typography>
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
        <Typography variant="h6" fontWeight="bold">🔥 Live Auctions</Typography>
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
                        Confirm
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
            You do not have any active bids at the moment.
          </Typography>
        </Paper>
      )}

      {/* Start Auction Modal */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>🔍 Search Players to Start Auction</DialogTitle>
        <Divider />
        <DialogContent>
          <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={3} p={2} sx={{ bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
            <TextField
              size="small"
              sx={{ flexGrow: 1, minWidth: 200 }}
              label="Player Name"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={searchGrade}
                label="Class"
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchGrade(val);
                  handleSearch(searchTerm, val, freeAgentOnly);
                }}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="S">S</MenuItem>
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="B">B</MenuItem>
                <MenuItem value="C">C</MenuItem>
                <MenuItem value="D">D</MenuItem>
                <MenuItem value="E">E</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={freeAgentOnly} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    setFreeAgentOnly(val);
                    handleSearch(searchTerm, searchGrade, val);
                  }} 
                  size="small" 
                  color="primary"
                />
              }
              label={<Typography variant="body2" fontWeight="600">Free Agent</Typography>}
              sx={{ m: 0 }}
            />
            <Button variant="contained" onClick={() => handleSearch()} startIcon={<Search />} sx={{ height: 40, whiteSpace: 'nowrap', px: 3, boxShadow: 2 }}>
              Search
            </Button>
          </Box>
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {searchResults.map((p) => {
              const isAvailable = p.status === "Available";
              const isNormalBid = p.status === "In Normal Bid";
              const isFinalBid = p.status === "In Final Bid";
              const isWon = p.status === "Won";

              return (
              <Box key={p.idPlayer} sx={{ 
                p: 1.5, 
                border: '1px solid', 
                borderColor: isWon ? 'warning.light' : isNormalBid ? 'primary.light' : isFinalBid ? 'warning.main' : 'divider', 
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: isWon ? 'rgba(255,193,7,0.05)' : isNormalBid ? 'rgba(25,118,210,0.04)' : 'transparent',
                '&:hover': { bgcolor: isWon ? 'rgba(255,193,7,0.08)' : 'grey.50' }
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
                    {/* Status Badge */}
                    <Box mt={0.5}>
                      {isAvailable && (
                        <Chip label="Available" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                      {isNormalBid && (
                        <Chip label={`Normal Bid — ${p.currentPrice} TP`} size="small" color="primary" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                      {isFinalBid && (
                        <Chip label={`Final Bid — ${p.currentPrice} TP`} size="small" color="warning" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                      {isWon && (
                        <Chip label={`🏆 Won — ${p.winnerName ?? 'Unknown'}`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ flexShrink: 0, ml: 1 }}>
                  {isAvailable && (
                    <Button variant="outlined" color="primary" size="small" onClick={() => handleStartAuction(p.idPlayer)}>
                      Start {p.playerOvr} TP
                    </Button>
                  )}
                  {isNormalBid && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleBidFromSearch(p.activeAuctionId, p.currentPrice)}
                    >
                      Bid {(p.currentPrice ?? 0) + 1} TP
                    </Button>
                  )}
                  {isFinalBid && (
                    <Chip label="Final Bid" size="small" color="warning" />
                  )}
                </Box>
              </Box>
            );
            })}
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
};

export default AuctionPage;
