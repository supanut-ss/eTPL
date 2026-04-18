import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Autocomplete,
  TextField,
  LinearProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
} from "@mui/material";
import {
  Groups,
  AccountBalanceWallet,
  Diversity3,
  Search,
  People,
} from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import { getPlayerFaceUrl } from "../utils/imageUtils";

const GRADE_STYLE_MAP = {
  S: { color: "#ffb300", bg: "rgba(255,179,0,0.15)" },
  A: { color: "#f4511e", bg: "rgba(244,81,30,0.15)" },
  B: { color: "#8e24aa", bg: "rgba(142,36,170,0.15)" },
  C: { color: "#1e88e5", bg: "rgba(30,136,229,0.15)" },
  D: { color: "#43a047", bg: "rgba(67,160,71,0.15)" },
  E: { color: "#757575", bg: "rgba(117,117,117,0.15)" },
  DEFAULT: { color: "#9e9e9e", bg: "rgba(158,158,158,0.12)" },
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

const positionGroups = [
  ["GK"],
  ["CB", "RB", "LB"],
  ["DMF", "CMF", "RMF", "LMF", "AMF"],
  ["LWF", "RWF", "SS", "CF"],
];

const getPositionGroup = (pos) => {
  if (positionGroups[0].includes(pos)) return "GK";
  if (positionGroups[1].includes(pos)) return "DEF";
  if (positionGroups[2].includes(pos)) return "MID";
  if (positionGroups[3].includes(pos)) return "ATT";
  return "MID"; // fallback
};

const PlayerAvatar = ({ playerId }) => {
  const [src, setSrc] = useState(getPlayerFaceUrl(playerId, "png"));
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (!failed) {
      setSrc(getPlayerFaceUrl(playerId, "webp"));
      setFailed(true);
    }
  };

  return (
    <Avatar
      src={src}
      variant="rounded"
      sx={{ 
        width: 64, 
        height: 64, 
        bgcolor: "transparent"
      }}
      imgProps={{
        onError: handleError
      }}
    />
  );
};

const ClubSquadPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [squadData, setSquadData] = useState({ squad: [], quotas: [] });
  const [loading, setLoading] = useState(true);
  const [squadLoading, setSquadLoading] = useState(false);

  useEffect(() => {
    fetchClubs();
  }, [currentUser]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getClubs();
      const rawList = res?.data || [];
      
      // Filter out current user from the list
      const filteredList = rawList.filter(c => c.userId !== currentUser?.userId);
      setClubs(filteredList);
      
      // Auto-select first club in filtered list if exists
      if (filteredList.length > 0) {
        setSelectedClub(filteredList[0]);
        fetchSquad(filteredList[0].userId);
      }
    } catch (err) {
      enqueueSnackbar("Failed to fetch club list", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSquad = async (userStrId) => {
    try {
      setSquadLoading(true);
      const res = await auctionService.getClubSquad(userStrId);
      setSquadData(res?.data || null);
    } catch (err) {
      enqueueSnackbar("Failed to fetch squad details", { variant: "error" });
    } finally {
      setSquadLoading(false);
    }
  };

  const handleClubChange = (event, newValue) => {
    setSelectedClub(newValue);
    if (newValue) {
      fetchSquad(newValue.userId);
    } else {
      setSquadData(null);
    }
  };

  const calculateTotalValue = () => {
    if (!squadData?.squad) return 0;
    return squadData.squad.reduce((sum, p) => sum + (p.pricePaid || 0), 0);
  };

  const getPositionDistribution = () => {
    if (!squadData?.squad) return {};
    return squadData.squad.reduce((acc, p) => {
      const pos = p.position || "Unknown";
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});
  };

  if (loading) return <LinearProgress />;

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 4,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <People color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: -0.5 }}>
              League Teams
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              VIEW SQUADS OF OTHER TEAMS
            </Typography>
          </Box>
        </Box>

        <Autocomplete
          options={clubs}
          getOptionLabel={(option) => `${option.userId} ${option.lineName ? `(${option.lineName})` : ""}`}
          value={selectedClub}
          onChange={handleClubChange}
          sx={{ width: { xs: "100%", sm: 320 } }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Club"
              variant="outlined"
              size="small"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <Search sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />
                    {params.InputProps.startAdornment}
                  </>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "background.paper",
                },
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ gap: 1.5 }}>
              <Avatar src={option.linePic} sx={{ width: 24, height: 24 }} />
              <Typography variant="body2" fontWeight={600}>
                {option.userId}
              </Typography>
              {option.lineName && (
                <Typography variant="caption" color="text.secondary">
                  - {option.lineName}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>

      {squadLoading && <LinearProgress sx={{ mb: 2 }} />}

      {squadData ? (
        (() => {
          const positionSummary = getPositionDistribution();
          const gradeSummary = squadData.quotas?.map(q => ({
            label: q.gradeName,
            count: squadData.squad?.filter(p => p.playerOvr >= q.minOVR && p.playerOvr <= q.maxOVR).length || 0,
            gradient: GRADE_STYLE_MAP[q.gradeName]?.bg || GRADE_STYLE_MAP.DEFAULT.bg,
            color: GRADE_STYLE_MAP[q.gradeName]?.color || GRADE_STYLE_MAP.DEFAULT.color
          })) || [];

          return (
            <>
              {/* Summary Dashboard - Soft Minimal Theme */}
              <Box
                sx={{
                  p: { xs: 3, md: 4 },
                  mb: 5,
                  borderRadius: "32px",
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)",
                  position: "relative",
                }}
              >
                <Grid container spacing={3}>
                  {/* Market Value */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 1, opacity: 0.8, fontSize: "0.75rem" }}>
                        Team Value
                      </Typography>
                      <Box display="flex" alignItems="baseline" gap={1}>
                        <Typography variant="h3" fontWeight={1000} color="primary" sx={{ letterSpacing: -1 }}>
                          {calculateTotalValue().toLocaleString()}
                        </Typography>
                        <Typography variant="h6" fontWeight={1000} color="text.secondary" sx={{ opacity: 0.4 }}>TP</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Squad size */}
                  <Grid item xs={12} sm={6} md={2}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 1, opacity: 0.8, fontSize: "0.75rem" }}>
                        Players
                      </Typography>
                      <Box display="flex" alignItems="baseline" gap={0.5}>
                        <Typography variant="h3" fontWeight={1000} sx={{ letterSpacing: -1, color: "text.primary" }}>
                          {squadData.squad?.length || 0}
                        </Typography>
                        <Typography variant="h6" fontWeight={1000} color="text.secondary" sx={{ opacity: 0.4 }}>/ 23</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Grade Summary */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 2, opacity: 0.8, fontSize: "0.75rem" }}>
                        Grade
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.2 }}>
                        {gradeSummary.map((g) => (
                           <Box
                            key={`grade-dist-${g.label}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "10px",
                              bgcolor: alpha(g.color, 0.12),
                              border: `1.5px solid ${alpha(g.color, 0.3)}`,
                              overflow: "hidden",
                              height: 38,
                            }}
                          >
                            <Box sx={{ px: 1.5, height: "100%", display: "flex", alignItems: "center", bgcolor: g.color, color: "white", fontWeight: 1000, fontSize: "0.9rem" }}>
                              {g.label}
                            </Box>
                            <Box sx={{ px: 1.5, fontWeight: 900, fontSize: "1rem", color: "text.primary" }}>{g.count}</Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Position Summary */}
                  <Grid item xs={12} md={3.5}>
                    <Box sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 1000, letterSpacing: 1.5, textTransform: "uppercase", display: "block", mb: 2, opacity: 0.8, fontSize: "0.75rem" }}>
                        Position
                      </Typography>
                      <Box sx={{ 
                        display: "flex", 
                        gap: 1.2, 
                        overflowX: "auto", 
                        pb: 1,
                        "&::-webkit-scrollbar": { height: 4 },
                        "&::-webkit-scrollbar-thumb": {
                          backgroundColor: "rgba(0,0,0,0.05)",
                          borderRadius: 999,
                        },
                      }}>
                        {positionGroups.flat().map((pos) => {
                          const group = getPositionGroup(pos);
                          const style = POSITION_GROUP_STYLE[group];
                          const count = positionSummary[pos] || 0;
                          
                          return (
                            <Box
                              key={`pos-sum-box-${pos}`}
                              sx={{
                                minWidth: 42,
                                height: 48,
                                borderRadius: "10px",
                                border: "1.5px solid",
                                borderColor: style.border,
                                bgcolor: alpha(style.bg, 0.4),
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: "0 0 auto",
                                transition: "all 0.2s",
                                opacity: count > 0 ? 1 : 0.6, // Slightly muted if empty but still colored
                              }}
                            >
                              <Typography variant="caption" sx={{ 
                                fontWeight: 1000, 
                                color: style.label, 
                                filter: "brightness(0.35)", // Much darker for better contrast
                                fontSize: "0.7rem",
                                lineHeight: 1,
                                textTransform: "uppercase"
                              }}>
                                {pos}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                mt: 0.5,
                                fontWeight: 1000, 
                                color: "text.primary",
                                fontSize: "0.95rem",
                                lineHeight: 1
                              }}>
                                {count}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Player Roster - Minimal Minimal Table */}
              <Typography variant="h6" fontWeight={1000} sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1.5, color: "text.primary" }}>
                Team Roster <Chip label={squadData.squad?.length || 0} size="small" sx={{ fontWeight: 1000, bgcolor: "primary.main", color: "white", px: 0.5 }} />
              </Typography>

              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: "24px", border: "1.5px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <Table>
                  <TableHead sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase", pl: 3 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>Player Information</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase" }}>OVR</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 1000, color: "text.secondary", fontSize: "0.75rem", textTransform: "uppercase", pr: 3 }}>Market Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {squadData.squad?.map((player) => {
                      const gradeInfo = squadData.quotas?.find(q => player.playerOvr >= q.minOVR && player.playerOvr <= q.maxOVR);
                      const gradeName = gradeInfo?.gradeName || "E";
                      const gradeStyle = GRADE_STYLE_MAP[gradeName] || GRADE_STYLE_MAP.DEFAULT;
                      const group = getPositionGroup(player.position);
                      const posStyle = POSITION_GROUP_STYLE[group];

                      return (
                        <TableRow key={player.squadId} sx={{ "&:hover": { bgcolor: "rgba(0,0,0,0.01)" }, transition: "background 0.2s" }}>
                          <TableCell sx={{ pl: 3 }}>
                            <Box sx={{ 
                              width: 38, 
                              height: 38, 
                              borderRadius: "10px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              bgcolor: gradeStyle.bg,
                              color: gradeStyle.color,
                              fontWeight: 1000,
                              fontSize: "1.1rem",
                              border: `1.5px solid ${alpha(gradeStyle.color, 0.3)}`,
                            }}>
                              {gradeName}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <PlayerAvatar playerId={player.playerId} />
                              <Box>
                                <Typography variant="body1" fontWeight={1000} sx={{ mb: 0.5 }}>
                                  {player.playerName}
                                </Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                                  <Typography variant="caption" sx={{ fontWeight: 1000, color: posStyle.label, filter: "brightness(0.7)", textTransform: "uppercase" }}>
                                    {player.position}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 1000 }}>•</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 1000, color: "text.secondary" }}>
                                    {player.playingStyle || "No Style"}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", mt: 0.25 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 1000, color: "text.disabled", fontSize: "0.65rem" }}>
                                    {player.teamName || "Free Agent"} ({player.league || "Unknown"})
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" fontWeight={1000} color="primary">
                              {player.playerOvr}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 3 }}>
                            <Typography variant="body1" fontWeight={1000}>
                              {(player.pricePaid || 0).toLocaleString()} <Typography component="span" variant="caption" sx={{ opacity: 0.4 }}>TP</Typography>
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          );
        })()
      ) : (
        !squadLoading && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Groups sx={{ fontSize: 60, color: "divider", mb: 2 }} />
            <Typography color="text.secondary">Please select a club to view their roster.</Typography>
          </Box>
        )
      )}
    </Box>
  );
};

export default ClubSquadPage;
