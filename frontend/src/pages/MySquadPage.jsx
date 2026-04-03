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
} from "@mui/material";
import { SportsSoccer, Groups, AccountBalanceWallet, EmojiEvents, Stars } from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";

const GRADE_STYLE_MAP = {
  "S": { color: "#ffb300", bg: "rgba(255,179,0,0.15)", gradient: "linear-gradient(135deg, #ffe082 0%, #ffb300 100%)" },
  "A": { color: "#f4511e", bg: "rgba(244,81,30,0.15)", gradient: "linear-gradient(135deg, #ffab91 0%, #f4511e 100%)" },
  "B": { color: "#8e24aa", bg: "rgba(142,36,170,0.15)", gradient: "linear-gradient(135deg, #ce93d8 0%, #8e24aa 100%)" },
  "C": { color: "#1e88e5", bg: "rgba(30,136,229,0.15)", gradient: "linear-gradient(135deg, #90caf9 0%, #1e88e5 100%)" },
  "D": { color: "#43a047", bg: "rgba(67,160,71,0.15)", gradient: "linear-gradient(135deg, #a5d6a7 0%, #43a047 100%)" },
  "E": { color: "#757575", bg: "rgba(117,117,117,0.15)", gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)" },
  "DEFAULT": { color: "#9e9e9e", bg: "rgba(158,158,158,0.12)", gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)" }
};

const MySquadPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [squad, setSquad] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, qRes] = await Promise.all([
        auctionService.getMySquad(),
        auctionService.getQuotas()
      ]);
      setSquad(sRes?.data || []);
      setQuotas(qRes?.data || []);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getDynamicGrade = (ovr) => {
    const quota = quotas.find(q => ovr >= q.minOVR && ovr <= q.maxOVR);
    if (!quota) return { label: "-", ...GRADE_STYLE_MAP["DEFAULT"] };
    const style = GRADE_STYLE_MAP[quota.gradeName] || GRADE_STYLE_MAP["DEFAULT"];
    return { label: quota.gradeName, minOvr: quota.minOVR, maxOvr: quota.maxOVR, ...style };
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
          <Chip
            label={`${squad.length} Players`}
            color="primary"
            size="small"
            sx={{ fontWeight: "bold", ml: 1 }}
          />
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={1.5} mb={5}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", border: "1px solid #a5d6a7", position: 'relative', overflow: 'hidden' }}>
            <Groups sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 100, color: '#4caf50', opacity: 0.1, transform: 'rotate(-15deg)' }} />
            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
              <Typography variant="body2" color="success.dark" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                Player Count
              </Typography>
              <Typography variant="h3" fontWeight="900" color="success.dark">
                {squad.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", border: "1px solid #90caf9", position: 'relative', overflow: 'hidden' }}>
            <AccountBalanceWallet sx={{ position: 'absolute', right: -10, bottom: -10, fontSize: 100, color: '#2196f3', opacity: 0.1, transform: 'rotate(-15deg)' }} />
            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
              <Typography variant="body2" color="primary.dark" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                Budget Spent
              </Typography>
              <Typography variant="h3" fontWeight="900" color="primary.dark" sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                {totalSpent} <Typography component="span" variant="h6" fontWeight="bold">TP</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ borderRadius: 4, background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", border: "1px solid #ffcc80", height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="warning.dark" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
                Grade Summary
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt="auto">
                {gradeSummary.length > 0 ? (
                  gradeSummary.map((g) => (
                    <Chip
                      key={g.label}
                      label={`${g.label}: ${g.count}`}
                      size="small"
                      sx={{
                        background: g.gradient,
                        color: g.label === "E" ? "#333" : "white",
                        fontWeight: "800",
                        boxShadow: `0 2px 6px ${g.bg}`,
                        border: 'none',
                      }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="warning.dark" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                    No players yet
                  </Typography>
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
          <Typography variant="h5" color="text.secondary" fontWeight="bold" mb={1}>
            Your bench is empty
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Head over to the Auction board and start building your ultimate squad!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {squad.map((player) => {
            const grade = getDynamicGrade(player.playerOvr);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={player.playerId}>
                <Card sx={{ 
                  borderRadius: 4, 
                  position: 'relative', 
                  boxShadow: `0 8px 24px rgba(0,0,0,0.06)`,
                  border: `1px solid ${grade.color}40`,
                  bgcolor: 'white',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  '&:hover': { 
                    transform: 'translateY(-6px)', 
                    boxShadow: `0 16px 32px ${grade.bg}`,
                    '& .player-avatar': {
                      transform: 'scale(1.05)'
                    }
                  }
                }}>
                  {/* Top Background Pattern */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    height: '45%', 
                    background: `linear-gradient(180deg, ${grade.bg} 0%, rgba(255,255,255,0) 100%)`, 
                    zIndex: 0,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16
                  }} />

                  <CardContent sx={{ p: '24px !important', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ position: 'relative', mb: 3 }}>
                      <Avatar 
                        className="player-avatar"
                        src={`https://pesdb.net/assets/img/card/b${player.playerId}.png`} 
                        variant="rounded" 
                        sx={{ 
                          width: 120, 
                          height: 170, 
                          bgcolor: 'transparent',
                          filter: `drop-shadow(0 12px 16px ${grade.bg})`, 
                          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          '& img': { objectFit: 'contain' }
                        }} 
                      >
                        <SportsSoccer sx={{ fontSize: 60, color: 'grey.300' }} />
                      </Avatar>
                    </Box>

                    {/* Bottom Details (Class and TP) */}
                    <Box display="flex" gap={3} alignItems="center" mt="auto" width="100%" justifyContent="center">
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Typography variant="overline" lineHeight={1} color="text.secondary" fontWeight="700" mb={0.5}>CLASS</Typography>
                        <Chip
                          label={grade.label}
                          size="medium"
                          sx={{
                            background: grade.gradient,
                            color: grade.label === 'E' ? '#333' : 'white',
                            fontWeight: '900',
                            fontSize: '1.2rem',
                            border: `2px solid white`,
                            boxShadow: `0 2px 8px ${grade.bg}`,
                            minWidth: 40
                          }}
                        />
                      </Box>
                      
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Typography variant="overline" lineHeight={1} color="text.secondary" fontWeight="700" mb={0.5}>COST (TP)</Typography>
                        <Typography variant="h5" fontWeight="900" sx={{ color: 'primary.main', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                          {player.pricePaid || 0}
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
    </Box>
  );
};

export default MySquadPage;

