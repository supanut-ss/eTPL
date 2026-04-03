import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { SportsSoccer, Groups, AccountBalanceWallet, EmojiEvents } from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "notistack";

const GRADE_MAP = [
  { label: "S", minOvr: 82, maxOvr: 99, color: "#ff4444", bg: "rgba(255,68,68,0.12)" },
  { label: "A", minOvr: 81, maxOvr: 81, color: "#ff9800", bg: "rgba(255,152,0,0.12)" },
  { label: "B", minOvr: 79, maxOvr: 80, color: "#9c27b0", bg: "rgba(156,39,176,0.12)" },
  { label: "C", minOvr: 77, maxOvr: 78, color: "#2196f3", bg: "rgba(33,150,243,0.12)" },
  { label: "D", minOvr: 75, maxOvr: 76, color: "#4caf50", bg: "rgba(76,175,80,0.12)" },
  { label: "E", minOvr: 65, maxOvr: 74, color: "#9e9e9e", bg: "rgba(158,158,158,0.12)" },
];

const getGrade = (ovr) => {
  return GRADE_MAP.find((g) => ovr >= g.minOvr && ovr <= g.maxOvr) || { label: "-", color: "#9e9e9e", bg: "rgba(158,158,158,0.12)" };
};

const MySquadPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSquad();
  }, [user]);

  const fetchSquad = async () => {
    try {
      setLoading(true);
      const res = await auctionService.getMySquad();
      setSquad(res.data || []);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = squad.reduce((sum, p) => sum + (p.pricePaid ?? 0), 0);

  const gradeSummary = GRADE_MAP.map((g) => ({
    ...g,
    count: squad.filter((p) => p.playerOvr >= g.minOvr && p.playerOvr <= g.maxOvr).length,
  })).filter((g) => g.count > 0);

  if (loading) return <LinearProgress />;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <EmojiEvents color="warning" />
        <Typography variant="h5" fontWeight="bold">
          My Squad
        </Typography>
        <Chip
          label={`${squad.length} Players`}
          color="primary"
          size="small"
          sx={{ fontWeight: "bold", ml: 1 }}
        />
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card elevation={2} sx={{ borderRadius: 2, borderLeft: "4px solid #4caf50" }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Groups fontSize="small" color="success" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Player Count
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {squad.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={2} sx={{ borderRadius: 2, borderLeft: "4px solid #2196f3" }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <AccountBalanceWallet fontSize="small" color="primary" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Budget Spent
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {totalSpent}{" "}
                <Typography component="span" variant="h6">
                  TP
                </Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={2} sx={{ borderRadius: 2, borderLeft: "4px solid #ff9800" }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <SportsSoccer fontSize="small" color="warning" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Grade Summary
                </Typography>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {gradeSummary.length > 0 ? (
                  gradeSummary.map((g) => (
                    <Chip
                      key={g.label}
                      label={`${g.label}: ${g.count}`}
                      size="small"
                      sx={{
                        bgcolor: g.bg,
                        color: g.color,
                        fontWeight: "bold",
                        border: `1px solid ${g.color}`,
                        fontSize: "0.7rem",
                      }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Squad Table */}
      {squad.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" mb={1}>
            😕 No players in your squad yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Go to the Auction page to bid on players!
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold", width: 50 }}>#</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", width: 90 }}>Image</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Player Name</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>OVR</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Grade</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Purchase Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {squad.map((player, index) => {
                const grade = getGrade(player.playerOvr);
                return (
                  <TableRow
                    key={player.playerId}
                    sx={{
                      "&:nth-of-type(even)": { bgcolor: "rgba(0,0,0,0.02)" },
                      "&:hover": { bgcolor: "action.hover" },
                      transition: "background 0.15s",
                    }}
                  >
                    <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Avatar
                        src={`https://pesdb.net/assets/img/card/b${player.playerId}.png`}
                        variant="rounded"
                        sx={{ width: 60, height: 85, objectFit: "cover", objectPosition: "top center" }}
                        imgProps={{ style: { objectFit: "cover", objectPosition: "top center" } }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        {player.playerName}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={player.playerOvr}
                        size="small"
                        sx={{
                          bgcolor: grade.bg,
                          color: grade.color,
                          fontWeight: "bold",
                          border: `1px solid ${grade.color}`,
                          minWidth: 42,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={grade.label}
                        size="small"
                        sx={{
                          bgcolor: grade.bg,
                          color: grade.color,
                          fontWeight: "bold",
                          border: `1px solid ${grade.color}`,
                          minWidth: 32,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {player.pricePaid != null ? (
                        <Typography fontWeight="bold" color="primary.main">
                          {player.pricePaid}{" "}
                          <Typography component="span" variant="caption" color="text.secondary">
                            TP
                          </Typography>
                        </Typography>
                      ) : (
                        <Typography color="text.secondary" variant="body2">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MySquadPage;
