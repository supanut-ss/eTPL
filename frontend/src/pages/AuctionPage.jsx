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
  alpha,
} from "@mui/material";
import { Gavel, Refresh, Search, SportsSoccer, AccountBalanceWallet, Groups, HelpOutline } from "@mui/icons-material";
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
  const [grades, setGrades] = useState([]);
  const [freeAgentOnly, setFreeAgentOnly] = useState(false);

  // Additional Filters
  const [filterLeague, setFilterLeague] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterPlayingStyle, setFilterPlayingStyle] = useState("");
  const [filterFoot, setFilterFoot] = useState("");
  const [filterNationality, setFilterNationality] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic Filter Options
  const [filterOptions, setFilterOptions] = useState({
    leagues: [],
    teams: [],
    positions: [],
    playingStyles: [],
    feet: [],
    nationalities: []
  });

  const getGradeColor = (ovr) => {
    const q = grades.find(g => ovr >= g.minOVR && ovr <= g.maxOVR);
    if (!q) return '#8E8E93';
    const styles = {
      "S": "#ffb300",
      "A": "#f4511e",
      "B": "#8e24aa",
      "C": "#1e88e5",
      "D": "#43a047",
      "E": "#757575"
    };
    return styles[q.gradeName] || '#8E8E93';
  };

  const getGradeColorByName = (name) => {
    const styles = {
      "S": "#ffb300",
      "A": "#f4511e",
      "B": "#8e24aa",
      "C": "#1e88e5",
      "D": "#43a047",
      "E": "#757575"
    };
    return styles[name] || '#8E8E93';
  };

  
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
              newArr[index] = {
                ...updatedAuction,
                currentUserFinalBid: updatedAuction.currentUserFinalBid ?? prev[index].currentUserFinalBid 
              };
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
      const [sumRes, boardRes, quotaRes] = await Promise.all([
        auctionService.getSummary(),
        auctionService.getBoard(),
        auctionService.getQuotas()
      ]);
      setSummary(sumRes.data);
      setAuctions(boardRes.data || []);
      setGrades(quotaRes.data || []);
      await fetchOptions(); // Initial load
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async (league = filterLeague) => {
    try {
      const optionsRes = await auctionService.getFilterOptions(league);
      setFilterOptions(optionsRes.data || { leagues: [], teams: [], positions: [], playingStyles: [], feet: [], nationalities: [] });
    } catch (err) {
      console.error("Fetch options error:", err);
    }
  };

  // Cascading Filter: Re-fetch teams when league changes
  useEffect(() => {
    if (user) {
      fetchOptions(filterLeague);
      setFilterTeam(""); // Reset team selection when league changes
    }
  }, [filterLeague]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSearch = async (term = searchTerm, grade = searchGrade, free = freeAgentOnly) => {
    try {
      const filters = {
        searchTerm: term,
        grade,
        freeAgentOnly: free,
        league: filterLeague,
        teamName: filterTeam,
        position: filterPosition,
        playingStyle: filterPlayingStyle,
        foot: filterFoot,
        nationality: filterNationality,
      };
      const res = await auctionService.searchPlayers(filters);
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
    let amount;
    
    if (type === "normal") {
      amount = currentPrice + 1;
    } else {
      const userVal = window.prompt(`Enter your sealed Final Bid amount (must be > ${currentPrice} TP):`, currentPrice + 1);
      if (!userVal) return;
      amount = parseInt(userVal, 10);
      if (isNaN(amount) || amount <= currentPrice) {
        enqueueSnackbar("Bid amount must be a number greater than the current price", { variant: "error" });
        return;
      }
    }

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
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Gavel color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Auction Draft Board</Typography>
            <Typography variant="body2" color="text.secondary">
              TRANSFER MARKET BOARD
            </Typography>
          </Box>
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
              setFilterLeague("");
              setFilterPosition("");
              setFilterPlayingStyle("");
              setFilterFoot("");
              setFilterNationality("");
              setShowFilters(false);
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
            <Paper elevation={0} sx={{ 
              borderRadius: 0, 
              p: 0, 
              height: '100%', 
              bgcolor: 'white', 
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'grey.200',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {/* Wallet Header */}
              <Box sx={{ 
                bgcolor: 'primary.main', 
                p: '8px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <AccountBalanceWallet sx={{ fontSize: '1rem', color: 'white' }} />
                <Typography variant="caption" fontWeight="900" sx={{ letterSpacing: 1, color: 'white' }}>
                  ACCOUNT BALANCE
                </Typography>
              </Box>

              {/* Balance Body */}
              <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  AVAILABLE FUNDS
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h3" fontWeight="900" sx={{ 
                    color: 'success.main', 
                    letterSpacing: '-1.5px',
                  }}>
                    {summary.wallet?.availableBalance?.toLocaleString()}
                  </Typography>
                  <Typography variant="h6" fontWeight="800" sx={{ color: 'text.disabled' }}>
                    TP
                  </Typography>
                </Box>
              </Box>

              {/* Reserved Footer */}
              <Box sx={{ 
                bgcolor: 'grey.50', 
                p: '12px 16px', 
                borderTop: '1px solid',
                borderColor: 'grey.100',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700 }}>
                      RESERVED
                    </Typography>
                    <Tooltip title="ยอดเงินที่ถูกล็อคไว้ในระบบประมูลที่คุณกำลังชนะ (จะคืนให้หากมีคนบิดสูงกว่า)">
                      <HelpOutline sx={{ fontSize: '0.7rem', color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontWeight="800" color="text.primary">
                    {summary.wallet?.reservedBalance?.toLocaleString()} <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.6 }}>TP</Typography>
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700 }}>
                      REQ. RESERVE
                    </Typography>
                    <Tooltip title="เงินสำรองขั้นต่ำที่ต้องเหลือไว้เพื่อให้บิดนักเตะจนครบโควตาคน (เป็นระบบ Budget Lock)">
                      <HelpOutline sx={{ fontSize: '0.7rem', color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontWeight="800" color="warning.dark">
                    {summary.requiredReserve?.toLocaleString()} <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.6 }}>TP</Typography>
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ 
              borderRadius: 0, 
              p: 0, 
              height: '100%', 
              bgcolor: 'white', 
              border: '1px solid',
              borderColor: 'grey.200',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {/* Quotas Header */}
              <Box sx={{ 
                bgcolor: 'primary.main', 
                p: '8px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <Groups sx={{ fontSize: '1rem', color: 'white' }} />
                <Typography variant="caption" fontWeight="900" sx={{ letterSpacing: 1, color: 'white' }}>
                  PLAYER QUOTAS
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: '0.65rem' }}>
                    TOTAL:
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 900, fontSize: '0.75rem' }}>
                    {summary.currentSquadCount} / {summary.maxSquadSize}
                  </Typography>
                </Box>
              </Box>

              {/* Quotas Body */}
              <Box sx={{ 
                p: '12px 16px', 
                flexGrow: 1,
                display: 'flex', 
                flexWrap: 'nowrap', 
                gap: 1.5, 
                overflowX: 'auto', 
                pb: 1,
                '&::-webkit-scrollbar': { height: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '4px' }
              }}>
                {summary.quotas?.map((q) => {
                  const gradeColor = getGradeColorByName(q.gradeName);
                  const isFull = q.currentCount >= q.maxAllowed;
                  const progress = Math.min(100, (q.currentCount / (q.maxAllowed || 1)) * 100);
                  const isUnlimited = q.maxAllowed > 90;

                  return (
                    <Box
                      key={q.gradeName}
                      sx={{
                        flex: '0 0 100px', // Fixed width for premium look
                        minWidth: 100,
                        height: 90, // Fixed height requested
                        borderRadius: 0,
                        border: '1px solid',
                        borderColor: alpha(gradeColor, 0.4),
                        bgcolor: 'white',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        boxShadow: `0 4px 12px ${alpha(gradeColor, 0.08)}`,
                        opacity: q.maxAllowed === 0 && !isUnlimited ? 0.3 : 1
                      }}
                    >
                      {/* Header Ribbon */}
                      <Box sx={{ 
                        bgcolor: gradeColor, 
                        py: 0.5, 
                        px: 1, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        position: 'relative'
                      }}>
                        <Typography variant="caption" sx={{ color: q.gradeName === 'E' ? '#333' : 'white', fontWeight: 900, letterSpacing: 0.8, fontSize: '0.7rem' }}>
                          GRADE {q.gradeName}
                        </Typography>
                        {isFull && <Box sx={{ position: 'absolute', right: 6, width: 5, height: 5, borderRadius: '50%', bgcolor: 'white', animation: 'pulse 1.5s infinite' }} />}
                      </Box>

                      {/* Info Area */}
                      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: alpha(gradeColor, 0.03) }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
                          <Typography variant="h5" fontWeight="900" sx={{ color: '#1a1a1a', lineHeight: 1 }}>
                            {q.currentCount}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, fontSize: '0.75rem' }}>
                            / {isUnlimited ? '∞' : q.maxAllowed}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Tech Progress Footer */}
                      <Box sx={{ height: 4, bgcolor: alpha(gradeColor, 0.1), mt: 'auto', position: 'relative' }}>
                        <Box sx={{ 
                          width: `${isUnlimited ? (q.currentCount > 0 ? 100 : 0) : progress}%`, 
                          height: '100%', 
                          bgcolor: gradeColor,
                          boxShadow: `0 0 8px ${gradeColor}`
                        }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Quotas Footer - Analytical Summary */}
              <Box sx={{ 
                bgcolor: 'grey.50', 
                p: '12px 16px', 
                borderTop: '1px solid',
                borderColor: 'grey.100',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700 }}>
                      SQUAD VALUATION ({summary.currentSquadCount} PLAYERS)
                    </Typography>
                    <Tooltip title="มูลค่ารวมของนักเตะที่มีอยู่และที่กำลังชนะประมูล (ราคาที่จ่าย + เงินที่จองไว้)">
                      <HelpOutline sx={{ fontSize: '0.7rem', color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontWeight="800" color="text.primary">
                    {((summary.squad?.reduce((acc, p) => acc + (p.pricePaid || 0), 0) || 0) + (summary.wallet?.reservedBalance || 0)).toLocaleString()} 
                    <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.6, ml: 0.5 }}>TP</Typography>
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700 }}>
                      EST. PURCHASING POWER
                    </Typography>
                    <Tooltip title="ค่าพลังเฉลี่ย (OVR) ที่คุณสามารถประมูลได้สำหรับโควตาที่เหลือ เมื่อคำนวณจากงบประมาณคงเหลือและเงินสำรอง">
                      <HelpOutline sx={{ fontSize: '0.7rem', color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" fontWeight="800" color="primary.main">
                    {(() => {
                      const remainingSlots = (summary.maxSquadSize || 0) - (summary.currentSquadCount || 0);
                      const capital = (summary.wallet?.availableBalance || 0); // Directly use available funds
                      if (remainingSlots <= 0) return "MAX SIZE";
                      const result = capital / remainingSlots;
                      return result.toFixed(1);
                    })()}
                    <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.6, ml: 0.5 }}>AVG OVR</Typography>
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Active Auctions Section */}
      <Box mb={2} display="flex" alignItems="center" justifyContent="space-between" width="100%">
        <Box display="flex" alignItems="center" gap={1}>
          <Gavel color="warning" fontSize="small" />
          <Typography variant="h6" fontWeight="bold">🔥 Live Auctions</Typography>
        </Box>
        {summary.marketStartTime && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            bgcolor: 'grey.100', 
            px: 1.5, 
            py: 0.4, 
            borderRadius: '4px',
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.5px' }}>
              MARKET HOURS
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.75rem' }}>
              {summary.marketStartTime} - {summary.marketEndTime}
              {summary.marketStartDate && summary.marketStartDate !== "N/A" && (
                <span style={{ marginLeft: '8px', opacity: 0.6, fontWeight: 600, fontSize: '0.7rem' }}>
                  ({summary.marketStartDate} - {summary.marketEndDate})
                </span>
              )}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1}}>
        {auctions
          .filter(a => a.dbStatus === "Active" && a.bidderUserIds?.includes(user?.id))
          .sort((a, b) => new Date(a.finalEndTime) - new Date(b.finalEndTime))
          .map((auction) => (
          <Box key={auction.auctionId} sx={{ width: 152, flexShrink: 0 }}>
            <Card sx={{ 
              width: 152, 
              height: 215, 
              position: 'relative',
              borderRadius: 0,
              overflow: 'hidden',
              boxShadow: auction.currentUserFinalBid != null ? '0 0 15px rgba(255,152,0,0.4)' : '0 4px 10px rgba(0,0,0,0.3)',
              bgcolor: alpha(getGradeColor(auction.playerOvr), 0.15),
              border: '2px solid',
              borderColor: alpha(getGradeColor(auction.playerOvr), 0.5),
              transition: 'transform 0.2s',
              p: '1px', // Minimal padding
              '&:hover': { transform: 'scale(1.02)' }
            }}>
              <Box sx={{ position: 'relative', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                <CardMedia
                  component="img"
                  image={`https://pesdb.net/assets/img/card/b${auction.playerId}.png`}
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
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
                  <Typography fontWeight="900" sx={{ 
                    color: auction.currentUserFinalBid != null ? '#FFD700' : '#00E676', 
                    lineHeight: 1, 
                    fontSize: '1.25rem',
                    bgcolor: 'rgba(0,0,0,0.6)', // Sharper background for clarity without shadow
                    px: 0.8,
                    py: 0.2,
                    borderRadius: '4px',
                    transition: 'all 0.3s ease'
                  }}>
                    {auction.currentUserFinalBid ?? auction.currentPrice}<Typography component="span" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}> TP</Typography>
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
                          minWidth: '50px', p: '2px 6px',
                          background: auction.highestBidderId === user?.id ? 'linear-gradient(135deg, #fdd835 0%, #fbc02d 100%) !important' : 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%) !important',
                          '&:hover': { background: 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%) !important' },
                          '&.Mui-disabled': { 
                            background: auction.highestBidderId === user?.id ? 'linear-gradient(135deg, #fdd835 0%, #fbc02d 100%) !important' : 'rgba(248, 244, 4, 1) !important', 
                            color: '#000 !important' 
                          },
                          fontWeight: 'bold', borderRadius: 0.75, fontSize: '0.7rem', height: '22px', lineHeight: 1
                        }}
                        onClick={() => handleBid(auction.auctionId, "normal", auction.currentPrice)}
                      >
                        {auction.highestBidderId === user?.id ? "Lead" : "+1"}
                      </Button>
                    )}
                    {auction.displayStatus === "Final Bid" && (
                      <Button 
                        variant="contained" 
                        size="small" 
                        disabled={auction.currentUserFinalBid != null}
                        sx={{ 
                          minWidth: '50px', p: '2px 6px', 
                          background: auction.currentUserFinalBid != null ? '#555 !important' : 'linear-gradient(135deg, #ff9800 0%, #e65100 100%) !important', 
                          '&:hover': { background: 'linear-gradient(135deg, #f57c00 0%, #bf360c 100%) !important' }, 
                          '&.Mui-disabled': { color: '#ccc !important', background: '#555 !important' },
                          fontWeight: 'bold', borderRadius: 0.75, fontSize: '0.65rem', height: '22px', lineHeight: 1 
                        }} 
                        onClick={() => handleBid(auction.auctionId, "final", auction.currentPrice)}>
                        {auction.currentUserFinalBid != null ? "Done" : "Final"}
                      </Button>
                    )}
                    {auction.displayStatus === "Waiting Confirm" && user?.id === auction.winnerId && (
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
                {grades.map((g) => (
                  <MenuItem key={g.gradeId} value={g.gradeName}>{g.gradeName}</MenuItem>
                ))}
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
            <Button 
                variant="outlined" 
                onClick={() => setShowFilters(!showFilters)} 
                sx={{ height: 40, whiteSpace: 'nowrap' }}
              >
                {showFilters ? "Hide Filters" : "More Filters"}
            </Button>
            <Button variant="contained" onClick={() => handleSearch()} startIcon={<Search />} sx={{ height: 40, whiteSpace: 'nowrap', px: 3, boxShadow: 2 }}>
              Search
            </Button>
          </Box>
          {showFilters && (
          <Box p={3} sx={{ bgcolor: '#fbfbfd', borderRadius: '16px', border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', mb: 3 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, mb: 2, display: 'block', letterSpacing: '1px' }}>
                SEARCH REFINEMENT
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Row 1: League & Team */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '1 1 40%', minWidth: 250 }}>
                      <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                        <InputLabel>League</InputLabel>
                        <Select value={filterLeague} label="League" onChange={(e) => setFilterLeague(e.target.value)}>
                          <MenuItem value="">Any</MenuItem>
                          {filterOptions.leagues?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 40%', minWidth: 250 }}>
                      <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                        <InputLabel>Team Name</InputLabel>
                        <Select value={filterTeam} label="Team Name" onChange={(e) => setFilterTeam(e.target.value)}>
                          <MenuItem value="">Any</MenuItem>
                          {filterOptions.teams?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  {/* Row 2: Nationality, Style, Position, Foot */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: '2 1 200px', minWidth: 180 }}>
                      <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                        <InputLabel>Nationality</InputLabel>
                        <Select value={filterNationality} label="Nationality" onChange={(e) => setFilterNationality(e.target.value)}>
                          <MenuItem value="">Any</MenuItem>
                          {filterOptions.nationalities?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: '2 1 200px', minWidth: 180 }}>
                      <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                        <InputLabel>Playing Style</InputLabel>
                        <Select value={filterPlayingStyle} label="Playing Style" onChange={(e) => setFilterPlayingStyle(e.target.value)}>
                          <MenuItem value="">Any</MenuItem>
                          {filterOptions.playingStyles?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 120px', minWidth: 100 }}>
                      <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                        <InputLabel>Pos</InputLabel>
                        <Select value={filterPosition} label="Pos" onChange={(e) => setFilterPosition(e.target.value)}>
                          <MenuItem value="">Any</MenuItem>
                          {filterOptions.positions?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 120px', minWidth: 100 }}>
                      <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                        <InputLabel>Foot</InputLabel>
                        <Select value={filterFoot} label="Foot" onChange={(e) => setFilterFoot(e.target.value)}>
                          <MenuItem value="">Any</MenuItem>
                          {filterOptions.feet?.map(opt => <MenuItem key={opt} value={opt}>{opt.replace(' foot', '')}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
              </Box>
          </Box>
          )}
          <Box display="flex" flexDirection="column" gap={1.5} sx={{ maxHeight: 500, overflowY: 'auto', pr: 0.5 }}>
            {searchResults.map((p) => {
              const isAvailable = p.status === "Available";
              const isNormalBid = p.status === "In Normal Bid";
              const isFinalBid = p.status === "In Final Bid";
              const isWon = p.status === "Won";
              const getPosColor = (pos) => {
                const p = pos?.toUpperCase() || '';
                if (['CF', 'SS', 'LWF', 'RWF'].includes(p)) return '#FF3B30';
                if (['AMF', 'CMF', 'DMF', 'LMF', 'RMF'].includes(p)) return '#28CD41';
                if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return '#007AFF';
                if (p === 'GK') return '#FFCC00';
                return '#8E8E93';
              };
              const gradeColor = getGradeColor(p.playerOvr);

              return (
              <Box key={p.idPlayer} sx={{ 
                p: 1.5, 
                mb: 0.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '16px',
                bgcolor: 'white',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
                boxShadow: isWon ? '0 8px 24px rgba(255,193,7,0.12)' : '0 4px 12px rgba(0,0,0,0.05)', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  borderColor: 'rgba(0,0,0,0.12)',
                  bgcolor: 'rgba(255,255,255,1)'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: '4px',
                  bgcolor: getPosColor(p.position),
                  borderRadius: '4px 0 0 4px'
                }
              }}>
                <Box display="flex" alignItems="center" gap={3}>
                  {/* Premium Pos/OVR Section */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    width: 50,
                    flexShrink: 0
                  }}>
                    <Typography variant="h4" fontWeight="900" sx={{ 
                      color: '#1d1d1f', 
                      lineHeight: 1,
                      letterSpacing: '-1px'
                    }}>
                      {p.playerOvr}
                    </Typography>
                    <Box sx={{ 
                      mt: 0.5,
                      px: 0.8,
                      py: 0.2,
                      borderRadius: '4px',
                      bgcolor: getPosColor(p.position),
                      color: 'white'
                    }}>
                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem' }}>
                        {p.position || '??'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Player Image - WITH GRADE BORDER */}
                  <Box sx={{ 
                    position: 'relative', 
                    flexShrink: 0,
                    p: '3px',
                    borderRadius: '8px',
                    border: '0.5px solid',
                    borderColor: alpha(gradeColor, 0.6),
                    boxShadow: `0 0 10px ${alpha(gradeColor, 0.2)}`,
                    bgcolor: alpha(gradeColor, 0.12)
                  }}>
                    <Box 
                      component="img"
                      src={`https://pesdb.net/assets/img/card/b${p.idPlayer}.png`} 
                      sx={{ 
                        width: 72, 
                        height: 102, 
                        display: 'block',
                        objectFit: 'contain', 
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
                      }} 
                    />
                  </Box>

                  {/* Player Info */}
                  <Box>
                    <Typography variant="h6" fontWeight="800" sx={{ color: '#1d1d1f', mb: 0.2, lineHeight: 1.2 }}>
                      {p.playerName}
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={2} mb={1}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontWeight: 600, color: '#424245' }}>LEAGUE</span> {p.league || '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontWeight: 600, color: '#424245' }}>TEAM</span> {p.teamName || '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontWeight: 600, color: '#424245' }}>STYLE</span> {p.playingStyle || '-'}
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      {isAvailable && (
                        <Chip label="AVAILABLE" size="small" sx={{ height: 20, bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 800, fontSize: '0.6rem', border: '1px solid #C8E6C9' }} />
                      )}
                      {isNormalBid && (
                        <Chip label={`ACTIVE BIDS • ${p.currentPrice} TP`} size="small" sx={{ height: 20, bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 800, fontSize: '0.6rem', border: '1px solid #BBDEFB' }} />
                      )}
                      {isFinalBid && (
                        <Chip label={`FINAL PHASE • ${p.currentPrice} TP`} size="small" sx={{ height: 20, bgcolor: '#FFF3E0', color: '#EF6C00', fontWeight: 800, fontSize: '0.6rem', border: '1px solid #FFE0B2' }} />
                      )}
                      {isWon && (
                        <Chip label={`🏆 WON BY ${p.winnerName?.toUpperCase() ?? 'ADMIN'}`} size="small" sx={{ height: 20, bgcolor: '#FFFDE7', color: '#FBC02D', fontWeight: 800, fontSize: '0.6rem', border: '1px solid #FFF9C4' }} />
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ flexShrink: 0, ml: 2 }}>
                  {isAvailable && (
                    <Button 
                      variant="contained" 
                      onClick={() => handleStartAuction(p.idPlayer)}
                      sx={{ 
                        bgcolor: '#1d1d1f', 
                        color: 'white',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 'bold',
                        px: 3,
                        '&:hover': { bgcolor: '#000' }
                      }}
                    >
                      Start {p.playerOvr + 1} TP
                    </Button>
                  )}
                  {isNormalBid && (
                    <Button
                      variant="contained"
                      onClick={() => handleBidFromSearch(p.activeAuctionId, p.currentPrice)}
                      sx={{ 
                        bgcolor: '#007AFF', 
                        color: 'white',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 'bold',
                        px: 3,
                        boxShadow: '0 4px 12px rgba(0,122,255,0.3)'
                      }}
                    >
                      Bid {(p.currentPrice ?? 0) + 1} TP
                    </Button>
                  )}
                  {isFinalBid && (
                    <Typography variant="button" sx={{ color: '#EF6C00', fontWeight: 900, fontSize: '0.75rem' }}>FINAL BID</Typography>
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
