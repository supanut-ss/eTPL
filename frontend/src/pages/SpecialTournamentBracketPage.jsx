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
      bgcolor: isWinner ? "rgba(99, 102, 241, 0.08)" : "transparent",
      transition: "background-color 0.2s ease",
    }}>
      <Box display="flex" alignItems="center" gap={1.5} sx={{ overflow: "hidden", flex: 1 }}>
        <Avatar src={logoUrl} sx={{ 
          width: 26, 
          height: 26, 
          fontSize: 11, 
          fontWeight: "bold", 
          bgcolor: logoUrl ? "transparent" : (isWinner ? "#6366f1" : "rgba(255, 255, 255, 0.1)"), 
          color: "rgba(241, 245, 249, 0.8)",
          flexShrink: 0,
          boxShadow: isWinner ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "none"
        }}>
          {(name || "?")[0]}
        </Avatar>
        <Box sx={{ overflow: "hidden" }}>
          <Typography variant="body2" fontWeight={isWinner ? 800 : 500} noWrap
            sx={{ display: "block", color: isWinner ? "#818cf8" : "rgba(241, 245, 249, 0.9)" }}>
            {name || "TBD"}
          </Typography>
          {teamName && <Typography variant="caption" color="rgba(241, 245, 249, 0.5)" noWrap sx={{ display: "block", fontSize: "0.65rem" }}>{teamName}</Typography>}
        </Box>
      </Box>
      <Typography variant="body1" fontWeight="bold" sx={{ color: isWinner ? "#818cf8" : "rgba(241, 245, 249, 0.5)", ml: 1, minWidth: 20, textAlign: "center" }}>
        {match.isPlayed ? score : "-"}
      </Typography>
    </Box>
  );

  return (
    <Paper elevation={0} sx={{
      width: CARD_WIDTH,
      height: MATCH_HEIGHT,
      borderRadius: 3,
      overflow: "hidden",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      background: match.isBye 
        ? "rgba(255, 255, 255, 0.02)" 
        : "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)",
      boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
      backdropFilter: "blur(12px)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      "&:hover": {
        transform: "translateY(-3px)",
        borderColor: "rgba(99, 102, 241, 0.4)",
        boxShadow: "0 12px 24px rgba(99, 102, 241, 0.15)",
      },
    }}>
      {match.isBye ? (
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <Avatar src={match.homeLogoUrl} sx={{ width: 28, height: 28, bgcolor: match.homeLogoUrl ? "transparent" : "#6366f1", fontSize: 12 }}>{(match.homeDisplayName || "?")[0]}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ color: "#ffffff" }}>{match.homeDisplayName}</Typography>
            <Chip label="BYE" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", mt: 0.5 }} />
          </Box>
        </Box>
      ) : (
        <Box>
          {playerRow(match.homeDisplayName, match.homeTeamName, match.homeLogoUrl, isHomeWinner, match.homeScore)}
          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.05)" }} />
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
                  ? "linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.02) 100%)"
                  : "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: isFinal 
                  ? "rgba(251, 191, 36, 0.25)" 
                  : "rgba(255, 255, 255, 0.06)",
                boxShadow: isFinal
                  ? "0 4px 12px rgba(251, 191, 36, 0.05)"
                  : "0 4px 12px rgba(0, 0, 0, 0.2)",
                backdropFilter: "blur(8px)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  borderColor: isFinal 
                    ? "rgba(251, 191, 36, 0.4)" 
                    : "rgba(255, 255, 255, 0.12)",
                }
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{
                  color: isFinal ? "#fbbf24" : "rgba(241, 245, 249, 0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {isFinal && <EmojiEvents sx={{ fontSize: 18, color: "#fbbf24" }} />}
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
                      <Box
                        component="img"
                        src="/special-trophy.png"
                        alt="Champion Trophy"
                        sx={{
                          position: "absolute",
                          left: CARD_WIDTH / 2,
                          top: Math.max(8, (slotH - MATCH_HEIGHT) / 2 - 150),
                          transform: "translateX(-50%)",
                          height: 140,
                          width: "auto",
                          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))",
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
                              bgcolor: "rgba(251, 191, 36, 0.6)",
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
                              bgcolor: "rgba(251, 191, 36, 0.6)",
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
                                  bgcolor: "rgba(251, 191, 36, 0.6)",
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
    return { ...p, mp: w + d + l, w, d, l, pts: w * 3 + d, gd: gf - ga, gf, ga };
  }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  return (
    <Box sx={{ p: 0.5 }}>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: { xs: 300, sm: 380 } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.02)" }}>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", pl: { xs: 1, sm: 2 }, pr: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>#</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>Team</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>P</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>W</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>D</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>L</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>GF</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>GA</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>GD</TableCell>
              <TableCell align="center" sx={{ fontWeight: 900, fontSize: "0.75rem", px: { xs: 0.5, sm: 1.5 }, color: "#818cf8", borderColor: "rgba(255, 255, 255, 0.05)" }}>PTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((p, idx) => {
              const isAdvancing = idx < advanceCount;
              return (
                <TableRow 
                  key={p.id} 
                  sx={{ 
                    bgcolor: isAdvancing ? "rgba(99, 102, 241, 0.04)" : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isAdvancing ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
                    }
                  }}
                >
                  <TableCell sx={{ pl: { xs: 1, sm: 2 }, pr: { xs: 0.5, sm: 1.5 }, borderColor: "rgba(255, 255, 255, 0.05)" }}>
                    {isAdvancing ? (
                      <Box sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 20, sm: 24 },
                        height: { xs: 20, sm: 24 },
                        borderRadius: "50%",
                        border: `2px solid ${idx === 0 ? "#fbbf24" : "#818cf8"}`,
                        color: idx === 0 ? "#fbbf24" : "#818cf8",
                        bgcolor: idx === 0 ? "rgba(251, 191, 36, 0.1)" : "rgba(129, 140, 248, 0.1)",
                        fontWeight: 800,
                        fontSize: { xs: "0.7rem", sm: "0.8rem" }
                      }}>
                        {idx + 1}
                      </Box>
                    ) : (
                      <Box sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 20, sm: 24 },
                        height: { xs: 20, sm: 24 },
                        fontSize: "0.8rem",
                        fontWeight: 400,
                        color: "rgba(241, 245, 249, 0.6)"
                      }}>
                        {idx + 1}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ px: { xs: 0.5, sm: 1.5 }, borderColor: "rgba(255, 255, 255, 0.05)" }}>
                    <Box display="flex" alignItems="center" gap={isMobile ? 0.75 : 1.2}>
                      <Avatar src={p.logoUrl} sx={{ 
                        width: isMobile ? 20 : 24, 
                        height: isMobile ? 20 : 24, 
                        fontSize: isMobile ? 9 : 10, 
                        bgcolor: p.logoUrl ? "transparent" : (isAdvancing ? "#6366f1" : "rgba(255, 255, 255, 0.1)"),
                        boxShadow: isAdvancing ? "0 2px 6px rgba(99, 102, 241, 0.2)" : "none"
                      }}>
                        {p.displayName[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={isAdvancing ? 700 : 500} noWrap sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, color: "rgba(241, 245, 249, 0.95)" }}>{p.displayName}</Typography>
                        {p.teamName && <Typography variant="caption" color="rgba(241, 245, 249, 0.5)" sx={{ fontSize: "0.6rem", display: "block" }} noWrap>{p.teamName}</Typography>}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: "rgba(241, 245, 249, 0.7)", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.mp}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", fontWeight: 600, color: "#4ade80", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.w}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: "rgba(241, 245, 249, 0.7)", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.d}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: "#f87171", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.l}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: "rgba(241, 245, 249, 0.7)", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.gf}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: "rgba(241, 245, 249, 0.7)", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.ga}</TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.8rem", color: p.gd > 0 ? "#4ade80" : p.gd < 0 ? "#f87171" : "rgba(241, 245, 249, 0.5)", borderColor: "rgba(255, 255, 255, 0.05)" }}>
                    {p.gd > 0 ? `+${p.gd}` : p.gd}
                  </TableCell>
                  <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1.5 }, fontSize: "0.9rem", fontWeight: 900, color: "#818cf8", borderColor: "rgba(255, 255, 255, 0.05)" }}>{p.pts}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.05)" }} />
      <Typography variant="caption" color="rgba(241, 245, 249, 0.5)" fontWeight={700} display="block" px={2} mb={1} sx={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>Match Results</Typography>
      <Box px={2} pb={2}>
        {matches.map(m => (
          <Box 
            key={m.id} 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              py: 1, 
              px: 1.5, 
              borderRadius: 2.5, 
              mb: 0.75, 
              bgcolor: m.isPlayed ? "rgba(99, 102, 241, 0.05)" : "rgba(255, 255, 255, 0.02)", 
              border: "1px solid", 
              borderColor: m.isPlayed ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.05)", 
              transition: "all 0.2s ease",
              "&:hover": { 
                transform: "translateY(-1px)", 
                bgcolor: m.isPlayed ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.04)",
                borderColor: m.isPlayed ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.1)" 
              } 
            }}
          >
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "right", mr: 1.5, color: "rgba(241, 245, 249, 0.9)" }} noWrap>{m.homeDisplayName}</Typography>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1.5, bgcolor: m.isPlayed ? "#6366f1" : "rgba(255, 255, 255, 0.06)", minWidth: 52, textAlign: "center", border: "1px solid rgba(255,255,255,0.04)" }}>
              <Typography variant="caption" fontWeight={800} color={m.isPlayed ? "white" : "rgba(241, 245, 249, 0.5)"}>
                {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
              </Typography>
            </Box>
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "left", ml: 1.5, color: "rgba(241, 245, 249, 0.9)" }} noWrap>{m.awayDisplayName}</Typography>
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
    <Box sx={{
      width: "100%",
      minHeight: "100vh",
      bgcolor: "#08090d",
      position: "relative",
      overflow: "hidden",
      color: "#f8fafc",
      // Liquid background animations
      "@keyframes floatBlob1": {
        "0%": { transform: "translate(0px, 0px) scale(1)" },
        "33%": { transform: "translate(40px, -60px) scale(1.15)" },
        "66%": { transform: "translate(-30px, 30px) scale(0.9)" },
        "100%": { transform: "translate(0px, 0px) scale(1)" },
      },
      "@keyframes floatBlob2": {
        "0%": { transform: "translate(0px, 0px) scale(1)" },
        "50%": { transform: "translate(-50px, 50px) scale(1.1)" },
        "100%": { transform: "translate(0px, 0px) scale(1)" },
      },
      "@keyframes floatBlob3": {
        "0%": { transform: "translate(0px, 0px) scale(1)" },
        "40%": { transform: "translate(30px, 30px) scale(0.95)" },
        "100%": { transform: "translate(0px, 0px) scale(1)" },
      }
    }}>
      <SEO
        title={`${tournament.name} | Special Tournament | eTPL`}
        description={tournament.description || `Match tree and standings for ${tournament.name}`}
        keywords={`Special Tournament, ${tournament.name}, eTPL`}
      />

      {/* Liquid Gradient Background Blobs */}
      <Box sx={{
        position: "absolute",
        top: "10%",
        left: "15%",
        width: "50vw",
        height: "50vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 70%)",
        filter: "blur(90px)",
        animation: "floatBlob1 28s infinite ease-in-out",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <Box sx={{
        position: "absolute",
        top: "45%",
        right: "10%",
        width: "55vw",
        height: "55vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.07) 0%, rgba(139, 92, 246, 0) 70%)",
        filter: "blur(110px)",
        animation: "floatBlob2 34s infinite ease-in-out",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <Box sx={{
        position: "absolute",
        bottom: "10%",
        left: "30%",
        width: "40vw",
        height: "40vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(148, 163, 184, 0.05) 0%, rgba(148, 163, 184, 0) 70%)",
        filter: "blur(80px)",
        animation: "floatBlob3 22s infinite ease-in-out",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Faint Background Football Stadium Watermark */}
      <Box sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url(/stadium.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 0.05,
        filter: "brightness(0.7) contrast(1.1)",
        zIndex: 0,
        pointerEvents: "none",
      }} />

      <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: 3, width: "100%", maxWidth: "100%", mx: "auto", position: "relative", zIndex: 1 }}>
        {/* Back Button */}
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate(-1)} 
          sx={{ 
            mb: 3, 
            color: "rgba(241, 245, 249, 0.7)",
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2,
            px: 2,
            border: "1px solid rgba(255, 255, 255, 0.06)",
            bgcolor: "rgba(255, 255, 255, 0.02)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            "&:hover": {
              color: "#ffffff",
              bgcolor: "rgba(99, 102, 241, 0.08)",
              borderColor: "rgba(99, 102, 241, 0.3)",
              transform: "translateX(-4px)",
            },
            transition: "all 0.2s ease"
          }} 
          size="small"
        >
          Back
        </Button>

        {/* Unified Premium Header Card (Glassmorphism Split Banner) */}
        <Paper 
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid rgba(255, 255, 255, 0.06)",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
            backdropFilter: "blur(20px)",
            mb: 4,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(251, 191, 36, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            overflow: "hidden",
            minHeight: { md: 240 },
            position: "relative"
          }}
        >
          {/* Top glowing accent line */}
          <Box sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #fbbf24 0%, #d97706 60%, transparent 100%)",
            borderTopLeftRadius: "inherit",
            borderTopRightRadius: "inherit",
            zIndex: 4,
            pointerEvents: "none"
          }} />

          {/* Diagonal glowing divider line */}
          {tournament.sponsorBannerUrl && (
            <Box 
              sx={{
                display: { xs: "none", md: "block" },
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
                clipPath: "polygon(66% 0, calc(66% + 1.5px) 0, calc(60% + 1.5px) 100%, 60% 100%)",
                zIndex: 3,
                pointerEvents: "none"
              }}
            />
          )}

          {/* Left Panel: Tournament Details */}
          <Box 
            sx={{ 
              flex: 1,
              p: { xs: 3, sm: 4 },
              pr: { xs: 3, sm: 4, md: tournament.sponsorBannerUrl ? 5 : 4 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              zIndex: 1
            }}
          >
            <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={3}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant={isMobile ? "h5" : "h4"}
                  fontWeight={300}
                  sx={{
                    color: "#ffffff",
                    lineHeight: 1.2,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                    textShadow: "0 2px 10px rgba(255,255,255,0.05)"
                  }}
                >
                  {tournament.name}
                </Typography>
                {tournament.description && (
                  <Typography variant="body2" sx={{ mt: 1.2, fontWeight: 400, color: "rgba(241, 245, 249, 0.6)", letterSpacing: "0.05em" }}>
                    {tournament.description}
                  </Typography>
                )}
                
                {/* Meta details chips */}
                <Box display="flex" gap={1.2} mt={2.5} flexWrap="wrap">
                  <Chip 
                    label={isGroupKnockout ? "Group Stage + Knockout" : "Knockout"} 
                    size="small"
                    sx={{ 
                      bgcolor: "rgba(255, 255, 255, 0.04)", 
                      color: "rgba(241, 245, 249, 0.8)", 
                      fontWeight: 600, 
                      fontSize: "0.7rem", 
                      height: 22,
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      letterSpacing: "0.04em"
                    }} 
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
                        ? <CheckCircle sx={{ fontSize: 12, color: "#4ade80 !important" }} /> 
                        : tournament.status === "ongoing" 
                        ? <PlayArrow sx={{ fontSize: 12, color: "#818cf8 !important" }} /> 
                        : <HowToReg sx={{ fontSize: 12, color: "rgba(241, 245, 249, 0.8) !important" }} />
                    }
                    sx={{ 
                      fontWeight: 600, 
                      fontSize: "0.7rem", 
                      height: 22, 
                      px: 0.5,
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "rgba(241, 245, 249, 0.8)",
                      letterSpacing: "0.04em",
                      "& .MuiChip-icon": { ml: 0.5 }
                    }} 
                  />
                  <Chip 
                    label={`${participants.length} Teams`} 
                    size="small" 
                    icon={<Groups sx={{ fontSize: 12, color: "rgba(241, 245, 249, 0.8) !important" }} />} 
                    sx={{ 
                      bgcolor: "rgba(255, 255, 255, 0.04)", 
                      color: "rgba(241, 245, 249, 0.8)", 
                      fontWeight: 600, 
                      fontSize: "0.7rem", 
                      height: 22,
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      letterSpacing: "0.04em",
                      "& .MuiChip-icon": { ml: 0.5 }
                    }} 
                  />
                </Box>
              </Box>

              {/* Champion Badge (aligned right) */}
              {champion && (
                <Box sx={{ flexShrink: 0, mt: { xs: 1, sm: 0 } }}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 1.8, 
                      borderRadius: 3, 
                      border: "1px solid rgba(245, 158, 11, 0.25)", 
                      background: "linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.02) 100%)", 
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 8px 20px rgba(245, 158, 11, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                      display: "flex", 
                      alignItems: "center", 
                      gap: 1.5,
                      transition: "transform 0.3s ease",
                      "&:hover": {
                        transform: "scale(1.03) rotate(1deg)",
                      }
                    }}
                  >
                    <Box
                      component="img"
                      src="/special-trophy.png"
                      alt="Trophy"
                      sx={{
                        height: 56,
                        width: "auto",
                        filter: "drop-shadow(0 2px 8px rgba(251, 191, 36, 0.4))",
                      }}
                    />
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="#fbbf24" display="block" sx={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.65rem" }}>🏆 CHAMPION</Typography>
                      <Typography variant="body1" fontWeight={800} color="#ffffff" sx={{ fontSize: "0.95rem" }}>{champion}</Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right Panel: Sponsor Image Split Banner */}
          {tournament.sponsorBannerUrl && (
            <Box 
              sx={{ 
                width: { xs: "100%", md: "40%" },
                minHeight: { xs: 190, md: "auto" },
                position: "relative",
                clipPath: { xs: "none", md: "polygon(15% 0, 100% 0, 100% 100%, 0 100%)" },
                overflow: "hidden",
                borderLeft: { xs: "none", md: "1px solid rgba(255, 255, 255, 0.06)" },
                borderTop: { xs: "1px solid rgba(255, 255, 255, 0.06)", md: "none" }
              }}
            >
              {/* Blurred Background Cover */}
              <Box sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${tournament.sponsorBannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(12px) brightness(0.35)",
                transform: "scale(1.15)",
                pointerEvents: "none"
              }} />
              
              {/* Clean contained overlay image */}
              <Box sx={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: { xs: 3, md: 4 },
                pl: { xs: 3, md: 8 }
              }}>
                <Box
                  component="img"
                  src={tournament.sponsorBannerUrl}
                  alt="Sponsor"
                  sx={{
                    maxHeight: { xs: 105, sm: 135, md: 160 },
                    maxWidth: { xs: "90%", md: "78%" },
                    objectFit: "contain",
                    borderRadius: 1.5,
                    filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
                    transition: "transform 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.03)"
                    }
                  }}
                />
              </Box>
            </Box>
          )}
        </Paper>

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
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)", 
              "& .MuiTabs-indicator": {
                backgroundColor: "#6366f1",
              },
              "& .MuiTab-root": {
                fontWeight: 700,
                fontSize: isMobile ? "0.78rem" : "0.85rem",
                textTransform: "none",
                color: "rgba(241, 245, 249, 0.5)",
                transition: "all 0.2s ease",
                minWidth: isMobile ? "auto" : 100,
                px: isMobile ? 2 : 4,
                "&.Mui-selected": {
                  color: "#6366f1",
                },
                "&:hover": {
                  color: "rgba(241, 245, 249, 0.85)",
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
                  background: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(10px)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  color: "rgba(241, 245, 249, 0.5)"
                }}
              >
                <Groups sx={{ fontSize: 56, color: "rgba(255, 255, 255, 0.15)", mb: 2 }} />
                <Typography color="inherit" fontWeight={500}>Group stage has not been generated yet.</Typography>
              </Paper>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                {groups.map(group => {
                  const gParticipants = participants.filter(p => p.groupId === group.id);
                  const gMatches = groupMatches.filter(m => m.groupId === group.id);
                  return (
                    <Paper 
                      key={group.id} 
                      elevation={0} 
                      sx={{ 
                        borderRadius: 4, 
                        border: "1px solid rgba(255, 255, 255, 0.06)", 
                        overflow: "hidden", 
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
                        backdropFilter: "blur(20px)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          borderColor: "rgba(99, 102, 241, 0.3)",
                          boxShadow: "0 12px 36px rgba(99, 102, 241, 0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
                        }
                      }}
                    >
                      <Box 
                        sx={{ 
                          px: 2.5, 
                          py: 2, 
                          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))", 
                          borderBottom: "1px solid rgba(255, 255, 255, 0.05)", 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 1.5 
                        }}
                      >
                        <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(99,102,241,0.25)" }}>
                          <Typography fontWeight={900} color="white" fontSize="0.9rem">{group.groupName}</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#ffffff">Group {group.groupName}</Typography>
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
                  background: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(10px)",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  color: "rgba(241, 245, 249, 0.5)"
                }}
              >
                <EmojiEvents sx={{ fontSize: 56, color: "rgba(255, 255, 255, 0.15)", mb: 2 }} />
                <Typography color="inherit" fontWeight={500}>Knockout bracket has not been generated yet.</Typography>
              </Paper>
            ) : (
              <Box>
                {/* Mobile horizontal scrolling helper */}
                {isMobile && (
                  <Box sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                    mb: 3,
                    py: 1.2,
                    px: 2.5,
                    borderRadius: 3,
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    color: "rgba(241, 245, 249, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    animation: "pulse 2s infinite ease-in-out",
                    "@keyframes pulse": {
                      "0%": { opacity: 0.7, transform: "scale(1)" },
                      "50%": { opacity: 1, transform: "scale(1.01)" },
                      "100%": { opacity: 0.7, transform: "scale(1)" }
                    }
                  }}>
                    <Typography variant="caption" fontWeight={800} sx={{ letterSpacing: "0.08em" }}>
                      ↔️ SWIPE HORIZONTALLY TO VIEW BRACKET
                    </Typography>
                  </Box>
                )}
                
                {/* Horizontal bracket */}
                <HorizontalBracket matches={koMatches} />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default SpecialTournamentBracketPage;
