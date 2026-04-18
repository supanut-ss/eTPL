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
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Gavel, Refresh, Search, SearchOff, SportsSoccer, AccountBalanceWallet, Groups, HelpOutline, Campaign, History, Timer, EmojiEvents, ArrowBack, Close } from "@mui/icons-material";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";
import { checkMarketOpen } from "../utils/marketUtils";
import { getPesdbLinkFromUrl, getPlayerCardUrl } from "../utils/imageUtils";
import { getUsers } from "../api/userApi";

const getPesdbLink = getPesdbLinkFromUrl;

const AuctionPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [members, setMembers] = useState([]);

  // Additional Filters
  const [filterLeague, setFilterLeague] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterPlayingStyle, setFilterPlayingStyle] = useState("");
  const [filterFoot, setFilterFoot] = useState("");
  const [filterNationality, setFilterNationality] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);

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

  const getDynamicGrade = (ovr) => {
    const grade = grades.find(g => ovr >= g.minOVR && ovr <= g.maxOVR);
    if (!grade) return { label: '?', color: '#8E8E93', gradient: 'linear-gradient(135deg, #8E8E93 0%, #707070 100%)' };
    const styles = {
        "S": { color: "#ffb300", gradient: "linear-gradient(135deg, #ffb300 0%, #ff8f00 100%)" },
        "A": { color: "#f4511e", gradient: "linear-gradient(135deg, #f4511e 0%, #d84315 100%)" },
        "B": { color: "#8e24aa", gradient: "linear-gradient(135deg, #8e24aa 0%, #6a1b9a 100%)" },
        "C": { color: "#1e88e5", gradient: "linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)" },
        "D": { color: "#43a047", gradient: "linear-gradient(135deg, #43a047 0%, #2e7d32 100%)" },
        "E": { color: "#757575", gradient: "linear-gradient(135deg, #757575 0%, #424242 100%)" }
    };
    const s = styles[grade.gradeName] || { color: '#8E8E93', gradient: 'linear-gradient(135deg, #8E8E93 0%, #707070 100%)' };
    return { label: grade.gradeName, ...s };
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

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [sumRes, boardRes, quotaRes, userRes] = await Promise.all([
        auctionService.getSummary(),
        auctionService.getBoard(),
        auctionService.getQuotas(),
        getUsers().catch(() => ({ data: { data: [] } }))
      ]);
      setSummary(sumRes.data);
      setAuctions(boardRes.data || []);
      setGrades(quotaRes.data || []);
      setMembers(userRes.data?.data || []);
      await fetchOptions(); // Initial load
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      if (!isSilent) setLoading(false);
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

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = async (term = searchTerm, grade = searchGrade, free = freeAgentOnly, isNew = true) => {
    if (loadingSearch) return;
    try {
      setLoadingSearch(true);
      const nextPage = isNew ? 1 : searchPage + 1;
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
        page: nextPage,
        pageSize: 30
      };
      
      const res = await auctionService.searchPlayers(filters);
      const newItems = res?.data?.items || res?.items || [];
      
      if (isNew) {
        setSearchResults(newItems);
        setSearchPage(1);
      } else {
        setSearchResults(prev => [...prev, ...newItems]);
        setSearchPage(nextPage);
      }
      
      setHasMore(newItems.length >= 30);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleBidFromSearch = async (auctionId, currentPrice) => {
    try {
      await auctionService.placeNormalBid(auctionId, currentPrice + 1);
      enqueueSnackbar("Bid placed successfully", { variant: "success" });
      handleSearch(); // Refresh results to update player status
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleStartAuction = async (playerId) => {
    // Market Hour Validation
    const market = checkMarketOpen(summary);
    if (!market.isOpen) {
      enqueueSnackbar(market.message, { variant: "error" });
      return;
    }

    if (summary?.marketEndTime) {
      try {
        const [hour, minute] = summary.marketEndTime.split(':').map(Number);
        const marketEnd = new Date();
        marketEnd.setHours(hour, minute, 0, 0);

        // Calculate potential normal end time
        const durationMins = summary.normalBidDurationMinutes || 1200; // fallback consistent with backend
        const now = new Date();
        const potentialNormalEnd = new Date(now.getTime() + durationMins * 60000);

        if (potentialNormalEnd > marketEnd) {
          const timeToWait = potentialNormalEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          enqueueSnackbar(`Cannot start auction because Normal phase end time (${timeToWait}) exceeds market close time (${summary.marketEndTime})`, { variant: "error" });
          return;
        }
      } catch (e) {
        console.error("Market time validation error:", e);
      }
    }

    try {
      await auctionService.startAuction(playerId);
      enqueueSnackbar("Auction started successfully", { variant: "success" });
      handleSearch(); // Refresh results to update player status
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const getUserDisplayName = (idValue) => {
    if (!idValue) return null;
    const member = members.find(m => 
      (m.id || m.Id) === idValue || 
      (m.userId || m.UserId) === idValue || 
      String(m.id || m.Id) === String(idValue) ||
      String(m.userId || m.UserId) === String(idValue)
    );
    return (member?.lineName || member?.LineName) || (member?.userId || member?.UserId) || idValue;
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

          <Button 
            variant="contained" 
            disableElevation
            startIcon={<Search />} 
            onClick={() => {
              setSearchOpen(true);
              setSearchResults([]);
              setSearchTerm("");
              setSearchGrade("All");
              setFreeAgentOnly(false);
              setSearchPage(1);
              setHasMore(true);
              setFilterLeague("");
              setFilterPosition("");
              setFilterPlayingStyle("");
              setFilterFoot("");
              setFilterNationality("");
              setShowFilters(false);
            }}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              height: 42,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
              transition: 'all 0.2s',
              "&:hover": { 
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)',
                bgcolor: 'primary.dark'
              },
            }}
          >
            Start Auction
          </Button>
        </Box>
      </Box>

      {summary && !checkMarketOpen(summary).isOpen && (
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
            {checkMarketOpen(summary).message}
          </Typography>
        </Paper>
      )}

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
                    <Tooltip title="Total TP currently locked in active winning bids">
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
                    <Tooltip title="Minimum reserve required to ensure enough funds to fill the remaining squad quota (Budget Lock system)">
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
                    <Tooltip title="Total value of owned players and winning auctions (Price Paid + Reserved Balance)">
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
                    <Tooltip title="Estimated Average OVR you can bid for remaining slots, calculated from remaining budget and reserve requirements.">
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
        {summary && summary.marketStartTime && (
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


      <Grid container spacing={2.5} sx={{ width: '100%', m: 0 }}>
        {(() => {
          const filtered = auctions.filter(a => 
            a.dbStatus === "Active" && 
            (
              a.highestBidderId === user?.id || 
              (a.bidderUserIds && a.bidderUserIds.includes(user?.id)) ||
              a.currentUserFinalBid !== null
            )
          );

          if (filtered.length === 0) {
            return (
              <Grid item xs={12} sx={{ width: '100%' }}>
                <Paper elevation={0} sx={{ 
                  p: 8, textAlign: "center", borderRadius: 4, 
                  bgcolor: "rgba(0,0,0,0.02)", border: "2px dashed rgba(0,0,0,0.05)",
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300
                }}>
                  <SearchOff sx={{ fontSize: 64, color: "text.disabled", mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" fontWeight="bold" color="text.secondary">
                    No Active Bids
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                    You are not participating in any live auctions at the moment.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<Search />}
                    onClick={() => setSearchOpen(true)}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: "bold" }}
                  >
                    Find Players to Bid
                  </Button>
                </Paper>
              </Grid>
            );
          }

          return filtered
            .sort((a, b) => new Date(a.finalEndTime) - new Date(b.finalEndTime))
            .map((auction) => {
                const gradeColor = getGradeColor(auction?.playerOvr || 0);
                const gradeLabel = getDynamicGrade(auction?.playerOvr || 0).label;
                const isNormal = auction.displayStatus === "Normal Bid";
                const isFinal = auction.displayStatus === "Final Bid";
                const isWaiting = auction.displayStatus === "Waiting Confirm";

                return (
                  <Grid item xs={12} md={6} lg={4} key={auction.auctionId}>
                    <Card sx={{ 
                        display: "flex", p: 1.8, gap: 2, height: { xs: "auto", sm: 160 }, minWidth: { xs: "100%", sm: 350 }, borderRadius: 3, alignItems: "center", 
                        position: "relative", border: `2.5px solid ${gradeColor}`, 
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        "&:hover": { boxShadow: "0 12px 32px rgba(0,0,0,0.12)", transform: "translateY(-4px)" },
                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        overflow: "hidden",
                        bgcolor: "#fff",
                        flexDirection: { xs: "column", sm: "row" },
                        py: { xs: 3, sm: 1.8 }
                    }}>
                        <Box 
                            component={getPesdbLink(auction.imageUrl || getPlayerCardUrl(auction.playerId)) ? "a" : "div"}
                            href={getPesdbLink(auction.imageUrl || getPlayerCardUrl(auction.playerId))}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ 
                                position: "relative", 
                                width: 80, 
                                height: 110, 
                                flexShrink: 0,
                                cursor: "pointer",
                                transition: "transform 0.2s",
                                "&:hover": { transform: "scale(1.05)" }
                            }}
                        >
                            <Avatar 
                                src={auction.imageUrl || getPlayerCardUrl(auction.playerId)}
                                variant="rounded" 
                                sx={{ width: "100%", height: "100%", bgcolor: "#f8fafc", "& img": { objectFit: "contain" } }} 
                            />
                            <Box sx={{ 
                                position: "absolute", top: -8, left: -8, 
                                background: `linear-gradient(135deg, ${gradeColor} 0%, ${alpha(gradeColor, 0.8)} 100%)`, 
                                color: "white", minWidth: 32, height: 32, borderRadius: "50%", 
                                display: "flex", alignItems: "center", justifyContent: "center", 
                                fontWeight: "900", border: "2px solid white", zIndex: 2 
                            }}>
                                {gradeLabel}
                            </Box>
                        </Box>

                        <Box sx={{ flexGrow: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: { xs: 2, sm: 0 } }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: 150 }}>
                                        {auction.playerName}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isFinal ? '#ff9800' : '#4caf50' }} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                                            {auction.displayStatus === "Normal Bid" ? "Normal" : auction.displayStatus === "Final Bid" ? "Final" : "Wait"}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary">OVR: <b>{auction.playerOvr}</b></Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Ends: <b>{new Date(auction.currentPhaseEndTime).toLocaleString("en-GB", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b>
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                    <Typography variant="h5" fontWeight="900" color="primary">
                                        {(auction.currentUserFinalBid ?? auction.currentPrice).toLocaleString()} TP
                                    </Typography>
                                    {auction.displayStatus === "Waiting Confirm" && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 'bold' }}>
                                            Win: {getUserDisplayName(auction.winnerId || auction.highestBidderId) || auction.highestBidderName || "-"}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", gap: 1 }}>
                                {isNormal && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        fullWidth
                                        disabled={auction.highestBidderId === user?.id}
                                        sx={{
                                            borderRadius: 1.5, fontWeight: "900",
                                            background: auction.highestBidderId === user?.id ? 'linear-gradient(135deg, #fdd835 0%, #fbc02d 100%) !important' : 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%) !important',
                                            '&:hover': { background: 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%) !important' },
                                            '&.Mui-disabled': { 
                                                background: auction.highestBidderId === user?.id ? 'linear-gradient(135deg, #fdd835 0%, #fbc02d 100%) !important' : 'rgba(248, 244, 4, 1) !important', 
                                                color: '#000 !important' 
                                            },
                                        }}
                                        onClick={() => handleBid(auction.auctionId, "normal", auction.currentPrice)}
                                    >
                                        {auction.highestBidderId === user?.id ? "Leading" : "+1 TP"}
                                    </Button>
                                )}
                                {isFinal && (
                                    <Button 
                                        variant="contained" 
                                        size="small" 
                                        fullWidth
                                        disabled={auction.currentUserFinalBid != null}
                                        sx={{ 
                                            borderRadius: 1.5, fontWeight: "900",
                                            background: auction.currentUserFinalBid != null ? '#555 !important' : 'linear-gradient(135deg, #ff9800 0%, #e65100 100%) !important', 
                                            '&:hover': { background: 'linear-gradient(135deg, #f57c00 0%, #bf360c 100%) !important' }, 
                                            '&.Mui-disabled': { color: '#ccc !important', background: '#555 !important' },
                                        }} 
                                        onClick={() => handleBid(auction.auctionId, "final", auction.currentPrice)}>
                                        {auction.currentUserFinalBid != null ? "Bid Submitted" : "Final Bid"}
                                    </Button>
                                )}
                                {isWaiting && String(user?.id || user?.Id) === String(auction.winnerId) && (
                                    <Button 
                                        variant="contained" 
                                        size="small" 
                                        fullWidth
                                        sx={{ borderRadius: 1.5, fontWeight: "900", bgcolor: '#2196f3', '&:hover': { bgcolor: '#1e88e5' } }} 
                                        onClick={() => handleConfirm(auction.auctionId)}
                                    >
                                        Confirm Player
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Card>
                  </Grid>
                );
            });
        })()}
      </Grid>

      {/* Start Auction Modal */}
      <Dialog 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
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
          <Box 
            display="flex" 
            flexDirection="column" 
            gap={1.5} 
            sx={{ 
              maxHeight: 600, 
              overflowY: 'auto', 
              pr: 0.5,
              scrollBehavior: 'smooth',
              minHeight: 200
            }}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight + 100) { // 100px before bottom
                if (hasMore && !loadingSearch) {
                  handleSearch(searchTerm, searchGrade, freeAgentOnly, false);
                }
              }
            }}
          >
            {loadingSearch && searchResults.length === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 2 }}>
                <CircularProgress />
                <Typography color="text.secondary" variant="body2">Searching players...</Typography>
              </Box>
            )}

            {!loadingSearch && searchResults.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 4, border: '2px dashed', borderColor: 'rgba(0,0,0,0.05)' }}>
                 <SearchOff sx={{ fontSize: 48, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                 <Typography color="text.secondary" fontWeight="600">No players found with specified criteria</Typography>
                 <Typography variant="caption" color="text.disabled">Try adjusting filters or search term</Typography>
              </Box>
            )}

            {searchResults.map((p) => {
              const isAvailable = p.status === "Available";
              const isNormalBid = p.status === "In Normal Bid";
              const isFinalBid = p.status === "In Final Bid";
              const isWon = p.status === "Won";
              const getPosColor = (pos) => {
                const pName = pos?.toUpperCase() || '';
                if (['CF', 'SS', 'LWF', 'RWF'].includes(pName)) return '#FF3B30';
                if (['AMF', 'CMF', 'DMF', 'LMF', 'RMF'].includes(pName)) return '#28CD41';
                if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pName)) return '#007AFF';
                if (pName === 'GK') return '#FFCC00';
                return '#8E8E93';
              };
              const gradeColor = getGradeColor(p?.playerOvr || 0);

              return (
              <Box key={p.idPlayer} sx={{ 
                p: 1.5, 
                mb: 0.5,
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 2, sm: 0 },
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
                  <Box 
                    component={getPesdbLink(p.imageUrl || getPlayerCardUrl(p.idPlayer)) ? "a" : "div"}
                    href={getPesdbLink(p.imageUrl || getPlayerCardUrl(p.idPlayer))}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      position: 'relative', 
                      flexShrink: 0,
                      p: '3px',
                      borderRadius: '8px',
                      border: '0.5px solid',
                      borderColor: alpha(gradeColor, 0.6),
                      boxShadow: `0 0 10px ${alpha(gradeColor, 0.2)}`,
                      bgcolor: alpha(gradeColor, 0.12),
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.05)' }
                    }}
                  >
                    <Box 
                      component="img"
                      src={p.imageUrl || getPlayerCardUrl(p.idPlayer)} 
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
                <Box sx={{ flexShrink: 0, ml: { xs: 0, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
                  {isAvailable && (
                    <Button 
                      variant="contained" 
                      onClick={() => handleStartAuction(p.idPlayer)}
                      fullWidth={isMobile}
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
                      fullWidth={isMobile}
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
            
            {loadingSearch && searchResults.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!hasMore && searchResults.length > 0 && (
              <Box sx={{ textAlign: 'center', p: 3, opacity: 0.5 }}>
                <Typography variant="caption">End of search results</Typography>
              </Box>
            )}
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
