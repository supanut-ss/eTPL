import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Divider,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Slide,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  alpha,
  CircularProgress,
} from "@mui/material";
import { 
  SportsSoccer, Groups, AccountBalanceWallet, EmojiEvents, Stars,
  History, Close, Autorenew, Gavel, CompareArrows, Security, Payments,
  CardGiftcard, Handshake, Cancel, Wallet
} from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const GRADE_STYLE_MAP = {
  "S": { color: "#ffb300", bg: "rgba(255,179,0,0.15)", gradient: "linear-gradient(135deg, #ffe082 0%, #ffb300 100%)" },
  "A": { color: "#f4511e", bg: "rgba(244,81,30,0.15)", gradient: "linear-gradient(135deg, #ffab91 0%, #f4511e 100%)" },
  "B": { color: "#8e24aa", bg: "rgba(142,36,170,0.15)", gradient: "linear-gradient(135deg, #ce93d8 0%, #8e24aa 100%)" },
  "C": { color: "#1e88e5", bg: "rgba(30,136,229,0.15)", gradient: "linear-gradient(135deg, #90caf9 0%, #1e88e5 100%)" },
  "D": { color: "#43a047", bg: "rgba(67,160,71,0.15)", gradient: "linear-gradient(135deg, #a5d6a7 0%, #43a047 100%)" },
  "E": { color: "#757575", bg: "rgba(117,117,117,0.15)", gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)" },
  "DEFAULT": { color: "#9e9e9e", bg: "rgba(158,158,158,0.12)", gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)" }
};

const TX_TYPE_META = {
  AUCTION_BID:      { label: "Auction Bid",       icon: <Gavel fontSize="small" />,       color: "#f59e0b", bg: "#fffbeb" },
  AUCTION_REFUND:   { label: "Auction Refund",    icon: <Payments fontSize="small" />,    color: "#10b981", bg: "#ecfdf5" },
  AUCTION_WIN:      { label: "Auction Victory",   icon: <EmojiEvents fontSize="small" />, color: "#8b5cf6", bg: "#f5f3ff" },
  TRANSFER_BUY:     { label: "Player Buy",        icon: <CompareArrows fontSize="small" />, color: "#ef4444", bg: "#fef2f2" },
  TRANSFER_SELL:    { label: "Player Sell",       icon: <CompareArrows fontSize="small" />, color: "#10b981", bg: "#ecfdf5" },
  BONUS:            { label: "Special Bonus",     icon: <CardGiftcard fontSize="small" />, color: "#3b82f6", bg: "#eff6ff" },
  CONTRACT_RENEWAL: { label: "Contract Renewal",  icon: <Autorenew fontSize="small" />,   color: "#6366f1", bg: "#eef2ff" },
  LOAN_FEE:         { label: "Loan Fee Paid",     icon: <Handshake fontSize="small" />,   color: "#f97316", bg: "#fff7ed" },
  LOAN_INCOME:      { label: "Loan Income",       icon: <Handshake fontSize="small" />,   color: "#10b981", bg: "#ecfdf5" },
  FREE_RELEASE:     { label: "Contract Terminated", icon: <Cancel fontSize="small" />,      color: "#64748b", bg: "#f1f5f9" },
  ADJUSTMENT:       { label: "Balance Adjustment",  icon: <Security fontSize="small" />,    color: "#64748b", bg: "#f8fafc" },
};

const MySquadPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [squad, setSquad] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [wallet, setWallet] = useState(null);
  
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [hasMoreTx, setHasMoreTx] = useState(true);
  const [totalTx, setTotalTx] = useState(0);

  const [loading, setLoading] = useState(true);
  const [txOpen, setTxOpen] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getSummary();
      const data = res?.data || {};
      
      setSquad(data.squad || []);
      setQuotas(data.quotas || []);
      setWallet(data.wallet || null);
    } catch (err) {
      enqueueSnackbar("Failed to refresh squad summary", { variant: "error" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      setTxLoading(true);
      const res = await auctionService.getTransactions(page, 20);
      
      const data = res?.data || {};
      const newItems = data.items || data.Items || (Array.isArray(data) ? data : []);
      const totalCount = data.totalCount || data.TotalCount || (Array.isArray(data) ? data.length : 0);
      
      if (page === 1) {
        setTransactions(newItems);
      } else {
        setTransactions(prev => [...prev, ...newItems]);
      }
      
      setTotalTx(totalCount);
      setHasMoreTx(transactions.length + newItems.length < totalCount);
      setTxPage(page);
    } catch (err) {
      enqueueSnackbar("Failed to load transaction history", { variant: "error" });
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (txOpen) {
      fetchTransactions(1);
      // Refresh wallet balance when opening transactions
      auctionService.getWallet().then(res => setWallet(res?.data || null)).catch(() => {});
    }
  }, [txOpen]);

  const handleLoadMore = () => {
    if (!txLoading && hasMoreTx) {
      fetchTransactions(txPage + 1);
    }
  };

  const getDynamicGrade = (ovr) => {
    const quota = quotas.find(q => {
      const min = q.minOvr ?? q.minOVR ?? q.MinOVR;
      const max = q.maxOvr ?? q.maxOVR ?? q.MaxOVR;
      return ovr >= min && ovr <= max;
    });
    if (!quota) return { label: "-", ...GRADE_STYLE_MAP["DEFAULT"] };
    const name = quota.gradeName ?? quota.GradeName;
    const style = GRADE_STYLE_MAP[name] || GRADE_STYLE_MAP["DEFAULT"];
    return { label: name, ...style };
  };

  const totalSpent = squad.reduce((sum, p) => sum + (p.pricePaid ?? 0), 0);

  const gradeSummary = quotas.map((q) => {
    const style = GRADE_STYLE_MAP[q.gradeName] || GRADE_STYLE_MAP["DEFAULT"];
    return {
      label: q.gradeName,
      count: squad.filter((p) => p.playerOvr >= q.minOVR && p.playerOvr <= q.maxOVR).length,
      ...style
    };
  }).filter((g) => g.count > 0);

  const formatDateTime = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-US", {
      day: "2-digit", month: "short", year: "numeric", 
      hour: "2-digit", minute: "2-digit", hour12: false
    });
  };

  const formatTimeOnly = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false
    });
  };

  const groupedTransactions = (Array.isArray(transactions) ? transactions : []).reduce((groups, tx) => {
    const date = new Date(tx.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <EmojiEvents color="primary" />
          <Typography variant="h5" fontWeight="bold">My Squad</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="contained" 
            disableElevation
            startIcon={<History />} 
            onClick={() => setTxOpen(true)}
            sx={{ 
                borderRadius: 2.5, 
                bgcolor: 'white', 
                color: 'text.primary', 
                border: '1px solid rgba(0,0,0,0.08)',
                fontWeight: 'bold',
                textTransform: 'none',
                px: 2,
                '&:hover': { bgcolor: 'grey.50', borderColor: 'primary.main' }
            }}
          >
            Transactions
          </Button>
          <Chip label={`${squad.length} Players`} color="primary" sx={{ height: 36, px: 1, borderRadius: 2, fontWeight: "bold" }} />
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={1.5} mb={5}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)", border: "1px solid #ce93d8", position: 'relative', overflow: 'hidden' }}>
            <Wallet sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: '#9c27b0', opacity: 0.1, transform: 'rotate(-15deg)' }} />
            <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
              <Typography variant="body2" color="#7b1fa2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Current Balance</Typography>
              <Typography variant="h4" fontWeight="900" color="#7b1fa2" sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                {wallet?.availableBalance?.toLocaleString() || 0} <Typography component="span" variant="subtitle1" fontWeight="bold">TP</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", border: "1px solid #90caf9", position: 'relative', overflow: 'hidden' }}>
            <AccountBalanceWallet sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: '#2196f3', opacity: 0.1, transform: 'rotate(-15deg)' }} />
            <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
              <Typography variant="body2" color="primary.dark" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Total Investment</Typography>
              <Typography variant="h4" fontWeight="900" color="primary.dark" sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                {totalSpent.toLocaleString()} <Typography component="span" variant="subtitle1" fontWeight="bold">TP</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", border: "1px solid #a5d6a7", position: 'relative', overflow: 'hidden' }}>
            <Groups sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, color: '#4caf50', opacity: 0.1, transform: 'rotate(-15deg)' }} />
            <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
              <Typography variant="body2" color="success.dark" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Squad Size</Typography>
              <Typography variant="h4" fontWeight="900" color="success.dark">{squad.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", border: "1px solid #ffcc80", height: '100%' }}>
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="warning.dark" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Grade Mix</Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} mt="auto">
                {gradeSummary.length > 0 ? (
                  gradeSummary.map((g) => (
                    <Chip key={g.label} label={`${g.label}:${g.count}`} size="small"
                      sx={{ background: g.gradient, color: g.label === "E" ? "#333" : "white", fontWeight: "800", height: 20, fontSize: '0.65rem', border: 'none' }} />
                  ))
                ) : (
                  <Typography variant="caption" color="warning.dark" sx={{ fontStyle: 'italic', opacity: 0.7 }}>Empty</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Squad Grid */}
      {squad.length === 0 ? (
        <Paper elevation={0} sx={{ p: 8, textAlign: "center", borderRadius: 4, bgcolor: 'rgba(0,0,0,0.02)', border: '2px dashed rgba(0,0,0,0.1)' }}>
          <SportsSoccer sx={{ fontSize: 60, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
          <Typography variant="h5" color="text.secondary" fontWeight="bold" mb={1}>Your bench is empty</Typography>
          <Typography variant="body1" color="text.secondary">Head over to the Auction board and start building your ultimate squad!</Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {squad.map((player) => {
            const grade = getDynamicGrade(player.playerOvr);
            const isLoan = player.isLoan;
            const isLoaned = player.status === "Loaned";
            const contractExpiringSoon = player.contractUntil &&
              new Date(player.contractUntil) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={player.squadId ?? player.playerId}>
                <Card sx={{
                  borderRadius: 4,
                  position: 'relative',
                  boxShadow: `0 8px 24px rgba(0,0,0,0.06)`,
                  border: `1px solid ${isLoan ? '#ff980040' : grade.color + '40'}`,
                  bgcolor: 'white',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  opacity: isLoaned ? 0.65 : 1,
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 16px 32px ${grade.bg}` }
                }}>
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
                    background: `linear-gradient(180deg, ${isLoan ? 'rgba(255,152,0,0.15)' : grade.bg} 0%, rgba(255,255,255,0) 100%)`,
                    zIndex: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16
                  }} />

                  {/* Status Badges */}
                  <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                    {isLoan && (
                      <Chip label="LOAN" size="small"
                        sx={{ bgcolor: '#ff9800', color: 'white', fontWeight: '800', fontSize: '0.6rem', height: 20 }} />
                    )}
                    {isLoaned && (
                      <Chip label="LOANED OUT" size="small"
                        sx={{ bgcolor: '#78909c', color: 'white', fontWeight: '800', fontSize: '0.6rem', height: 20 }} />
                    )}
                    {contractExpiringSoon && (
                      <Chip label="EXPIRING" size="small"
                        sx={{ bgcolor: '#f44336', color: 'white', fontWeight: '800', fontSize: '0.6rem', height: 20 }} />
                    )}
                  </Box>

                  <CardContent sx={{ p: '24px !important', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Avatar className="player-avatar" src={`https://pesdb.net/assets/img/card/b${player.playerId}.png`}
                        variant="rounded" sx={{
                          width: 120, height: 170, bgcolor: 'transparent',
                          filter: `drop-shadow(0 12px 16px ${grade.bg})`,
                          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          '& img': { objectFit: 'contain' }
                        }}>
                        <SportsSoccer sx={{ fontSize: 60, color: 'grey.300' }} />
                      </Avatar>
                    </Box>

                    {(player.contractUntil || player.loanExpiry) && (
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, fontSize: '0.65rem' }}>
                        {player.isLoan ? `Ends: ${formatDateTime(player.loanExpiry)}` : `Until: ${formatDateTime(player.contractUntil)}`}
                      </Typography>
                    )}

                    <Box display="flex" gap={3} alignItems="center" mt="auto" width="100%" justifyContent="center">
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Typography variant="overline" lineHeight={1} color="text.secondary" fontWeight="700" mb={0.5}>GRADE</Typography>
                        <Chip label={grade.label} size="medium"
                          sx={{ background: grade.gradient, color: grade.label === 'E' ? '#333' : 'white', fontWeight: '900', fontSize: '1.2rem', border: `2px solid white`, boxShadow: `0 2px 8px ${grade.bg}`, minWidth: 40 }} />
                      </Box>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Typography variant="overline" lineHeight={1} color="text.secondary" fontWeight="700" mb={0.5}>COST (TP)</Typography>
                        <Typography variant="h5" fontWeight="900" sx={{ color: 'primary.main', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                          {player.pricePaid?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── Transaction History Dialog (Popup) ────────────────────────────────── */}
      <Dialog
        open={txOpen}
        onClose={() => setTxOpen(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: '#f8fafc',
            backgroundImage: 'none',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            bgcolor: 'white',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            py: 2
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
             <Typography variant="h6" fontWeight="900" color="text.primary">Transaction History</Typography>
             <Chip label={totalTx} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
          </Box>
          <IconButton onClick={() => setTxOpen(false)} size="small" sx={{ bgcolor: 'grey.50' }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
          {/* Wallet Balance Banner */}
          <Box sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.2,
            boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.2)'
          }}>
            <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 900, letterSpacing: 1, fontSize: '0.65rem' }}>Available TP Balance</Typography>
            <Box display="flex" justifyContent="space-between" alignItems="baseline">
              <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: -0.5 }}>
                {wallet?.availableBalance?.toLocaleString() || 0}
                <Typography component="span" variant="h6" sx={{ ml: 0.5, opacity: 0.8 }}>TP</Typography>
              </Typography>
              {wallet?.reservedBalance > 0 && (
                <Typography variant="caption" sx={{ bgcolor: 'rgba(255,255,255,0.1)', px: 1.5, py: 0.5, borderRadius: 5, fontWeight: 700 }}>
                   Reserved: {wallet.reservedBalance.toLocaleString()} TP
                </Typography>
              )}
            </Box>
          </Box>

          {transactions.length === 0 && !txLoading ? (
            <Box p={8} textAlign="center">
              <History sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.2 }} />
              <Typography color="text.secondary" fontWeight="bold">No transactions yet</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {Object.keys(groupedTransactions).map((date) => (
                <Box key={date}>
                  <Typography variant="overline" sx={{ px: 3, py: 1.5, display: 'block', fontWeight: 900, color: 'text.secondary', bgcolor: alpha('#f1f5f9', 0.5) }}>
                    {date}
                  </Typography>
                  <List sx={{ p: 0, bgcolor: 'white' }}>
                    {groupedTransactions[date].map((tx, idx) => {
                      const meta = TX_TYPE_META[tx.type] || { label: tx.type, icon: <Stars fontSize="small" />, color: "#64748b", bg: "#f1f5f9" };
                      const isCredit = tx.direction === "CREDIT";

                      return (
                        <React.Fragment key={tx.transactionId}>
                          <ListItem sx={{ px: 3, py: 2 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: meta.bg, color: meta.color, width: 44, height: 44, borderRadius: 1.5, border: `1px solid ${alpha(meta.color, 0.1)}` }}>
                                {meta.icon}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="subtitle2" fontWeight="900" sx={{ color: 'text.primary' }}>{meta.label}</Typography>
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="subtitle1" fontWeight="900" sx={{ color: isCredit ? '#10b981' : '#ef4444', lineHeight: 1 }}>
                                      {isCredit ? '+' : '-'}{tx.amount.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', opacity: 0.9 }}>
                                      {tx.balanceAfter.toLocaleString()} <Box component="span" sx={{ fontSize: '0.6rem', opacity: 0.6 }}>TP</Box>
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.3}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {tx.description} • {formatTimeOnly(tx.createdAt)}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                          {idx < groupedTransactions[date].length - 1 && <Divider variant="inset" component="li" sx={{ borderStyle: 'dashed', opacity: 0.3 }} />}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Box>
              ))}
              
              {hasMoreTx && (
                <Box p={3} textAlign="center">
                   <Button variant="outlined" size="small" onClick={handleLoadMore} disabled={txLoading} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>
                     {txLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                     {txLoading ? 'Loading...' : 'Load More Transactions'}
                   </Button>
                </Box>
              )}
              
              {!hasMoreTx && transactions.length > 0 && (
                <Box p={4} textAlign="center">
                  <Typography variant="caption" color="text.disabled" fontWeight="bold">You've reached the end of your history</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MySquadPage;
