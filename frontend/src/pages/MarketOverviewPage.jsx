import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Paper, Divider, List, ListItem, 
  ListItemAvatar, Avatar, ListItemText, Button, Chip, 
  CircularProgress, IconButton, Tooltip, Card, CardContent,
  Tab, Tabs, Badge
} from "@mui/material";
import { 
  Handshake, LocalOffer, Cancel, CheckCircle, 
  AccountBalanceWallet, History, Campaign, Storefront,
  ArrowForward, ArrowBack, SwapHoriz, DeleteSweep
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";

const MarketOverviewPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [incomingOffers, setIncomingOffers] = useState([]);
  const [outgoingOffers, setOutgoingOffers] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Load Offers
      const incomingRes = await auctionService.getIncomingOffers();
      setIncomingOffers(incomingRes?.data || []);
      
      const outgoingRes = await auctionService.getOutgoingOffers();
      setOutgoingOffers(outgoingRes?.data || []);

      // Load Summary (contains Wallet and Squad)
      const summary = await auctionService.getSummary();
      setWallet(summary.data.wallet);
      setMyListings((summary.data.squad || []).filter(p => p.status === "Listed"));

    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to load market data", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleRespondOffer = async (offerId, accept) => {
    try {
      await auctionService.respondOffer(offerId, accept);
      enqueueSnackbar(accept ? "ยืนยันการขายสำเร็จ!" : "ปฏิเสธข้อเสนอแล้ว", { variant: accept ? "success" : "info" });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Action failed", { variant: "error" });
    }
  };

  const handleCancelOffer = async (offerId) => {
    try {
      await auctionService.cancelOffer(offerId);
      enqueueSnackbar("ยกเลิกข้อเสนอแล้ว", { variant: "info" });
      fetchData();
    } catch (err) {
      enqueueSnackbar("Failed to cancel offer", { variant: "error" });
    }
  };

  const handleDelist = async (player) => {
    try {
      await auctionService.delistPlayer(player.squadId);
      enqueueSnackbar(`ถอนการขาย ${player.playerName} แล้ว`, { variant: "success" });
      fetchData();
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>Deal Center</Typography>
          <Typography variant="body1" color="text.secondary">จัดการการซื้อขายและข้อเสนอทั้งหมดของคุณ</Typography>
        </Box>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#1e1e2d", color: "white", display: "flex", alignItems: "center", gap: 2 }}>
            <AccountBalanceWallet sx={{ color: "#4ade80" }} />
            <Box>
                <Typography variant="caption" sx={{ opacity: 0.7, display: "block", lineHeight: 1 }}>Available Balance</Typography>
                <Typography variant="h6" fontWeight="bold" color="#4ade80">{wallet?.availableBalance?.toLocaleString()} TP</Typography>
            </Box>
        </Paper>
      </Box>

      <Tabs 
        value={tabValue} 
        onChange={(e, v) => setTabValue(v)} 
        sx={{ mb: 4, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab icon={<Badge badgeContent={incomingOffers.length} color="error" sx={{ "& .MuiBadge-badge": { right: -10 } }}><ArrowBack /></Badge>} iconPosition="start" label="Incoming (Inbox)" />
        <Tab icon={<ArrowForward />} iconPosition="start" label="Outgoing (Outbox)" />
        <Tab icon={<Storefront />} iconPosition="start" label="My Active Listings" />
      </Tabs>

      {/* Tab 0: Incoming Offers */}
      {tabValue === 0 && (
        <Box>
           {incomingOffers.length === 0 ? (
             <Paper sx={{ p: 8, textAlign: "center", borderRadius: 4, bgcolor: "rgba(0,0,0,0.02)", border: "1px dashed #ccc" }}>
                <Campaign sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">ไม่มีข้อเสนอรอการตอบรับ</Typography>
             </Paper>
           ) : (
             <Grid container spacing={2}>
               {incomingOffers.map(offer => (
                 <Grid item xs={12} key={offer.offerId}>
                   <Card sx={{ borderRadius: 3, borderLeft: "6px solid #4ade80", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                     <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar src={offer.imageUrl} variant="rounded" sx={{ width: 60, height: 60, bgcolor: "#f1f5f9" }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">{offer.playerName}</Typography>
                                <Typography variant="body2" color="text.secondary">ยื่นโดย: <b>{offer.fromUserName}</b></Typography>
                                <Chip size="small" label={offer.offerType} color="primary" sx={{ mt: 0.5, height: 20, fontSize: "0.7rem" }} />
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: "right", mr: 4 }}>
                            <Typography variant="h5" fontWeight="bold" color="primary">{offer.amount?.toLocaleString()} TP</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(offer.createdAt).toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => handleRespondOffer(offer.offerId, true)}>Accept</Button>
                            <Button variant="outlined" color="error" onClick={() => handleRespondOffer(offer.offerId, false)}>Reject</Button>
                        </Box>
                     </CardContent>
                   </Card>
                 </Grid>
               ))}
             </Grid>
           )}
        </Box>
      )}

      {/* Tab 1: Outgoing Offers */}
      {tabValue === 1 && (
        <Box>
            {outgoingOffers.length === 0 ? (
             <Paper sx={{ p: 8, textAlign: "center", borderRadius: 4, bgcolor: "rgba(0,0,0,0.02)", border: "1px dashed #ccc" }}>
                <ArrowForward sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">คุณยังไม่ได้ยื่นข้อเสนอหาใคร</Typography>
             </Paper>
           ) : (
             <Grid container spacing={2}>
                {outgoingOffers.map(offer => (
                  <Grid item xs={12} key={offer.offerId}>
                    <Card sx={{ borderRadius: 3, borderLeft: "6px solid #fbbf24", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                      <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar src={offer.imageUrl} variant="rounded" sx={{ width: 60, height: 60, bgcolor: "#f1f5f9" }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">{offer.playerName}</Typography>
                                <Typography variant="body2" color="text.secondary">ยื่นไปยัง: <b>{offer.toUserName}</b></Typography>
                                <Chip 
                                    size="small" 
                                    label={offer.status} 
                                    color={offer.status === "Pending" ? "warning" : "default"} 
                                    sx={{ mt: 0.5, height: 20, fontSize: "0.7rem", fontWeight: "bold" }} 
                                />
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: "right", mr: 4 }}>
                            <Typography variant="h5" fontWeight="bold">{offer.amount?.toLocaleString()} TP</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(offer.createdAt).toLocaleString()}</Typography>
                        </Box>
                        <Box>
                            {offer.status === "Pending" ? (
                                <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => handleCancelOffer(offer.offerId)}>Cancel Offer</Button>
                            ) : (
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">No Actions Available</Typography>
                            )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
             </Grid>
           )}
        </Box>
      )}

      {/* Tab 2: My Active Listings */}
      {tabValue === 2 && (
        <Box>
            {myListings.length === 0 ? (
             <Paper sx={{ p: 8, textAlign: "center", borderRadius: 4, bgcolor: "rgba(0,0,0,0.02)", border: "1px dashed #ccc" }}>
                <Storefront sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">คุณยังไม่มีนักเตะที่ตั้งขายไว้ในตลาด</Typography>
             </Paper>
           ) : (
             <Grid container spacing={2}>
                {myListings.map(p => (
                   <Grid item xs={12} sm={6} md={4} key={p.squadId}>
                      <Card sx={{ borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 1 }}>
                            <Chip label={`OVR ${p.playerOvr}`} size="small" sx={{ bgcolor: "gold", fontWeight: "bold" }} />
                        </Box>
                        <CardContent sx={{ pt: 5, textAlign: "center" }}>
                            <Avatar src={p.imageUrl} sx={{ width: 100, height: 100, mx: "auto", mb: 2, border: "3px solid gold" }} />
                            <Typography variant="h6" fontWeight="bold" noWrap>{p.playerName}</Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>{p.position}</Typography>
                            
                            <Divider sx={{ mb: 2 }} />
                            
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box textAlign="left">
                                    <Typography variant="caption" color="text.secondary" display="block">Listing Price</Typography>
                                    <Typography variant="subtitle1" fontWeight="bold" color="primary">{p.listingPrice?.toLocaleString()} TP</Typography>
                                </Box>
                                <Button variant="outlined" color="error" size="small" startIcon={<DeleteSweep />} onClick={() => handleDelist(p)}>Delist</Button>
                            </Box>
                        </CardContent>
                      </Card>
                   </Grid>
                ))}
             </Grid>
           )}
        </Box>
      )}

    </Box>
  );
};

export default MarketOverviewPage;
