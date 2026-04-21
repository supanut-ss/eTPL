import React, { useEffect, useState } from "react";

import {

  Box, Typography, Grid, Paper, Divider, List, ListItem, 

  ListItemAvatar, Avatar, ListItemText, Button, Chip, 

  CircularProgress, IconButton, Tooltip, Card, CardContent,

  Tab, Tabs, Badge,
  useMediaQuery, useTheme

} from "@mui/material";

import { 

  Handshake, LocalOffer, Cancel, CheckCircle, 

  AccountBalanceWallet, History, Campaign, Storefront,

  ArrowForward, ArrowBack, SwapHoriz, DeleteSweep

} from "@mui/icons-material";

import { useSnackbar } from "notistack";

import auctionService from "../services/auctionService";

import { useAuth } from "../store/AuthContext";

import { checkMarketOpen } from "../utils/marketUtils";

import { getPesdbLinkFromUrl } from "../utils/imageUtils";



const getPesdbLink = getPesdbLinkFromUrl;



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



const MarketOverviewPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const { enqueueSnackbar } = useSnackbar();

  

  const [loading, setLoading] = useState(true);

  const [incomingOffers, setIncomingOffers] = useState([]);

  const [outgoingOffers, setOutgoingOffers] = useState([]);

  const [myListings, setMyListings] = useState([]);

  const [wallet, setWallet] = useState(null);

  const [tabValue, setTabValue] = useState(0);

  const [quotas, setQuotas] = useState([]);

  const [marketSummary, setMarketSummary] = useState(null);



  const fetchData = async (isSilent = false) => {

    try {

      if (!isSilent) setLoading(true);

      

      // Load Offers

      const incomingRes = await auctionService.getIncomingOffers();

      setIncomingOffers(incomingRes?.data || []);

      

      const outgoingRes = await auctionService.getOutgoingOffers();

      setOutgoingOffers(outgoingRes?.data || []);



      // Load Summary (contains Wallet and Squad)

      const summary = await auctionService.getSummary();

      setMarketSummary(summary.data);

      setWallet(summary.data.wallet);

      setMyListings((summary.data.squad || []).filter(p => p.status === "Listed"));



      // Load Quotas

      const quotaRes = await auctionService.getQuotas();

      setQuotas(quotaRes?.data || []);



    } catch (err) {

      console.error(err);

      enqueueSnackbar("Failed to load market data", { variant: "error" });

    } finally {

      if (!isSilent) setLoading(false);

    }

  };



  useEffect(() => {

    if (user) fetchData();

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



  const isOfferActive = (offer) => {
    if (offer.status === "Cancelled") return false;

    // These statuses should be removed after 24 hours
    const terminalStatuses = ["Rejected", "Collapsed"];
    if (!terminalStatuses.includes(offer.status)) return true;

    

    // Check if updated more than 24 hours ago

    const referenceTime = offer.updatedAt ? new Date(offer.updatedAt) : new Date(offer.createdAt);

    const diffHours = (new Date() - referenceTime) / (1000 * 60 * 60);

    return diffHours < 24;

  };



  const handleRespondOffer = async (offerId, accept) => {

    try {
      await auctionService.respondOffer(offerId, accept);
      enqueueSnackbar(accept ? "Sale confirmed!" : "Offer rejected", { variant: accept ? "success" : "info" });
      await fetchData(true);
    } catch (err) {

      enqueueSnackbar(err.response?.data?.message || "Action failed", { variant: "error" });

    }

  };



  const handleCancelOffer = async (offerId) => {

    try {

      await auctionService.cancelOffer(offerId);
      enqueueSnackbar("Offer cancelled", { variant: "info" });
      await fetchData(true);

    } catch (err) {

      enqueueSnackbar("Failed to cancel offer", { variant: "error" });

    }

  };



  const handleDelist = async (player) => {

    try {

      await auctionService.delistPlayer(player.squadId);
      enqueueSnackbar(`Delisted ${player.playerName}`, { variant: "success" });
      await fetchData(true);

    } catch (err) {

      enqueueSnackbar("Failed to delist", { variant: "error" });

    }

  };



  if (loading) return (

    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">

      <CircularProgress />

    </Box>

  );



  return (

    <Box sx={{ pb: 8 }}>

      <Box sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "flex-end" }, 
        mb: 4, 
        flexDirection: { xs: "column", sm: "row" }, 
        gap: { xs: 3, sm: 0 } 
      }}>

        <Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>

                <Handshake color="primary" sx={{ fontSize: 36 }} />

                <Box>

                    <Typography variant="h4" fontWeight="bold">Transfer Center</Typography>

                    <Typography variant="body1" color="text.secondary">Manage your trades and offers</Typography>

                </Box>

            </Box>

        </Box>

        <Box sx={{ 

            display: "flex", 

            alignItems: "center", 

            gap: 1.5, 

            px: 2.5, 

            py: 1.2, 

            bgcolor: "grey.50", 

            borderRadius: 2.5, 

            border: "1px solid", 

            borderColor: "divider" 

        }}>

            <AccountBalanceWallet sx={{ color: "primary.main", fontSize: 24 }} />

            <Box>

                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: "block", lineHeight: 1, letterSpacing: 0.5 }}>MY BALANCE</Typography>

                <Typography variant="h6" fontWeight="900" color="text.primary" sx={{ lineHeight: 1.2 }}>

                    {wallet?.availableBalance?.toLocaleString()} <Typography component="span" variant="caption" fontWeight="bold" sx={{ opacity: 0.5 }}>TP</Typography>

                </Typography>

            </Box>

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



      <Box sx={{ mb: 4, borderBottom: '1px solid', borderColor: 'divider' }}>

          <Tabs 

            value={tabValue} 

            onChange={(e, v) => setTabValue(v)} 
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            allowScrollButtonsMobile

            sx={{ 

                "& .MuiTab-root": { 

                    fontWeight: 800, 

                    fontSize: { xs: "0.85rem", sm: "0.95rem" }, 

                    textTransform: "none", 

                    minHeight: 60,

                    color: 'text.secondary',

                    px: { xs: 2.5, sm: 4 },

                    transition: 'all 0.2s',

                    "&:hover": { color: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.02)' },

                    '&.Mui-selected': { color: 'primary.main' }

                },

                "& .MuiTabs-indicator": { height: 3, borderRadius: '3px 3px 0 0' }

            }}

          >

            <Tab icon={<Badge badgeContent={incomingOffers.length} color="error" sx={{ "& .MuiBadge-badge": { right: -8, top: 4 } }}><ArrowBack sx={{ fontSize: 20 }} /></Badge>} iconPosition="start" label="Incoming Offers" />

            <Tab icon={<ArrowForward sx={{ fontSize: 20 }} />} iconPosition="start" label="My Offers" />

            <Tab icon={<Storefront sx={{ fontSize: 20 }} />} iconPosition="start" label="Market Listings" />

          </Tabs>

      </Box>



  {/* Tab 0: Incoming Offers */}

      {tabValue === 0 && (

          incomingOffers.filter(isOfferActive).length === 0 ? (

                <Box sx={{ width: '100%', mt: 1 }}>

                    <Paper elevation={0} sx={{ 

                        width: '100%',

                        p: 10, textAlign: "center", borderRadius: 4, 

                        bgcolor: "rgba(2,6,23,0.02)", 

                        border: "1px dashed rgba(2,6,23,0.14)",

                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",

                        minHeight: 380

                    }}>

                        <Box sx={{ width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(2,6,23,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>

                            <Campaign sx={{ fontSize: 50, color: "rgba(2,6,23,0.55)", opacity: 0.35 }} />

                        </Box>

                        <Typography variant="h5" fontWeight="900" sx={{ color: "rgba(2,6,23,0.78)" }} gutterBottom>
                            No new offers at the moment
                        </Typography>

                        <Typography variant="body1" sx={{ color: "rgba(2,6,23,0.60)", maxWidth: 500 }}>
                            When someone makes an offer to you, it will appear here for confirmation.
                        </Typography>

                    </Paper>

                </Box>

            ) : (

                <Grid container spacing={2.5} >

                {incomingOffers.filter(isOfferActive).map(offer => {

                    const grade = getDynamicGrade(offer.playerOvr || 0);

                    return (

                        <Grid item xs={12} md={6} lg={4} key={offer.offerId}>

                            <Card sx={{ 

                                display: "flex", p: 1.8, gap: 2, height: { xs: "auto", sm: 160 }, minWidth: { xs: "100%", sm: 350 }, borderRadius: 3, alignItems: "center", 

                                position: "relative", border: `2.5px solid ${grade.color}`, transition: "transform 0.2s",

                                "&:hover": { transform: "translateY(-4px)" },

                                flexDirection: { xs: "column", sm: "row" },

                                py: { xs: 3, sm: 1.8 }

                            }}>

                                <Box 

                                    component={getPesdbLink(offer.imageUrl) ? "a" : "div"}

                                    href={getPesdbLink(offer.imageUrl)}

                                    target="_blank"

                                    rel="noopener noreferrer"

                                    sx={{ 

                                        position: "relative", 

                                        width: 80, 

                                        height: 110, 

                                        flexShrink: 0,

                                        cursor: getPesdbLink(offer.imageUrl) ? "pointer" : "default",

                                        transition: "transform 0.2s",

                                        "&:hover": { transform: getPesdbLink(offer.imageUrl) ? "scale(1.05)" : "none" }

                                    }}

                                >

                                    <Avatar src={offer.imageUrl} variant="rounded" sx={{ width: "100%", height: "100%", bgcolor: "#f8fafc" }} />

                                    <Box sx={{ position: "absolute", top: -8, left: -8, background: grade.gradient, color: "white", minWidth: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", border: "2px solid white", zIndex: 2 }}>{grade.label}</Box>

                                </Box>

                                    <Box sx={{ flexGrow: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: { xs: 2, sm: 0 } }}>

                                            <Box>

                                                <Typography 
                                                  variant="subtitle2" 
                                                  fontWeight="bold" 
                                                  noWrap 
                                                  component="a"
                                                  href={getPesdbLink(offer.imageUrl)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  sx={{ 
                                                    color: "inherit",
                                                    textDecoration: "none",
                                                    display: "block",
                                                    "&:hover": { color: "primary.main", textDecoration: "underline" }
                                                  }}
                                                >
                                                  {offer.playerName}
                                                </Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">From: <b>{offer.fromUserName}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">Offer: <b style={{ color: offer.offerType === "Loan" ? "#f59e0b" : "#3b82f6" }}>{offer.offerType === "Loan" ? "Loan (1 Season)" : "Transfer"}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">OVR: <b>{offer.playerOvr}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">Position: <b>{offer.position} ({offer.playingStyle})</b></Typography>

                                            </Box>

                                            <Typography variant="h5" fontWeight="900" color="primary" sx={{ whiteSpace: "nowrap" }}>

                                                {(offer.amount || 0).toLocaleString()} TP

                                            </Typography>

                                        </Box>

                                    <Box sx={{ display: "flex", gap: 1 }}>

                                        {offer.status === "Pending" ? (

                                          <>

                                            <Button variant="contained" size="small" color="success" fullWidth onClick={() => handleRespondOffer(offer.offerId, true)} sx={{ borderRadius: 1.5, fontWeight: "bold" }}>Accept</Button>

                                            <Button variant="outlined" size="small" color="error" fullWidth onClick={() => handleRespondOffer(offer.offerId, false)} sx={{ borderRadius: 1.5, fontWeight: "bold" }}>Reject</Button>

                                          </>

                                        ) : (

                                          <Chip label={offer.status} color={offer.status === "Rejected" ? "error" : "default"} variant="outlined" sx={{ width: "100%", fontWeight: "bold" }} />

                                        )}

                                    </Box>

                                </Box>

                            </Card>

                        </Grid>

                    );

                })}

                </Grid>

            )

      )}



      {/* Tab 1: Outgoing Offers */}

      {tabValue === 1 && (

          outgoingOffers.filter(isOfferActive).length === 0 ? (

                <Box sx={{ width: '100%', mt: 1 }}>

                    <Paper elevation={0} sx={{ 

                        width: '100%',

                        p: 10, textAlign: "center", borderRadius: 4, 

                        bgcolor: "rgba(2,6,23,0.02)", 

                        border: "1px dashed rgba(2,6,23,0.14)",

                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",

                        minHeight: 380

                    }}>

                        <Box sx={{ width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(2,6,23,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>

                            <ArrowForward sx={{ fontSize: 50, color: "rgba(2,6,23,0.55)", opacity: 0.35 }} />

                        </Box>

                        <Typography variant="h5" fontWeight="900" sx={{ color: "rgba(2,6,23,0.78)" }} gutterBottom>
                            You haven't made any offers yet
                        </Typography>

                        <Typography variant="body1" sx={{ color: "rgba(2,6,23,0.60)", maxWidth: 500 }}>
                            Go to the Transfer Board to start making offers for players you want.
                        </Typography>

                    </Paper>

                </Box>

            ) : (

                <Grid container spacing={2.5}>

                {outgoingOffers

                    .filter(isOfferActive)

                    .map(offer => {

                        const grade = getDynamicGrade(offer.playerOvr || 0);

                        return (

                        <Grid item xs={12} md={6} lg={4} key={offer.offerId}>

                            <Card sx={{ 

                                display: "flex", p: 1.8, gap: 2, height: { xs: "auto", sm: 160 }, minWidth: { xs: "100%", sm: 350 }, borderRadius: 3, alignItems: "center", 

                                position: "relative", border: `2.5px solid ${grade.color}`, transition: "transform 0.2s",

                                "&:hover": { transform: "translateY(-4px)" },

                                flexDirection: { xs: "column", sm: "row" },

                                py: { xs: 3, sm: 1.8 }

                            }}>

                                <Box 

                                    component={getPesdbLink(offer.imageUrl) ? "a" : "div"}

                                    href={getPesdbLink(offer.imageUrl)}

                                    target="_blank"

                                    rel="noopener noreferrer"

                                    sx={{ 

                                        position: "relative", 

                                        width: 80, 

                                        height: 110, 

                                        flexShrink: 0,

                                        cursor: getPesdbLink(offer.imageUrl) ? "pointer" : "default",

                                        transition: "transform 0.2s",

                                        "&:hover": { transform: getPesdbLink(offer.imageUrl) ? "scale(1.05)" : "none" }

                                    }}

                                >

                                    <Avatar src={offer.imageUrl} variant="rounded" sx={{ width: "100%", height: "100%", bgcolor: "#f8fafc" }} />

                                    <Box sx={{ position: "absolute", top: -8, left: -8, background: grade.gradient, color: "white", minWidth: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", border: "2px solid white", zIndex: 2 }}>{grade.label}</Box>

                                </Box>

                                    <Box sx={{ flexGrow: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: { xs: 2, sm: 0 } }}>

                                            <Box>

                                                <Typography 
                                                  variant="subtitle2" 
                                                  fontWeight="bold" 
                                                  noWrap 
                                                  component="a"
                                                  href={getPesdbLink(offer.imageUrl)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  sx={{ 
                                                    color: "inherit",
                                                    textDecoration: "none",
                                                    display: "block",
                                                    "&:hover": { color: "primary.main", textDecoration: "underline" }
                                                  }}
                                                >
                                                  {offer.playerName}
                                                </Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">Target: <b>{offer.toUserName}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">Offer: <b style={{ color: offer.offerType === "Loan" ? "#f59e0b" : "#3b82f6" }}>{offer.offerType === "Loan" ? "Loan (1 Season)" : "Transfer"}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">OVR: <b>{offer.playerOvr}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">Position: <b>{offer.position} ({offer.playingStyle})</b></Typography>

                                            </Box>

                                            <Typography variant="h5" fontWeight="900" color="primary" sx={{ whiteSpace: "nowrap" }}>

                                                {(offer.amount || 0).toLocaleString()} TP

                                            </Typography>

                                        </Box>

                                    <Box>

                                        {offer.status === "Pending" && (

                                            <Button variant="outlined" size="small" color="error" fullWidth startIcon={<Cancel />} onClick={() => handleCancelOffer(offer.offerId)} sx={{ borderRadius: 1.5, fontWeight: "bold" }}>Cancel Offer</Button>

                                        )}

                                        {offer.status === "Collapsed" && (

                                            <Chip label="Deal Collapsed (Check Quota/TP)" color="error" size="small" variant="filled" sx={{ borderRadius: 1.5, fontWeight: "900", width: "100%" }} icon={<Cancel sx={{ fontSize: '1rem !important' }} />} />

                                        )}

                                        {offer.status === "Rejected" && (

                                            <Chip label="Rejected" color="error" size="small" variant="filled" sx={{ borderRadius: 1.5, fontWeight: "900", width: "100%" }} icon={<Cancel sx={{ fontSize: '1rem !important' }} />} />

                                        )}

                                    </Box>

                                </Box>

                            </Card>

                        </Grid>

                        );

                    })}

                </Grid>

            )

      )}



      {/* Tab 2: My Listings */}

      {tabValue === 2 && (

          myListings.length === 0 ? (

                <Box sx={{ width: '100%', mt: 1 }}>

                    <Paper elevation={0} sx={{ 

                        width: '100%',

                        p: 10, textAlign: "center", borderRadius: 4, 

                        bgcolor: "rgba(2,6,23,0.02)", 

                        border: "1px dashed rgba(2,6,23,0.14)",

                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",

                        minHeight: 380

                    }}>

                        <Box sx={{ width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(2,6,23,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>

                            <Storefront sx={{ fontSize: 50, color: "rgba(2,6,23,0.55)", opacity: 0.35 }} />

                        </Box>

                        <Typography variant="h5" fontWeight="900" sx={{ color: "rgba(2,6,23,0.78)" }} gutterBottom>
                            No active listings at the moment
                        </Typography>

                        <Typography variant="body1" sx={{ color: "rgba(2,6,23,0.60)" }}>
                            You can list players from your Squad to sell them on the transfer market.
                        </Typography>

                    </Paper>

                </Box>

            ) : (

                <Grid container spacing={2.5}>

                {myListings.map(p => {

                    const grade = getDynamicGrade(p.playerOvr);

                    return (

                        <Grid item xs={12} md={6} lg={4} key={p.squadId}>

                            <Card sx={{ 

                                display: "flex", p: 1.8, gap: 2, height: { xs: "auto", sm: 160 }, minWidth: { xs: "100%", sm: 350 }, borderRadius: 3, alignItems: "center", 

                                position: "relative", border: `2.5px solid ${grade.color}`, transition: "transform 0.2s",

                                "&:hover": { transform: "translateY(-4px)" },

                                flexDirection: { xs: "column", sm: "row" },

                                py: { xs: 3, sm: 1.8 }

                            }}>

                                <Box 

                                    component={getPesdbLink(p.imageUrl) ? "a" : "div"}

                                    href={getPesdbLink(p.imageUrl)}

                                    target="_blank"

                                    rel="noopener noreferrer"

                                    sx={{ 

                                        position: "relative", 

                                        width: 80, 

                                        height: 110, 

                                        flexShrink: 0,

                                        cursor: getPesdbLink(p.imageUrl) ? "pointer" : "default",

                                        transition: "transform 0.2s",

                                        "&:hover": { transform: getPesdbLink(p.imageUrl) ? "scale(1.05)" : "none" }

                                    }}

                                >

                                    <Avatar src={p.imageUrl} variant="rounded" sx={{ width: "100%", height: "100%", bgcolor: "#f8fafc" }} />

                                    <Box sx={{ position: "absolute", top: -8, left: -8, background: grade.gradient, color: "white", minWidth: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", border: "2px solid white", zIndex: 2 }}>{grade.label}</Box>

                                </Box>

                                    <Box sx={{ flexGrow: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: { xs: 2, sm: 0 } }}>

                                            <Box>

                                                <Typography 
                                                  variant="subtitle2" 
                                                  fontWeight="bold" 
                                                  noWrap 
                                                  component="a"
                                                  href={getPesdbLink(p.imageUrl)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  sx={{ 
                                                    color: "inherit",
                                                    textDecoration: "none",
                                                    display: "block",
                                                    "&:hover": { color: "primary.main", textDecoration: "underline" }
                                                  }}
                                                >
                                                  {p.playerName}
                                                </Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">OVR: <b>{p.playerOvr}</b></Typography>

                                                <Typography variant="caption" display="block" color="text.secondary">Position: <b>{p.position} ({p.playingStyle || p.PlayingStyle})</b></Typography>

                                            </Box>

                                            <Typography variant="h5" fontWeight="900" color="primary" sx={{ whiteSpace: "nowrap" }}>

                                                {(p.listingPrice || p.ListingPrice || p.price || p.Price || 0).toLocaleString()} TP

                                            </Typography>

                                        </Box>

                                    <Button variant="outlined" size="small" color="error" fullWidth startIcon={<DeleteSweep />} onClick={() => handleDelist(p)} sx={{ borderRadius: 1.5, fontWeight: "bold" }}>Remove Listing</Button>

                                </Box>

                            </Card>

                        </Grid>

                    );

                })}

                </Grid>

            )

      )}



    </Box>

  );

};



export default MarketOverviewPage;

