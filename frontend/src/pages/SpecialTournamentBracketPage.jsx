import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Avatar, CircularProgress, Chip, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Button, Tabs, Tab,
  useTheme, useMediaQuery,
} from "@mui/material";
import { EmojiEvents, Groups, SportsSoccer, ArrowBack, CheckCircle, PlayArrow, HowToReg } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import specialTournamentService from "../services/specialTournamentService";
import SEO from "../components/SEO";

// ─── Layout constants for LEFT-TO-RIGHT bracket ──────────────────────────────
const MATCH_HEIGHT = 103; 
const BASE_GAP = 20;
const BASE_SLOT_H = MATCH_HEIGHT + BASE_GAP; // 123 px
const CARD_WIDTH = 210;
const H_STUB = 20; // horizontal stub on each side of vertical connector
const LINE_THICKNESS = 2;
const JOIN_OVERLAP = 1;
// Column width = card + stub + vertical + stub (right margin for bracket lines)
const RIGHT_MARGIN = H_STUB + LINE_THICKNESS + H_STUB; // 42 px
const COL_WIDTH = CARD_WIDTH + RIGHT_MARGIN; // 252 px
// x of vertical connector line, relative to slot-Box left edge
const VERT_X = CARD_WIDTH + H_STUB; 

// Round label helper
const roundLabel = (r) => {
  if (r === 2)  return "FINAL";
  if (r === 4)  return "SEMIFINALS";
  if (r === 8)  return "QUARTERFINALS";
  if (r === 16) return "ROUND OF 16";
  if (r === 32) return "ROUND OF 32";
  if (r === 64) return "ROUND OF 64";
  return `ROUND OF ${r}`;
};

// ─── MatchCard ───────────────────────────────────────────────────────────────
const MatchCard = ({ match }) => {
  if (!match) return null;
  const isHomeWinner = match.isPlayed && !match.isBye && match.homeScore > match.awayScore;
  const isAwayWinner = match.isPlayed && !match.isBye && match.awayScore > match.homeScore;

  const playerRow = (name, teamName, logoUrl, isWinner, score) => (
    <Box sx={{
      px: 2, py: 1.2,
      height: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      bgcolor: isWinner ? "rgba(99, 102, 241, 0.06)" : "transparent",
      transition: "background-color 0.2s ease",
    }}>
      <Box display="flex" alignItems="center" gap={1.5} sx={{ overflow: "hidden", flex: 1 }}>
        <Avatar src={logoUrl} sx={{ 
          width: 26, 
          height: 26, 
          fontSize: 11, 
          fontWeight: "bold", 
          bgcolor: isWinner ? "#6366f1" : "#94a3b8", 
          flexShrink: 0,
          boxShadow: isWinner ? "0 2px 8px rgba(99, 102, 241, 0.25)" : "none"
        }}>
          {(name || "?")[0]}
        </Avatar>
        <Box sx={{ overflow: "hidden" }}>
          <Typography variant="body2" fontWeight={isWinner ? 800 : 600} noWrap
            sx={{ display: "block", color: isWinner ? "#6366f1" : "text.primary" }}>
            {name || "TBD"}
          </Typography>
          {teamName && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.65rem" }}>{teamName}</Typography>}
        </Box>
      </Box>
      <Typography variant="body1" fontWeight="bold" sx={{ color: isWinner ? "#6366f1" : "text.secondary", ml: 1, minWidth: 20, textAlign: "center" }}>
        {match.isPlayed ? score : "-"}
      </Typography>
    </Box>
  );

  return (
    <Paper elevation={match.isPlayed ? 3 : 1} sx={{
      width: CARD_WIDTH,
      height: MATCH_HEIGHT,
      borderRadius: 3.5,
      overflow: "hidden",
      border: "1px solid",
      borderColor: match.isPlayed ? "rgba(99, 102, 241, 0.2)" : "rgba(226, 232, 240, 0.8)",
      background: match.isBye 
        ? "rgba(248, 250, 252, 0.6)" 
        : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)",
      boxShadow: match.isPlayed 
        ? "0 4px 16px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,1)" 
        : "0 4px 12px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255,255,255,1)",
      backdropFilter: "blur(10px)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": {
        transform: "translateY(-3px)",
        borderColor: "rgba(99, 102, 241, 0.35)",
        boxShadow: "0 10px 24px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255,255,255,1)",
      },
    }}>
      {match.isBye ? (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <Avatar src={match.homeLogoUrl} sx={{ width: 28, height: 28, bgcolor: "#6366f1", fontSize: 12 }}>{(match.homeDisplayName || "?")[0]}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>{match.homeDisplayName}</Typography>
            <Chip label="BYE" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "rgba(99,102,241,0.1)", color: "#6366f1", mt: 0.5 }} />
          </Box>
        </Box>
      ) : (
        <Box>
          {playerRow(match.homeDisplayName, match.homeTeamName, match.homeLogoUrl, isHomeWinner, match.homeScore)}
          <Divider />
          {playerRow(match.awayDisplayName, match.awayTeamName, match.awayLogoUrl, isAwayWinner, match.awayScore)}
        </Box>
      )}
    </Paper>
  );
};

// ─── Left-to-Right Bracket Renderer ──────────────────────────────────────────
const HorizontalBracket = ({ matches }) => {
  const allRounds = [...new Set(matches.map(m => m.round))].sort((a, b) => b - a); // [16, 8, 4, 2] - largest to smallest (final=2)

  return (
    <Box
      sx={{
        display: "flex",
        overflowX: "auto",
        pb: 8,
        "&::-webkit-scrollbar": { height: 8 },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(0,0,0,0.1)",
          borderRadius: 4,
        },
      }}
    >
      {allRounds.map((roundVal, roundIndex) => {
        const matchesInRound = matches.filter(m => m.round === roundVal);
        const isFinal = roundVal === 2;
        const slotH = BASE_SLOT_H * Math.pow(2, roundIndex);
        const numSlots = roundVal / 2;
        const slots = Array.from({ length: numSlots }, (_, i) => i + 1);

        return (
          <Box
            key={roundVal}
            sx={{
              display: "flex",
              flexDirection: "column",
              width: COL_WIDTH,
              flexShrink: 0,
            }}
          >
            {/* Round label */}
            <Box
              sx={{
                height: 48,
                mb: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: CARD_WIDTH,
                background: isFinal
                  ? "linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)"
                  : "linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)",
                borderRadius: "12px",
                border: "1px solid",
                borderColor: isFinal 
                  ? "rgba(245, 158, 11, 0.3)" 
                  : "rgba(226, 232, 240, 0.8)",
                boxShadow: isFinal
                  ? "0 4px 12px rgba(245, 158, 11, 0.15), inset 0 1px 1px rgba(255,255,255,0.8)"
                  : "0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: isFinal
                    ? "0 6px 16px rgba(245, 158, 11, 0.2), inset 0 1px 1px rgba(255,255,255,0.9)"
                    : "0 6px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
                }
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{
                  color: isFinal ? "#d97706" : "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {isFinal && <EmojiEvents sx={{ fontSize: 18, color: "#d97706" }} />}
                {isFinal ? "FINAL" : roundLabel(roundVal)}
              </Typography>
            </Box>

            <Box sx={{ position: "relative" }}>
              {slots.map((matchNo) => {
                const match = matchesInRound.find(m => m.matchNo === matchNo);
                const isBye = !match || match.isBye === true;
                const isOdd = matchNo % 2 !== 0;

                const pairMatchNo = isOdd ? matchNo + 1 : matchNo - 1;
                const pairMatch = matchesInRound.find(m => m.matchNo === pairMatchNo);
                const pairIsBye = !pairMatch || pairMatch.isBye === true;

                let lineStart = 0,
                  lineEnd = 0,
                  exitAbsY = 0,
                  showConnector = false;

                if (isOdd) {
                  const bothBye = isBye && pairIsBye;
                  if (!bothBye) {
                    showConnector = true;
                    if (!isBye && !pairIsBye) {
                      // Case A
                      lineStart = slotH / 2;
                      lineEnd = slotH * 1.5;
                      exitAbsY = slotH;
                    } else if (!isBye && pairIsBye) {
                      // Case B — odd real, even bye
                      lineStart = slotH / 2;
                      lineEnd = slotH;
                      exitAbsY = slotH;
                    } else {
                      // Case C — odd bye, even real
                      lineStart = slotH;
                      lineEnd = slotH * 1.5;
                      exitAbsY = slotH;
                    }
                  }
                }

                const lineHeight = lineEnd - lineStart;
                const exitOffsetY = exitAbsY - lineStart;

                return (
                  <Box
                    key={matchNo}
                    sx={{
                      height: slotH,
                      position: "relative",
                      width: COL_WIDTH,
                    }}
                  >
                    {/* Match card */}
                    {!isBye && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: (slotH - MATCH_HEIGHT) / 2,
                          left: 0,
                          width: CARD_WIDTH,
                        }}
                      >
                        <MatchCard match={match} />
                      </Box>
                    )}

                    {isFinal && matchNo === 1 && (
                      <EmojiEvents
                        sx={{
                          position: "absolute",
                          left: CARD_WIDTH / 2,
                          top: Math.max(8, (slotH - MATCH_HEIGHT) / 2 - 72),
                          transform: "translateX(-50%)",
                          fontSize: 64,
                          color: "gold",
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
                          zIndex: 2,
                        }}
                      />
                    )}

                    {/* Right-side bracket lines */}
                    {!isFinal && (
                      <>
                        {/* Outbound stub: card right → vertical connector (real cards only) */}
                        {!isBye && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: CARD_WIDTH,
                              top: `calc(50% - ${LINE_THICKNESS / 2}px)`,
                              width: H_STUB + JOIN_OVERLAP,
                              height: `${LINE_THICKNESS}px`,
                              bgcolor: "grey.400",
                              zIndex: 1,
                            }}
                          />
                        )}

                        {/* Vertical connector + exit stub (odd slot only) */}
                        {showConnector && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: VERT_X,
                              top: lineStart, // relative to this slot's top
                              width: `${LINE_THICKNESS}px`,
                              height: lineHeight,
                              bgcolor: "grey.400",
                              zIndex: 0,
                            }}
                          >
                            {/* Exit stub toward next round at exitAbsY */}
                            <Box
                              sx={{
                                position: "absolute",
                                left: LINE_THICKNESS - JOIN_OVERLAP,
                                top: exitOffsetY - LINE_THICKNESS / 2,
                                width: H_STUB + JOIN_OVERLAP,
                                height: `${LINE_THICKNESS}px`,
                                bgcolor: "grey.400",
                              }}
                            />
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ─── Group Standings Table ────────────────────────────────────────────────────
const GroupStandings = ({ group, participants, matches, advanceCount }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const standings = participants.map(p => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    matches.forEach(m => {
      const isHome = m.homeParticipantId === p.id;
      const isAway = m.awayParticipantId === p.id;
      if ((!isHome && !isAway) || !m.isPlayed) return;
      const my = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const opp = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      gf += my; ga += opp;
      if (my > opp) w++; else if (my === opp) d++; else l++;
    });
    return { ...p, w, d, l, pts: w * 3 + d, gd: gf - ga, gf, ga };
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  return (
    <Box sx={{ p: 0.5 }}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: { xs: 300, sm: 380 } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(99, 102, 241, 0.04)" }}>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", pl: { xs: 1, sm: 2 }, pr: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>#</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>Team</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>W</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>D</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>L</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>GF</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>GA</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "text.secondary" }}>GD</TableCell>
              <TableCell align="center" sx={{ fontWeight: 900, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "#6366f1" }}>PTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((p, idx) => {
              const isAdvancing = idx < advanceCount;
              return (
                <TableRow 
                  key={p.id} 
                  sx={{ 
                    bgcolor: isAdvancing ? "rgba(99, 102, 241, 0.02)" : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isAdvancing ? "rgba(99, 102, 241, 0.06)" : "rgba(0, 0, 0, 0.02)",
                    }
                  }}
                >
                  <TableCell sx={{ pl: { xs: 1, sm: 2 }, pr: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", fontWeight: isAdvancing ? 800 : 400, color: isAdvancing ? "#6366f1" : "text.secondary" }}>{idx + 1}</TableCell>
                  <TableCell sx={{ px: { xs: 0.5, sm: 1.5 } }}>
                    <Box display="flex" alignItems="center" gap={isMobile ? 0.75 : 1.2}>
                      <Avatar src={p.logoUrl} sx={{ 
                        width: isMobile ? 20 : 24, 
                        height: isMobile ? 20 : 24, 
                        fontSize: isMobile ? 9 : 10, 
                        bgcolor: isAdvancing ? "#6366f1" : "#94a3b8",
                        boxShadow: isAdvancing ? "0 2px 6px rgba(99, 102, 241, 0.2)" : "none"
                      }}>
                        {p.displayName[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={isAdvancing ? 700 : 500} noWrap sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{p.displayName}</Typography>
                        {p.teamName && <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block" }} noWrap>{p.teamName}</Typography>}
                      </Box>
                      {isAdvancing && (
                        <Chip 
                          label={isMobile ? "ADV" : "ADVANCED"} 
                          size="small" 
                          sx={{ 
                            height: 14, 
                            fontSize: "0.5rem", 
                            fontWeight: 850,
                            bgcolor: "rgba(34, 197, 94, 0.1)", 
                            color: "#22c55e", 
                            ml: 0.5,
                            letterSpacing: "0.05em"
                          }} 
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", fontWeight: 600, color: "success.main" }}>{p.w}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem" }}>{p.d}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: "error.main" }}>{p.l}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem" }}>{p.gf}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem" }}>{p.ga}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: p.gd > 0 ? "success.main" : p.gd < 0 ? "error.main" : "text.secondary" }}>
                    {p.gd > 0 ? `+${p.gd}` : p.gd}
                  </TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.9rem", fontWeight: 900, color: "#6366f1" }}>{p.pts}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" px={2} mb={1} sx={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>Match Results</Typography>
      <Box px={2} pb={2}>
        {matches.map(m => (
          <Box 
            key={m.id} 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              py: 1, 
              px: 1.5, 
              borderRadius: 2, 
              mb: 0.75, 
              bgcolor: m.isPlayed ? "rgba(99, 102, 241, 0.03)" : "rgba(255,255,255,0.4)", 
              border: "1px solid", 
              borderColor: m.isPlayed ? "rgba(99, 102, 241, 0.12)" : "rgba(226, 232, 240, 0.6)", 
              transition: "all 0.2s ease",
              "&:hover": { 
                transform: "translateY(-1px)", 
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)", 
                borderColor: "rgba(99, 102, 241, 0.25)" 
              } 
            }}
          >
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "right", mr: 1.5, color: "text.primary" }} noWrap>{m.homeDisplayName}</Typography>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: m.isPlayed ? "#6366f1" : "rgba(226,232,240,0.8)", minWidth: 52, textAlign: "center", boxShadow: m.isPlayed ? "0 2px 6px rgba(99,102,241,0.2)" : "none" }}>
              <Typography variant="caption" fontWeight={800} color={m.isPlayed ? "white" : "text.secondary"}>
                {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
              </Typography>
            </Box>
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "left", ml: 1.5, color: "text.primary" }} noWrap>{m.awayDisplayName}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const SpecialTournamentBracketPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await specialTournamentService.getById(id);
      setData(res.data?.data || null);
    } catch (e) {
      if (e.response?.status === 403) {
        enqueueSnackbar("This tournament has not been published to the public yet.", { variant: "warning" });
      } else {
        enqueueSnackbar("Failed to load tournament data.", { variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  if (!data) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Typography color="text.secondary">Tournament not found.</Typography>
    </Box>
  );

  const { tournament, participants, groups, matches } = data;
  const isGroupKnockout = tournament.format === "group_knockout";
  const koMatches = matches.filter(m => m.phase === "knockout");
  const groupMatches = matches.filter(m => m.phase === "group");
  const advanceCount = tournament.teamsAdvancePerGroup || 2;

  // Build group participant map
  const participantMap = Object.fromEntries(participants.map(p => [p.id, p]));

  // Final champion (from the round-2 knockout match)
  const finalMatch = koMatches.find(m => m.round === 2);
  const champion = finalMatch?.isPlayed
    ? (finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeDisplayName : finalMatch.awayDisplayName)
    : null;

  const tabLabels = isGroupKnockout
    ? ["Group Stage", "Knockout Bracket"]
    : ["Bracket"];

  return (
    <Box sx={{ width: "100%", bgcolor: "background.default", minHeight: "100vh" }}>
      <SEO
        title={`${tournament.name} | Special Tournament | eTPL`}
        description={tournament.description || `Match tree and standings for ${tournament.name}`}
        keywords={`Special Tournament, ${tournament.name}, eTPL`}
      />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate(-1)} 
          sx={{ 
            mb: 2, 
            color: "text.secondary",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              color: "primary.main",
              bgcolor: "rgba(99, 102, 241, 0.04)",
              transform: "translateX(-4px)",
            },
            transition: "all 0.2s ease"
          }} 
          size="small"
        >
          Back
        </Button>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ width: 56, height: 56, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.3)" }}>
              <EmojiEvents sx={{ color: "white", fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight={900}>{tournament.name}</Typography>
              {tournament.description && (
                <Typography variant="body2" color="text.secondary">{tournament.description}</Typography>
              )}
              <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                <Chip 
                  label={isGroupKnockout ? "Group Stage + Knockout" : "Knockout"} 
                  size="small"
                  sx={{ bgcolor: "rgba(99,102,241,0.1)", color: "#6366f1", fontWeight: 700, fontSize: "0.7rem" }} 
                />
                <Chip 
                  label={
                    tournament.status === "completed" 
                      ? "Completed" 
                      : tournament.status === "ongoing" 
                      ? "Ongoing" 
                      : "Registration"
                  } 
                  size="small"
                  icon={
                    tournament.status === "completed" 
                      ? <CheckCircle sx={{ fontSize: 13 }} /> 
                      : tournament.status === "ongoing" 
                      ? <PlayArrow sx={{ fontSize: 13 }} /> 
                      : <HowToReg sx={{ fontSize: 13 }} />
                  }
                  sx={{ fontWeight: 700, fontSize: "0.7rem", px: 0.5 }} 
                  color={
                    tournament.status === "completed" 
                      ? "success" 
                      : tournament.status === "ongoing" 
                      ? "primary" 
                      : "default"
                  } 
                />
                <Chip 
                  label={`${participants.length} Teams`} 
                  size="small" 
                  icon={<Groups sx={{ fontSize: 13 }} />} 
                  sx={{ fontWeight: 600, fontSize: "0.7rem" }} 
                />
              </Box>
            </Box>
          </Box>

          {/* Champion badge */}
          {champion && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                borderRadius: 4, 
                border: "1px solid rgba(245, 158, 11, 0.35)", 
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", 
                boxShadow: "0 10px 25px rgba(245, 158, 11, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.9)",
                display: "flex", 
                alignItems: "center", 
                gap: 1.5,
                transition: "transform 0.3s ease",
                "&:hover": {
                  transform: "scale(1.03) rotate(1deg)",
                }
              }}
            >
              <EmojiEvents sx={{ color: "gold", fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} />
              <Box>
                <Typography variant="caption" fontWeight={850} color="#d97706" display="block" sx={{ letterSpacing: "0.05em", textTransform: "uppercase" }}>🏆 CHAMPION</Typography>
                <Typography variant="body1" fontWeight={900} color="#92400e">{champion}</Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Tabs (only if group_knockout) */}
      {isGroupKnockout && (
        <Tabs 
          value={tab} 
          onChange={(_, v) => setTab(v)} 
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : undefined}
          allowScrollButtonsMobile
          sx={{ 
            mb: 4, 
            borderBottom: "1px solid", 
            borderColor: "divider",
            "& .MuiTab-root": {
              fontWeight: 700,
              fontSize: isMobile ? "0.75rem" : "0.85rem",
              textTransform: "none",
              color: "text.secondary",
              transition: "all 0.2s ease",
              minWidth: isMobile ? "auto" : 90,
              px: isMobile ? 1.5 : 3,
              "&.Mui-selected": {
                color: "primary.main",
              }
            }
          }}
        >
          <Tab label="Group Stage" icon={<Groups sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Knockout Bracket" icon={<EmojiEvents sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      )}

      {/* ── Group Stage Tab ── */}
      {(!isGroupKnockout || tab === 0) && isGroupKnockout && (
        <Box>
          {groups.length === 0 ? (
            <Paper 
              sx={{ 
                p: 6, 
                textAlign: "center", 
                borderRadius: 4,
                background: "rgba(255,255,255,0.4)",
                backdropFilter: "blur(10px)",
                border: "1px dashed rgba(226, 232, 240, 1)"
              }}
            >
              <Groups sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
              <Typography color="text.secondary" fontWeight={500}>Group stage has not been generated yet.</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {groups.map(group => {
                const gParticipants = participants.filter(p => p.groupId === group.id);
                const gMatches = groupMatches.filter(m => m.groupId === group.id);
                return (
                  <Paper 
                    key={group.id} 
                    elevation={0} 
                    sx={{ 
                      borderRadius: 4, 
                      border: "1px solid rgba(226, 232, 240, 0.8)", 
                      overflow: "hidden", 
                      flex: "1 1 420px", 
                      minWidth: { xs: "100%", md: 400 },
                      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 250, 252, 0.6) 100%)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: "rgba(99, 102, 241, 0.25)",
                        boxShadow: "0 12px 36px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,1)"
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        px: 2.5, 
                        py: 2, 
                        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))", 
                        borderBottom: "1px solid rgba(226, 232, 240, 0.8)", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 1.5 
                      }}
                    >
                      <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(99,102,241,0.25)" }}>
                        <Typography fontWeight={900} color="white" fontSize="0.9rem">{group.groupName}</Typography>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={800}>Group {group.groupName}</Typography>
                    </Box>
                    <GroupStandings group={group} participants={gParticipants} matches={gMatches} advanceCount={advanceCount} />
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* ── Knockout Bracket Tab / full bracket for knockout-only ── */}
      {(!isGroupKnockout || tab === 1) && (
        <Box>
          {koMatches.length === 0 ? (
            <Paper 
              sx={{ 
                p: 6, 
                textAlign: "center", 
                borderRadius: 4,
                background: "rgba(255,255,255,0.4)",
                backdropFilter: "blur(10px)",
                border: "1px dashed rgba(226, 232, 240, 1)"
              }}
            >
              <EmojiEvents sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
              <Typography color="text.secondary" fontWeight={500}>Knockout bracket has not been generated yet.</Typography>
            </Paper>
          ) : (
            <Box>
              {/* Horizontal bracket */}
              <HorizontalBracket matches={koMatches} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SpecialTournamentBracketPage;
