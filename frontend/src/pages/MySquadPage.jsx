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
  TextField,
  DialogActions,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  SportsSoccer,
  Groups,
  AccountBalanceWallet,
  EmojiEvents,
  Stars,
  History,
  Close,
  Autorenew,
  Gavel,
  CompareArrows,
  Security,
  Payments,
  CardGiftcard,
  Handshake,
  Cancel,
  Wallet,
  Diversity3,
  LocalOffer,
  MoreVert,
  Bolt,
  MonetizationOn,
  Campaign,
  WarningAmber,
} from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";
import { checkMarketOpen } from "../utils/marketUtils";
import { getPesdbLinkFromUrl, getPlayerCardUrl } from "../utils/imageUtils";

const getPesdbLink = getPesdbLinkFromUrl;

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const GRADE_STYLE_MAP = {
  S: {
    color: "#ffb300",
    bg: "rgba(255,179,0,0.15)",
    gradient: "linear-gradient(135deg, #ffe082 0%, #ffb300 100%)",
  },
  A: {
    color: "#f4511e",
    bg: "rgba(244,81,30,0.15)",
    gradient: "linear-gradient(135deg, #ffab91 0%, #f4511e 100%)",
  },
  B: {
    color: "#8e24aa",
    bg: "rgba(142,36,170,0.15)",
    gradient: "linear-gradient(135deg, #ce93d8 0%, #8e24aa 100%)",
  },
  C: {
    color: "#1e88e5",
    bg: "rgba(30,136,229,0.15)",
    gradient: "linear-gradient(135deg, #90caf9 0%, #1e88e5 100%)",
  },
  D: {
    color: "#43a047",
    bg: "rgba(67,160,71,0.15)",
    gradient: "linear-gradient(135deg, #a5d6a7 0%, #43a047 100%)",
  },
  E: {
    color: "#757575",
    bg: "rgba(117,117,117,0.15)",
    gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)",
  },
  DEFAULT: {
    color: "#9e9e9e",
    bg: "rgba(158,158,158,0.12)",
    gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)",
  },
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

const TX_TYPE_META = {
  AUCTION_BID: {
    label: "Auction Bid",
    icon: <Gavel fontSize="small" />,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  AUCTION_REFUND: {
    label: "Auction Refund",
    icon: <Payments fontSize="small" />,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  AUCTION_WIN: {
    label: "Auction Victory",
    icon: <EmojiEvents fontSize="small" />,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  TRANSFER_BUY: {
    label: "Player Buy",
    icon: <CompareArrows fontSize="small" />,
    color: "#ef4444",
    bg: "#fef2f2",
  },
  TRANSFER_SELL: {
    label: "Player Sell",
    icon: <CompareArrows fontSize="small" />,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  BONUS: {
    label: "Special Bonus",
    icon: <CardGiftcard fontSize="small" />,
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  CONTRACT_RENEWAL: {
    label: "Contract Renewal",
    icon: <Autorenew fontSize="small" />,
    color: "#6366f1",
    bg: "#eef2ff",
  },
  LOAN_FEE: {
    label: "Loan Fee Paid",
    icon: <Handshake fontSize="small" />,
    color: "#f97316",
    bg: "#fff7ed",
  },
  LOAN_INCOME: {
    label: "Loan Income",
    icon: <Handshake fontSize="small" />,
    color: "#10b981",
    bg: "#ecfdf5",
  },
  FREE_RELEASE: {
    label: "Contract Terminated",
    icon: <Cancel fontSize="small" />,
    color: "#64748b",
    bg: "#f1f5f9",
  },
  ADJUSTMENT: {
    label: "Balance Adjustment",
    icon: <Security fontSize="small" />,
    color: "#64748b",
    bg: "#f8fafc",
  },
};

const MySquadPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [squad, setSquad] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [marketSummary, setMarketSummary] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [hasMoreTx, setHasMoreTx] = useState(true);
  const [totalTx, setTotalTx] = useState(0);

  const [loading, setLoading] = useState(true);
  const [txOpen, setTxOpen] = useState(false);

  // Offers State
  const [incomingOffers, setIncomingOffers] = useState([]);
  const [outgoingOffers, setOutgoingOffers] = useState([]);

  // List Dialog State
  const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedPlayerForList, setSelectedPlayerForList] = useState(null);
  const [listPrice, setListPrice] = useState("");

  // Menu State for 3-dots
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuPlayer, setMenuPlayer] = useState(null);

  // Renewal Detail Dialog State
  const [renewalOpen, setRenewalOpen] = useState(false);

  // Release Dialog State
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [playerToRelease, setPlayerToRelease] = useState(null);

  const handleOpenMenu = (event, player) => {
    setMenuAnchor(event.currentTarget);
    setMenuPlayer(player);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuPlayer(null);
  };

  const handleMenuAction = (action) => {
    const player = menuPlayer;
    handleCloseMenu();
    
    if (action === "list") handleOpenList(player);
    if (action === "delist") handleDelist(player);
    if (action === "release") handleOpenRelease(player);
  };

  const handleOpenRelease = (player) => {
    if (player.isLoan || player.status === "Loaned") {
      enqueueSnackbar("Loaned players cannot be released", { variant: "error" });
      return;
    }
    setPlayerToRelease(player);
    setReleaseDialogOpen(true);
  };

  const handleConfirmRelease = async () => {
    if (!playerToRelease) return;
    
    try {
      const q = quotas.find(q => {
        const min = q.minOvr ?? q.minOVR ?? q.MinOVR;
        const max = q.maxOvr ?? q.maxOVR ?? q.MaxOVR;
        return playerToRelease.playerOvr >= min && playerToRelease.playerOvr <= max;
      });
      
      const releasePercent = q?.releasePercent ?? q?.ReleasePercent ?? 0;
      const refund = Math.floor((playerToRelease.pricePaid || 0) * releasePercent / 100);
      
      await auctionService.releasePlayer(playerToRelease.squadId, refund);
      enqueueSnackbar(`Player released. Refunded ${refund.toLocaleString()} TP.`, { variant: "success" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to release player.", { variant: "error" });
    } finally {
      setReleaseDialogOpen(false);
      setPlayerToRelease(null);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getSummary();
      const data = res?.data || {};

      const squadData = (data.squad || []).sort((a, b) => {
        if (b.playerOvr !== a.playerOvr) return b.playerOvr - a.playerOvr;
        return a.playerName.localeCompare(b.playerName);
      });
      setSquad(squadData);
      setQuotas(data.quotas || []);
      setWallet(data.wallet || null);
      setMarketSummary(data);
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
      const newItems =
        data.items || data.Items || (Array.isArray(data) ? data : []);
      const totalCount =
        data.totalCount ||
        data.TotalCount ||
        (Array.isArray(data) ? data.length : 0);

      if (page === 1) {
        setTransactions(newItems);
      } else {
        setTransactions((prev) => [...prev, ...newItems]);
      }

      setTotalTx(totalCount);
      setHasMoreTx(transactions.length + newItems.length < totalCount);
      setTxPage(page);
    } catch (err) {
      enqueueSnackbar("Failed to load transaction history", {
        variant: "error",
      });
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (txOpen) {
      fetchTransactions(1);
      // Refresh wallet balance when opening transactions
      auctionService
        .getWallet()
        .then((res) => setWallet(res?.data || null))
        .catch(() => {});
    }
  }, [txOpen]);

  const handleLoadMore = () => {
    if (!txLoading && hasMoreTx) {
      fetchTransactions(txPage + 1);
    }
  };

  const handleOpenList = (player) => {
    const market = checkMarketOpen(marketSummary);
    if (!market.isOpen) {
      enqueueSnackbar(market.message, { variant: "error" });
      return;
    }
    setSelectedPlayerForList(player);
    setListPrice(player.pricePaid || 1);
    setListModalOpen(true);
  };

  const handleCloseList = () => {
    setListModalOpen(false);
    setSelectedPlayerForList(null);
  };

  const submitListPlayer = async () => {
    if (!listPrice || isNaN(listPrice) || parseInt(listPrice) <= 0) {
      enqueueSnackbar("Please enter a valid listing price.", { variant: "warning" });
      return;
    }
    try {
      await auctionService.listPlayer(selectedPlayerForList.squadId, parseInt(listPrice));
      enqueueSnackbar(`Listed ${selectedPlayerForList.playerName} for sale.`, { variant: "success" });
      handleCloseList();
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleDelist = async (player) => {
    const confirm = window.confirm(`Cancel listing for ${player.playerName}?`);
    if (!confirm) return;
    try {
      await auctionService.delistPlayer(player.squadId);
      enqueueSnackbar(`Listing canceled successfully.`, { variant: "success" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleRespondOffer = async (offerId, accept) => {
    const confirmMsg = accept ? "Confirm and accept this offer?" : "Decline this offer?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await auctionService.respondOffer(offerId, accept);
      enqueueSnackbar(accept ? "Offer accepted successfully." : "Offer declined.", { variant: "success" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const handleCancelOffer = async (offerId) => {
    if (!window.confirm("Cancel this offer?")) return;
    try {
      await auctionService.cancelOffer(offerId);
      enqueueSnackbar("Offer canceled.", { variant: "info" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    }
  };

  const getDynamicGrade = (ovr) => {
    const quota = quotas.find((q) => {
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

  // Renewal cost per player: pricePaid × grade.renewalPercent / 100
  const renewalDetails = squad
    .filter(p => !p.isLoan) // don't count loaned-in players
    .map(p => {
      const quota = quotas.find(q => {
        const min = q.minOvr ?? q.minOVR ?? q.MinOVR;
        const max = q.maxOvr ?? q.maxOVR ?? q.MaxOVR;
        return p.playerOvr >= min && p.playerOvr <= max;
      });
      const renewalPercent = quota?.renewalPercent ?? quota?.RenewalPercent ?? 0;
      const gradeName = quota?.gradeName ?? quota?.GradeName ?? '-';
      const cost = Math.round((p.pricePaid ?? 0) * renewalPercent / 100);
      return { 
        name: p.playerName, 
        gradeName, 
        pricePaid: p.pricePaid ?? 0, 
        renewalPercent, 
        cost,
        seasonsWithTeam: p.seasonsWithTeam ?? 0
      };
    })
    .sort((a, b) => b.cost - a.cost);
  const totalRenewalCost = renewalDetails.reduce((s, r) => s + r.cost, 0);

  const gradeSummary = quotas.map((q) => {
    const style = GRADE_STYLE_MAP[q.gradeName] || GRADE_STYLE_MAP["DEFAULT"];
    return {
      label: q.gradeName,
      count: squad.filter(
        (p) =>
          p.playerOvr >= (q.minOVR ?? q.MinOVR) &&
          p.playerOvr <= (q.maxOVR ?? q.MaxOVR),
      ).length,
      ...style,
    };
  });

  const positionSummary = squad.reduce((summary, player) => {
    const position =
      player.playerPosition ??
      player.position ??
      player.playerPos ??
      player.pos ??
      "UNK";
    summary[position] = (summary[position] || 0) + 1;
    return summary;
  }, {});
  const sortedPositionSummary = Object.entries(positionSummary).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const positionGroups = [
    ["GK"],
    ["CB", "RB", "LB"],
    ["DMF", "CMF", "RMF", "LMF", "AMF"],
    ["LWF", "RWF", "SS", "CF"],
  ];

  const formatDateTime = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatTimeOnly = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const groupedTransactions = (
    Array.isArray(transactions) ? transactions : []
  ).reduce((groups, tx) => {
    const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              My Team
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MANAGE YOUR CLUB ROSTER
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <Button
            variant="outlined"
            disableElevation
            startIcon={<History />}
            onClick={() => setTxOpen(true)}
            sx={{
              borderRadius: '12px',
              borderColor: "divider",
              color: "text.primary",
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              height: 42,
              transition: 'all 0.2s',
              "&:hover": { 
                bgcolor: "grey.50", 
                borderColor: "text.primary",
                transform: 'translateY(-1px)'
              },
            }}
          >
            TP Statement
          </Button>
          <Box
            sx={{
              px: 2.5,
              borderRadius: '12px',
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              border: "1px solid",
              borderColor: "divider",
              color: "text.primary",
              height: 42,
              bgcolor: 'rgba(255,255,255,0.5)',
            }}
          >
            <Groups sx={{ fontSize: "1.2rem", color: "primary.main" }} />
            <Typography variant="body2" fontWeight="800" sx={{ letterSpacing: 0.5 }}>
              {marketSummary?.currentSquadCount || squad.filter(p => p.status !== 'Loaned').length} / {marketSummary?.maxSquadSize || 23}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 2.5,
              borderRadius: '12px',
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              border: "1px solid",
              borderColor: "divider",
              color: "text.primary",
              height: 42,
              bgcolor: 'rgba(255,255,255,0.5)',
            }}
          >
            <Handshake sx={{ fontSize: "1.2rem", color: "warning.main" }} />
            <Typography variant="body2" fontWeight="800" sx={{ letterSpacing: 0.5 }}>
              Loans: {squad.filter(p => p.status === 'Loaned').length} / 2
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Unified Dashboard (Glassmorphism Style) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 5,
          borderRadius: 1,
          background:
            "linear-gradient(135deg, rgba(8, 24, 48, 0.8) 100%, rgba(38, 57, 102, 0.9) 0%)",
          backdropFilter: "blur(12px)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            zIndex: 0,
          }}
        />

        <Grid
          container
          spacing={1}
          alignItems="stretch"
          sx={{ position: "relative", zIndex: 1 }}
        >
          {/* Balance Section */}
          <Grid item xs={12} md={2} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.2,
                p: 1.2,
                borderRadius: 1,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.16) 100%)",
                border: "1px solid rgba(255,255,255,0.34)",
                backdropFilter: "blur(6px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 22px rgba(2,6,23,0.2)",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  mt: 0.2,
                  p: 1.2,
                  borderRadius: 1,
                  bgcolor: "rgba(14,165,233,0.18)",
                  color: "#0284c7",
                  border: "1px solid rgba(125,211,252,0.55)",
                }}
              >
                <Wallet />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.86)",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    display: "block",
                    mb: 0.4,
                  }}
                >
                  Available Balance
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="900"
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.6,
                    letterSpacing: -0.4,
                    color: "white",
                  }}
                >
                  {wallet?.availableBalance?.toLocaleString() || 0}{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    fontWeight="bold"
                    sx={{ opacity: 0.86, color: "rgba(255,255,255,0.9)" }}
                  >
                    TP
                  </Typography>
                </Typography>
                {wallet?.reservedBalance > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.35,
                      display: "block",
                      color: "rgba(255,255,255,0.82)",
                      fontWeight: 700,
                    }}
                  >
                    Reserved {wallet.reservedBalance.toLocaleString()} TP
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Investment Section */}
          <Grid item xs={12} md={2} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.2,
                p: 1.2,
                borderRadius: 1,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.16) 100%)",
                border: "1px solid rgba(255,255,255,0.34)",
                backdropFilter: "blur(6px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 22px rgba(2,6,23,0.2)",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  mt: 0.2,
                  p: 1.2,
                  borderRadius: 1,
                  bgcolor: "rgba(22,163,74,0.18)",
                  color: "#16a34a",
                  border: "1px solid rgba(134,239,172,0.55)",
                }}
              >
                <AccountBalanceWallet />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.86)",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    display: "block",
                    mb: 0.4,
                  }}
                >
                  Investment
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="900"
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.6,
                    letterSpacing: -0.4,
                    color: "white",
                  }}
                >
                  {totalSpent.toLocaleString()}{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    fontWeight="bold"
                    sx={{ opacity: 0.86, color: "rgba(255,255,255,0.9)" }}
                  >
                    TP
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Grade Section */}
          <Grid item xs={12} md={3} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 1,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.16) 100%)",
                border: "1px solid rgba(255,255,255,0.34)",
                backdropFilter: "blur(6px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 22px rgba(2,6,23,0.2)",
                height: "100%",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.86)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  mb: 0.8,
                  display: "block",
                }}
              >
                Grade
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.55 }}>
                {gradeSummary.length > 0 ? (
                  <>
                    {gradeSummary.map((g) => (
                      <Box
                        key={g.label}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          borderRadius: 0.75,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.32)",
                          bgcolor: "rgba(255,255,255,0.14)",
                          height: 30,
                        }}
                      >
                        <Box
                          sx={{
                            px: 1.25,
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            background: g.gradient,
                            color: g.label === "E" ? "#333" : "white",
                            fontWeight: 900,
                            fontSize: "0.75rem",
                          }}
                        >
                          {g.label}
                        </Box>
                        <Box
                          sx={{
                            px: 1.15,
                            fontWeight: 900,
                            fontSize: "0.82rem",
                            color: "white",
                          }}
                        >
                          {g.count}
                        </Box>
                      </Box>
                    ))}
                  </>
                ) : (
                  <Typography variant="caption" sx={{ opacity: 0.4 }}>
                    No players drafted
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Position Section */}
          <Grid item xs={12} md={3} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 1,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.16) 100%)",
                border: "1px solid rgba(255,255,255,0.34)",
                backdropFilter: "blur(6px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 22px rgba(2,6,23,0.2)",
                height: "100%",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.86)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  mb: 0.8,
                  display: "block",
                }}
              >
                Position
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 0.7,
                  px: 0,
                  py: 0,
                  color: "rgba(255,255,255,0.88)",
                  overflowX: "auto",
                  overflowY: "hidden",
                  "&::-webkit-scrollbar": { height: 4 },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(255,255,255,0.22)",
                    borderRadius: 999,
                  },
                }}
              >
                {positionGroups.flat().map((pos) => (
                  (() => {
                    const group =
                      positionGroups[0].includes(pos)
                        ? "GK"
                        : positionGroups[1].includes(pos)
                          ? "DEF"
                          : positionGroups[2].includes(pos)
                            ? "MID"
                            : "ATT";
                    const style = POSITION_GROUP_STYLE[group];
                    return (
                      <Box
                        key={`position-card-${pos}`}
                        sx={{
                          minWidth: 34,
                          height: 36,
                          px: 0.45,
                          borderRadius: 0.75,
                          border: `1px solid ${style.border}`,
                          bgcolor: style.bg,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "0 0 auto",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.56rem",
                            fontWeight: 700,
                            lineHeight: 1,
                            color: style.label,
                            letterSpacing: 0.2,
                          }}
                        >
                          {pos}</Typography><Typography variant="caption" sx={{ mt: 0.25, fontSize: "0.74rem", fontWeight: 900, lineHeight: 1, color: "white" }}>{positionSummary[pos] || 0}
                        </Typography>
                      </Box>
                    );
                  })()
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Renewal Section */}
          <Grid item xs={12} md={2} sx={{ minWidth: 0 }}>
            <Box
              onClick={() => setRenewalOpen(true)}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.2,
                p: 1.2,
                borderRadius: 1,
                background: "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.16) 100%)",
                border: "1px solid rgba(255,255,255,0.34)",
                backdropFilter: "blur(6px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 22px rgba(2,6,23,0.2)",
                height: "100%",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { 
                  transform: "translateY(-4px)", 
                  background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 15px 30px rgba(0,0,0,0.3)" 
                },
              }}
            >
              <Box
                sx={{
                  mt: 0.2,
                  p: 1.2,
                  borderRadius: 1,
                  bgcolor: "rgba(167,139,250,0.18)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(167,139,250,0.55)",
                }}
              >
                <Autorenew />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.86)",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    display: "block",
                    mb: 0.4,
                  }}
                >
                  Renewal Cost
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight="900"
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.6,
                    letterSpacing: -0.4,
                    color: "#c4b5fd",
                  }}
                >
                  {totalRenewalCost.toLocaleString()}{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    fontWeight="bold"
                    sx={{ opacity: 0.86, color: "rgba(196,181,253,0.9)" }}
                  >
                    TP
                  </Typography>
                </Typography>
                {renewalDetails.length > 0 && renewalDetails.every(r => r.renewalPercent === 0) ? (
                  <Typography variant="caption" sx={{ mt: 0.35, display: "block", color: "#fbbf24", fontWeight: 700, fontSize: '0.65rem' }}>
                    ⚠️ No Percent Set
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ mt: 0.35, display: "block", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: '0.65rem' }}>
                    Click for breakdown
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Squad Grid */}
      {squad.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: "center",
            borderRadius: 3,
            bgcolor: "rgba(0,0,0,0.02)",
            border: "1px dashed rgba(0,0,0,0.1)",
          }}
        >
          <SportsSoccer
            sx={{ fontSize: 60, color: "text.disabled", mb: 2, opacity: 0.5 }}
          />
          <Typography
            variant="h5"
            color="text.secondary"
            fontWeight="bold"
            mb={1}
          >
            Your bench is empty
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Head over to the Auction board and start building your ultimate
            squad!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={1}>
          {squad.map((player) => {
            const grade = getDynamicGrade(player.playerOvr);
            const isLoan = player.isLoan;
            const isLoaned = player.status === "Loaned";
            const contractExpiringSoon =
              player.contractUntil &&
              new Date(player.contractUntil) <
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            return (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                lg={3}
                key={player.squadId ?? player.playerId}
              >
                <Card
                  sx={{
                    borderRadius: 2,
                    position: "relative",
                    boxShadow: `0 8px 24px rgba(0,0,0,0.06)`,
                    border: `1px solid ${isLoan ? "#ff980040" : grade.color + "40"}`,
                    bgcolor: "white",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    overflow: "hidden",
                    opacity: isLoaned ? 0.65 : 1,
                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow: `0 16px 32px ${grade.bg}`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "45%",
                      background: `linear-gradient(180deg, ${isLoan ? "rgba(255,152,0,0.15)" : grade.bg} 0%, rgba(255,255,255,0) 100%)`,
                      zIndex: 0,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                    }}
                  />

                  {/* Status Badges */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      zIndex: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      alignItems: "flex-start",
                    }}
                  >
                    {isLoan && (
                      <Chip
                        label="LOAN"
                        size="small"
                        sx={{
                          bgcolor: "#ff9800",
                          color: "white",
                          fontWeight: "800",
                          fontSize: "0.6rem",
                          height: 20,
                        }}
                      />
                    )}
                    {isLoaned && (
                      <Chip
                        label="LOANED OUT"
                        size="small"
                        sx={{
                          bgcolor: "#78909c",
                          color: "white",
                          fontWeight: "800",
                          fontSize: "0.6rem",
                          height: 20,
                        }}
                      />
                    )}
                    {contractExpiringSoon && (
                      <Chip
                        label="EXPIRING"
                        size="small"
                        sx={{
                          bgcolor: "#f44336",
                          color: "white",
                          fontWeight: "800",
                          fontSize: "0.6rem",
                          height: 20,
                        }}
                      />
                    )}
                  </Box>

                  <CardContent
                    sx={{
                      p: "12px !important",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <Box 
                      sx={{ position: "relative", mb: 2 }}
                      component={getPesdbLink(player.imageUrl || getPlayerCardUrl(player.playerId)) ? "a" : "div"}
                      href={getPesdbLink(player.imageUrl || getPlayerCardUrl(player.playerId))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Avatar
                        className="player-avatar"
                        src={player.imageUrl || getPlayerCardUrl(player.playerId)}
                        variant="rounded"
                        sx={{
                          width: 120,
                          height: 170,
                          bgcolor: "transparent",
                          filter: `drop-shadow(0 12px 16px ${grade.bg})`,
                          transition:
                            "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          "& img": { objectFit: "contain" },
                        }}
                      >
                        <SportsSoccer
                          sx={{ fontSize: 60, color: "grey.300" }}
                        />
                      </Avatar>
                    </Box>

                    {(player.contractUntil || player.loanExpiry) && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mb: 1, fontSize: "0.65rem" }}
                      >
                        {player.isLoan
                          ? `Ends: ${formatDateTime(player.loanExpiry)}`
                          : `Until: ${formatDateTime(player.contractUntil)}`}
                      </Typography>
                    )}

                    <Box
                      display="flex"
                      gap={3}
                      alignItems="center"
                      mt="auto"
                      width="100%"
                      justifyContent="center"
                    >
                      <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                      >
                        <Typography
                          variant="overline"
                          lineHeight={1}
                          color="text.secondary"
                          fontWeight="700"
                          mb={0.5}
                        >
                          GRADE
                        </Typography>
                        <Chip
                          label={grade.label}
                          size="medium"
                          sx={{
                            background: grade.gradient,
                            color: grade.label === "E" ? "#333" : "white",
                            fontWeight: "900",
                            fontSize: "1.2rem",
                            border: `2px solid white`,
                            boxShadow: `0 2px 8px ${grade.bg}`,
                            minWidth: 40,
                          }}
                        />
                      </Box>
                      <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                      >
                        <Typography
                          variant="overline"
                          lineHeight={1}
                          color="text.secondary"
                          fontWeight="700"
                          mb={0.5}
                        >
                          COST (TP)
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight="900"
                          sx={{
                            color: "primary.main",
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {player.pricePaid?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  
                  {/* 3-Dots Action Button */}
                  <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMenu(e, player);
                      }} 
                      sx={{ 
                        color: "rgba(0,0,0,0.35)",
                        "&:hover": { 
                          bgcolor: "rgba(255,202,40,0.15)",
                          transform: "scale(1.3) rotate(360deg)",
                          color: "#ffa000",
                          filter: "drop-shadow(0 0 10px rgba(255,160,0,0.5))"
                        },
                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                      }}
                    >
                      <MonetizationOn fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 3-Dots Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2.5,
            minWidth: 200,
            boxShadow: "0 10px 40px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
            "& .MuiMenuItem-root": {
              fontSize: "0.875rem",
              fontWeight: 600,
              py: 1.5,
              px: 2,
              mx: 0.5,
              my: 0.2,
              borderRadius: 1.5,
              transition: "all 0.2s",
              "& .MuiSvgIcon-root": {
                fontSize: 18,
                mr: 1.5,
                opacity: 0.7
              },
              "&:hover": {
                bgcolor: alpha("#1e88e5", 0.08),
                color: "primary.main",
                "& .MuiSvgIcon-root": {
                  opacity: 1,
                  transform: "scale(1.1)"
                }
              }
            }
          }
        }}
      >
        {menuPlayer?.status === "Listed" ? (
          <MenuItem onClick={() => handleMenuAction("delist")} sx={{ color: "error.main" }}>
            <Cancel fontSize="small" /> Stop Selling
          </MenuItem>
        ) : (
          <MenuItem 
            onClick={() => handleMenuAction("list")} 
            disabled={menuPlayer?.isLoan || menuPlayer?.status === "Loaned"}
          >
            <LocalOffer fontSize="small" /> List for Sale
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => handleMenuAction("release")} 
          sx={{ color: "error.main" }}
          disabled={menuPlayer?.isLoan || menuPlayer?.status === "Loaned"}
        >
          <Cancel fontSize="small" sx={{ mr: 1.5 }} /> Release Player
        </MenuItem>
      </Menu>

      {/* ── Renewal Cost Detail Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={renewalOpen}
        onClose={() => setRenewalOpen(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "white",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" fontWeight="900" color="text.primary">
              Contract Renewal Cost
            </Typography>
            <Chip
              label={renewalDetails.length}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Box>
          <IconButton
            onClick={() => setRenewalOpen(false)}
            size="small"
            sx={{ bgcolor: "grey.50" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: "#f8fafc" }}>
          {/* Total Budget Banner (Matching TP Statement Style) */}
          <Box
            sx={{
              p: 3,
              background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #4c1d95 100%)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              gap: 0.35,
              boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                opacity: 0.86,
                fontWeight: 900,
                letterSpacing: 1.1,
                fontSize: "0.65rem",
                color: "#e9d5ff",
              }}
            >
              Estimated Renewal Budget
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="baseline">
              <Typography
                variant="h5"
                fontWeight="900"
                sx={{
                  letterSpacing: -0.5,
                  textShadow: "0 4px 16px rgba(139,92,246,0.35)",
                }}
              >
                {totalRenewalCost.toLocaleString()}
                <Typography
                  component="span"
                  variant="h6"
                  sx={{ ml: 0.5, opacity: 0.9, color: "#f3e8ff" }}
                >
                  TP
                </Typography>
              </Typography>
            </Box>
          </Box>

          {/* Per-player list */}
          <Box sx={{ maxHeight: 480, overflowY: "auto" }}>
            {renewalDetails.length === 0 ? (
              <Box p={4} textAlign="center">
                <Typography color="text.secondary">No player data found</Typography>
              </Box>
            ) : (
              renewalDetails.map((r, i) => {
                const gradeStyle = GRADE_STYLE_MAP[r.gradeName] || GRADE_STYLE_MAP["DEFAULT"];
                return (
                  <Box
                    key={i}
                    sx={{
                      display: "flex", alignItems: "center", px: 3, py: 1.6,
                      borderBottom: "1px solid rgba(0,0,0,0.04)",
                      "&:hover": { bgcolor: "rgba(99,102,241,0.04)" },
                      gap: 2,
                    }}
                  >
                    {/* Rank */}
                    <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, width: 18, textAlign: "center" }}>
                      {i + 1}
                    </Typography>

                    {/* Grade badge */}
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", background: gradeStyle.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Typography variant="caption" fontWeight="900" sx={{ color: r.gradeName === "E" ? "#333" : "white", fontSize: "0.7rem" }}>
                        {r.gradeName}
                      </Typography>
                    </Box>

                    {/* Name & Seasons */}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="700">
                        {r.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem" }}>
                        In Squad: {r.seasonsWithTeam} {r.seasonsWithTeam > 1 ? 'Seasons' : 'Season'}
                      </Typography>
                    </Box>

                    {/* Price paid */}
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: "right" }}>
                      {r.pricePaid.toLocaleString()} TP
                    </Typography>

                    {/* Percent */}
                    <Box sx={{ minWidth: 38, textAlign: "center" }}>
                      <Typography variant="caption" sx={{ bgcolor: "rgba(99,102,241,0.1)", color: "#6366f1", fontWeight: 800, px: 0.8, py: 0.2, borderRadius: 1 }}>
                        {r.renewalPercent}%
                      </Typography>
                    </Box>

                    {/* Cost */}
                    <Typography variant="body2" fontWeight="900" sx={{ color: r.cost > 0 ? "#7c3aed" : "text.disabled", minWidth: 64, textAlign: "right" }}>
                      {r.cost.toLocaleString()} TP
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "#fafafa" }}>
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
            * Excluding Loaned players
          </Typography>
          <Button onClick={() => setRenewalOpen(false)} variant="contained" disableElevation sx={{ borderRadius: 2, bgcolor: "#0f172a", px: 3, textTransform: "none", fontWeight: 800 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
            bgcolor: "#f8fafc",
            backgroundImage: "none",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "white",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" fontWeight="900" color="text.primary">
              Transaction History
            </Typography>
            <Chip
              label={totalTx}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Box>
          <IconButton
            onClick={() => setTxOpen(false)}
            size="small"
            sx={{ bgcolor: "grey.50" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: "#f8fafc" }}>
          {/* Wallet Balance Banner */}
          <Box
            sx={{
              p: 3,
              background:
                "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f172a 100%)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              gap: 0.35,
              boxShadow:
                "inset 0 -10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <Typography
              variant="overline"
              sx={{
                opacity: 0.86,
                fontWeight: 900,
                letterSpacing: 1.1,
                fontSize: "0.65rem",
                color: "#bfdbfe",
              }}
            >
              Available TP Balance
            </Typography>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Typography
                variant="h5"
                fontWeight="900"
                sx={{
                  letterSpacing: -0.5,
                  textShadow: "0 4px 16px rgba(59,130,246,0.35)",
                }}
              >
                {wallet?.availableBalance?.toLocaleString() || 0}
                <Typography
                  component="span"
                  variant="h6"
                  sx={{ ml: 0.5, opacity: 0.9, color: "#dbeafe" }}
                >
                  TP
                </Typography>
              </Typography>
              {wallet?.reservedBalance > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: "rgba(15,23,42,0.45)",
                    border: "1px solid rgba(191,219,254,0.35)",
                    color: "#dbeafe",
                    px: 1.4,
                    py: 0.45,
                    borderRadius: 5,
                    fontWeight: 800,
                  }}
                >
                  Reserved: {wallet.reservedBalance.toLocaleString()} TP
                </Typography>
              )}
            </Box>
          </Box>

          {transactions.length === 0 && !txLoading ? (
            <Box p={8} textAlign="center">
              <History
                sx={{
                  fontSize: 64,
                  color: "text.disabled",
                  mb: 2,
                  opacity: 0.2,
                }}
              />
              <Typography color="text.secondary" fontWeight="bold">
                No transactions yet
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: "65vh", overflowY: "auto" }}>
              {Object.keys(groupedTransactions).map((date) => (
                <Box key={date}>
                  <Typography
                    variant="overline"
                    sx={{
                      px: 3,
                      py: 1.5,
                      display: "block",
                      fontWeight: 900,
                      color: "text.secondary",
                      bgcolor: alpha("#f1f5f9", 0.5),
                    }}
                  >
                    {date}
                  </Typography>
                  <List sx={{ p: 0, bgcolor: "white" }}>
                    {groupedTransactions[date].map((tx, idx) => {
                      const meta = TX_TYPE_META[tx.type] || {
                        label: tx.type,
                        icon: <Stars fontSize="small" />,
                        color: "#64748b",
                        bg: "#f1f5f9",
                      };
                      const isCredit = tx.direction === "CREDIT";

                      return (
                        <React.Fragment key={tx.transactionId}>
                          <ListItem sx={{ px: 3, py: 2 }}>
                            <ListItemAvatar>
                              <Avatar
                                sx={{
                                  bgcolor: meta.bg,
                                  color: meta.color,
                                  width: 44,
                                  height: 44,
                                  borderRadius: 1.5,
                                  border: `1px solid ${alpha(meta.color, 0.1)}`,
                                }}
                              >
                                {meta.icon}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="900"
                                    sx={{ color: "text.primary" }}
                                  >
                                    {meta.label}
                                  </Typography>
                                  <Box sx={{ textAlign: "right" }}>
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight="900"
                                      sx={{
                                        color: isCredit ? "#10b981" : "#ef4444",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {isCredit ? "+" : "-"}
                                      {tx.amount.toLocaleString()}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 800,
                                        color: "text.primary",
                                        opacity: 0.9,
                                      }}
                                    >
                                      {tx.balanceAfter.toLocaleString()}{" "}
                                      <Box
                                        component="span"
                                        sx={{
                                          fontSize: "0.6rem",
                                          opacity: 0.6,
                                        }}
                                      >
                                        TP
                                      </Box>
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  mt={0.3}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {tx.description} •{" "}
                                    {formatTimeOnly(tx.createdAt)}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                          {idx < groupedTransactions[date].length - 1 && (
                            <Divider
                              variant="inset"
                              component="li"
                              sx={{ borderStyle: "dashed", opacity: 0.3 }}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Box>
              ))}

              {hasMoreTx && (
                <Box p={3} textAlign="center">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleLoadMore}
                    disabled={txLoading}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 800,
                    }}
                  >
                    {txLoading ? (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    ) : null}
                    {txLoading ? "Loading..." : "Load More Transactions"}
                  </Button>
                </Box>
              )}

              {!hasMoreTx && transactions.length > 0 && (
                <Box p={4} textAlign="center">
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    fontWeight="bold"
                  >
                    You've reached the end of your history
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ── List Player Dialog ──────────────────────────────────────────────── */}
      <Dialog open={listModalOpen} onClose={handleCloseList} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          List Player for Sale
          <IconButton onClick={handleCloseList} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPlayerForList && (
            <Box mb={3} textAlign="center">
              <Box
                component={getPesdbLink(selectedPlayerForList.imageUrl || getPlayerCardUrl(selectedPlayerForList.playerId)) ? "a" : "div"}
                href={getPesdbLink(selectedPlayerForList.imageUrl || getPlayerCardUrl(selectedPlayerForList.playerId))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Avatar 
                  src={selectedPlayerForList.imageUrl || getPlayerCardUrl(selectedPlayerForList.playerId)} 
                  sx={{ 
                    width: 80, height: 80, mx: "auto", mb: 1, border: "2px solid #ccc", 
                    "& img": { objectFit: "contain" },
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.05)" }
                  }} 
                  variant="rounded" 
                />
              </Box>
              <Typography variant="h6">{selectedPlayerForList.playerName}</Typography>
              <Typography variant="body2" color="text.secondary">Cost: {selectedPlayerForList.pricePaid?.toLocaleString() || 0} TP</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            label="Listing Price (TP)"
            type="number"
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseList} color="inherit">Cancel</Button>
          <Button onClick={submitListPlayer} variant="contained" color="success">List Now</Button>
        </DialogActions>
      </Dialog>
      {/* Release Confirmation Dialog */}
      <Dialog
        open={releaseDialogOpen}
        onClose={() => setReleaseDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 400 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(211, 47, 47, 0.1)', color: 'error.main', display: 'flex' }}>
            <WarningAmber />
          </Box>
          <Typography variant="h6" fontWeight="900">Release Player?</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            Are you sure you want to release <strong>{playerToRelease?.playerName}</strong> from your squad? 
            <br />
            The player will return to the Free Agent pool and you will receive a partial refund.
          </Typography>
          
          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed #e2e8f0' }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="text.secondary">Purchase Price:</Typography>
              <Typography variant="caption" fontWeight="bold">{(playerToRelease?.pricePaid || 0).toLocaleString()} TP</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="text.secondary">Release Refund %:</Typography>
              <Typography variant="caption" fontWeight="bold" color="success.main">
                {(() => {
                  const q = quotas.find(q => {
                    const min = q.minOvr ?? q.minOVR ?? q.MinOVR;
                    const max = q.maxOvr ?? q.maxOVR ?? q.MaxOVR;
                    return playerToRelease?.playerOvr >= min && playerToRelease?.playerOvr <= max;
                  });
                  return q?.releasePercent ?? q?.ReleasePercent ?? 0;
                })()}%
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight="900">You will get back:</Typography>
              <Typography variant="h6" fontWeight="900" color="success.main">
                {(() => {
                  const q = quotas.find(q => {
                    const min = q.minOvr ?? q.minOVR ?? q.MinOVR;
                    const max = q.maxOvr ?? q.maxOVR ?? q.MaxOVR;
                    return playerToRelease?.playerOvr >= min && playerToRelease?.playerOvr <= max;
                  });
                  const rate = q?.releasePercent ?? q?.ReleasePercent ?? 0;
                  return Math.floor((playerToRelease?.pricePaid || 0) * rate / 100).toLocaleString();
                })()} TP
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setReleaseDialogOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRelease} 
            variant="contained" 
            color="error"
            disableElevation
            sx={{ borderRadius: 2, fontWeight: 900, px: 3 }}
          >
            Confirm Release
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MySquadPage;
