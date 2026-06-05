import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Avatar, CircularProgress, Chip, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Button, Tabs, Tab,
  useTheme, useMediaQuery,
} from "@mui/material";
import { EmojiEvents, Groups, SportsSoccer, ArrowBack } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import specialTournamentService from "../services/specialTournamentService";
import SEO from "../components/SEO";

// ─── Layout constants for TOP-DOWN bracket ──────────────────────────────────
const CARD_W = 220;     // match card width
const CARD_H = 96;      // match card height (2 rows × 44px + 8px gap)
const ROW_GAP = 60;     // vertical gap between card rows in the same round level
const COL_GAP = 40;     // horizontal gap between sibling cards in same round
const LINE_W = 2;       // connector line thickness

// Round label helper
const roundLabel = (r) => {
  if (r === 2)  return "รอบชิงชนะเลิศ";
  if (r === 4)  return "รอบรองชนะเลิศ";
  if (r === 8)  return "รอบก่อนรองชนะเลิศ";
  if (r === 16) return "รอบ 16 ทีม";
  if (r === 32) return "รอบ 32 ทีม";
  if (r === 64) return "รอบ 64 ทีม";
  return `รอบ ${r} ทีม`;
};

// ─── Single Match Card ───────────────────────────────────────────────────────
const MatchCard = ({ match }) => {
  if (!match) return null;
  const isHomeWinner = match.isPlayed && !match.isBye && match.homeScore > match.awayScore;
  const isAwayWinner = match.isPlayed && !match.isBye && match.awayScore > match.homeScore;

  const playerRow = (name, teamName, logoUrl, isWinner, score, isBye) => (
    <Box sx={{
      px: 1.5, py: 0.75,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      bgcolor: isWinner ? "rgba(99,102,241,0.08)" : "transparent",
      transition: "background 0.2s",
    }}>
      <Box display="flex" alignItems="center" gap={1} sx={{ overflow: "hidden", flex: 1 }}>
        <Avatar src={logoUrl} sx={{ width: 24, height: 24, fontSize: 10, fontWeight: 700, bgcolor: isWinner ? "#6366f1" : "#94a3b8", flexShrink: 0 }}>
          {(name || "?")[0]}
        </Avatar>
        <Box sx={{ overflow: "hidden" }}>
          <Typography variant="caption" fontWeight={isWinner ? 800 : 600} noWrap
            sx={{ display: "block", color: isWinner ? "#6366f1" : "text.primary" }}>
            {name || "TBD"}
          </Typography>
          {teamName && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.65rem" }}>{teamName}</Typography>}
        </Box>
      </Box>
      <Typography variant="body2" fontWeight={800} sx={{ color: isWinner ? "#6366f1" : "text.secondary", ml: 1, minWidth: 20, textAlign: "center" }}>
        {isBye ? "—" : match.isPlayed ? score : "-"}
      </Typography>
    </Box>
  );

  return (
    <Paper elevation={match.isPlayed ? 3 : 1} sx={{
      width: CARD_W,
      borderRadius: 2.5,
      overflow: "hidden",
      border: "1px solid",
      borderColor: match.isPlayed ? "rgba(99,102,241,0.25)" : "rgba(226,232,240,0.8)",
      background: match.isBye ? "rgba(248,250,252,0.5)" : "white",
      boxShadow: match.isPlayed
        ? "0 4px 16px rgba(99,102,241,0.12)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      transition: "all 0.2s",
      "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" },
    }}>
      {match.isBye ? (
        <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, height: CARD_H }}>
          <Avatar src={match.homeLogoUrl} sx={{ width: 28, height: 28, bgcolor: "#6366f1", fontSize: 12 }}>{(match.homeDisplayName || "?")[0]}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>{match.homeDisplayName}</Typography>
            <Chip label="BYE" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "rgba(99,102,241,0.1)", color: "#6366f1", mt: 0.5 }} />
          </Box>
        </Box>
      ) : (
        <Box>
          {playerRow(match.homeDisplayName, match.homeTeamName, match.homeLogoUrl, isHomeWinner, match.homeScore, false)}
          <Divider />
          {playerRow(match.awayDisplayName, match.awayTeamName, match.awayLogoUrl, isAwayWinner, match.awayScore, false)}
        </Box>
      )}
    </Paper>
  );
};

// ─── Top-Down Bracket Renderer ───────────────────────────────────────────────
// rounds = sorted array of round values from SMALLEST (Final=2) to LARGEST
// so row 0 = Final (top), last row = first round (bottom)
const TopDownBracket = ({ matches }) => {
  const allRoundVals = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b); // [2,4,8,16,...]
  // Display order: final on top → early rounds at bottom
  const rounds = allRoundVals; // [2, 4, 8, 16] — render top to bottom

  // Champion: winner of round-2 match
  const finalMatch = matches.find(m => m.round === 2);
  const champion = finalMatch?.isPlayed
    ? (finalMatch.homeScore > finalMatch.awayScore ? { name: finalMatch.homeDisplayName, logo: finalMatch.homeLogoUrl, team: finalMatch.homeTeamName } : { name: finalMatch.awayDisplayName, logo: finalMatch.awayLogoUrl, team: finalMatch.awayTeamName })
    : null;

  // Build rows: [round=2 row, round=4 row, ...]
  // For layout: each subsequent round has 2× the cards, spread wider
  const rows = rounds.map((r) => {
    const roundMatches = matches.filter(m => m.round === r).sort((a, b) => a.matchNo - b.matchNo);
    return { round: r, matches: roundMatches };
  });

  // Calculate total canvas width based on deepest row
  const deepestRow = rows[rows.length - 1];
  const deepestCount = deepestRow?.matches.length || 1;
  const canvasWidth = deepestCount * CARD_W + (deepestCount - 1) * COL_GAP;

  // Position of each card in each row: evenly spaced within canvasWidth
  const getPositions = (count) => {
    if (count === 1) return [(canvasWidth - CARD_W) / 2];
    const spacing = canvasWidth / count;
    return Array.from({ length: count }, (_, i) => i * spacing + (spacing - CARD_W) / 2);
  };

  // Total height: champion zone + rows + gaps
  const totalHeight = 80 + rows.length * (CARD_H + ROW_GAP + 40);

  return (
    <Box sx={{ overflowX: "auto", pb: 4 }}>
      <Box sx={{ position: "relative", width: canvasWidth, mx: "auto", height: totalHeight }}>
        {/* Champion Banner */}
        {champion && (
          <Box sx={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", textAlign: "center", width: 200 }}>
            <EmojiEvents sx={{ fontSize: 40, color: "gold", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))" }} />
            <Box sx={{ mt: 0.5, p: 1, borderRadius: 2, bgcolor: "linear-gradient(135deg,#fef3c7,#fffbeb)", border: "1px solid #fde68a" }}>
              <Avatar src={champion.logo} sx={{ width: 32, height: 32, mx: "auto", mb: 0.5, bgcolor: "#6366f1" }}>{champion.name[0]}</Avatar>
              <Typography variant="caption" fontWeight={800} color="#d97706" display="block">{champion.name}</Typography>
              {champion.team && <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{champion.team}</Typography>}
            </Box>
          </Box>
        )}

        {rows.map((row, rowIdx) => {
          const positions = getPositions(row.matches.length);
          const yTop = (champion ? 120 : 20) + rowIdx * (CARD_H + ROW_GAP + 40);

          // Draw connector lines from this row's cards UP to the parent row
          const parentRow = rowIdx > 0 ? rows[rowIdx - 1] : null;
          const parentPositions = parentRow ? getPositions(parentRow.matches.length) : [];

          return (
            <React.Fragment key={row.round}>
              {/* Round label */}
              <Box sx={{ position: "absolute", top: yTop - 28, left: 0, width: "100%", display: "flex", justifyContent: "center" }}>
                <Chip
                  label={roundLabel(row.round)}
                  size="small"
                  icon={row.round === 2 ? <EmojiEvents sx={{ fontSize: 14, color: "#d97706 !important" }} /> : undefined}
                  sx={{
                    fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.05em",
                    bgcolor: row.round === 2 ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.08)",
                    color: row.round === 2 ? "#d97706" : "#6366f1",
                    border: "1px solid", borderColor: row.round === 2 ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.2)",
                  }}
                />
              </Box>

              {/* Connector lines from this row up to parent */}
              {parentRow && row.matches.map((m, mIdx) => {
                const myX = positions[mIdx] + CARD_W / 2;
                const myY = yTop;  // top of this card
                const parentIdx = Math.floor(mIdx / 2);
                const parentX = parentPositions[parentIdx] + CARD_W / 2;
                const parentY = yTop - (ROW_GAP + 40) + CARD_H; // bottom of parent card

                // Vertical line from parentY (bottom of parent) down to midpoint
                // Then horizontal line to myX, then vertical down to myY
                const midY = parentY + (myY - parentY) / 2;

                return (
                  <svg key={`line-${m.id}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                    <path
                      d={`M ${parentX} ${parentY} L ${parentX} ${midY} L ${myX} ${midY} L ${myX} ${myY}`}
                      stroke="rgba(148,163,184,0.6)" strokeWidth={LINE_W} fill="none"
                      strokeDasharray={m.isPlayed ? "none" : "4,3"}
                    />
                  </svg>
                );
              })}

              {/* Match cards */}
              {row.matches.map((m, mIdx) => (
                <Box key={m.id} sx={{ position: "absolute", top: yTop, left: positions[mIdx] }}>
                  <MatchCard match={m} />
                </Box>
              ))}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Group Standings Table ────────────────────────────────────────────────────
const GroupStandings = ({ group, participants, matches, advanceCount }) => {
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
    <Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", pl: 1 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>ทีม</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>W</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>D</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>L</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>GF</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>GA</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem" }}>GD</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.75rem", color: "#6366f1" }}>PTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {standings.map((p, idx) => {
              const isAdvancing = idx < advanceCount;
              return (
                <TableRow key={p.id} sx={{ bgcolor: isAdvancing ? "rgba(99,102,241,0.04)" : "transparent" }}>
                  <TableCell sx={{ pl: 1, fontSize: "0.8rem", fontWeight: isAdvancing ? 800 : 400, color: isAdvancing ? "#6366f1" : "text.secondary" }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar src={p.logoUrl} sx={{ width: 22, height: 22, fontSize: 10, bgcolor: isAdvancing ? "#6366f1" : "#94a3b8" }}>{p.displayName[0]}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={isAdvancing ? 700 : 500}>{p.displayName}</Typography>
                        {p.teamName && <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{p.teamName}</Typography>}
                      </Box>
                      {isAdvancing && <Chip label="ผ่าน" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "rgba(99,102,241,0.1)", color: "#6366f1", ml: 0.5 }} />}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.8rem", fontWeight: 600, color: "success.main" }}>{p.w}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.8rem" }}>{p.d}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.8rem", color: "error.main" }}>{p.l}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.8rem" }}>{p.gf}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.8rem" }}>{p.ga}</TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.8rem", color: p.gd > 0 ? "success.main" : p.gd < 0 ? "error.main" : "text.secondary" }}>
                    {p.gd > 0 ? `+${p.gd}` : p.gd}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: "0.9rem", fontWeight: 900, color: "#6366f1" }}>{p.pts}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Divider sx={{ my: 1.5 }} />
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" px={1} mb={1}>ผลการแข่งขัน</Typography>
      <Box px={1} pb={1}>
        {matches.map(m => (
          <Box key={m.id} sx={{ display: "flex", alignItems: "center", py: 0.75, px: 1, borderRadius: 1.5, mb: 0.5, bgcolor: m.isPlayed ? "rgba(99,102,241,0.04)" : "#fafafa", border: "1px solid", borderColor: m.isPlayed ? "rgba(99,102,241,0.15)" : "divider" }}>
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "right", mr: 1 }} noWrap>{m.homeDisplayName}</Typography>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, bgcolor: m.isPlayed ? "#6366f1" : "#e2e8f0", minWidth: 52, textAlign: "center" }}>
              <Typography variant="caption" fontWeight={800} color={m.isPlayed ? "white" : "text.secondary"}>
                {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : "vs"}
              </Typography>
            </Box>
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, textAlign: "left", ml: 1 }} noWrap>{m.awayDisplayName}</Typography>
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
        enqueueSnackbar("รายการนี้ยังไม่เปิดเผยสู่สาธารณะ", { variant: "warning" });
      } else {
        enqueueSnackbar("โหลดข้อมูลไม่สำเร็จ", { variant: "error" });
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
      <Typography color="text.secondary">ไม่พบรายการแข่งขัน</Typography>
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
    ? ["กลุ่มแข่งขัน", "Knockout Bracket"]
    : ["Bracket"];

  return (
    <Box sx={{ width: "100%", bgcolor: "background.default", minHeight: "100vh" }}>
      <SEO
        title={`${tournament.name} | Special Tournament | eTPL`}
        description={tournament.description || `สายการแข่งขัน ${tournament.name}`}
        keywords={`Special Tournament, ${tournament.name}, eTPL`}
      />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2, color: "text.secondary" }} size="small">
          กลับ
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
                <Chip label={isGroupKnockout ? "Group Stage + Knockout" : "Knockout"} size="small"
                  sx={{ bgcolor: "rgba(99,102,241,0.1)", color: "#6366f1", fontWeight: 700, fontSize: "0.7rem" }} />
                <Chip label={tournament.status === "completed" ? "จบแล้ว" : tournament.status === "ongoing" ? "กำลังแข่งขัน" : "ลงทะเบียน"} size="small"
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }} color={tournament.status === "completed" ? "success" : tournament.status === "ongoing" ? "primary" : "default"} />
                <Chip label={`${participants.length} ทีม`} size="small" icon={<Groups sx={{ fontSize: 13 }} />} sx={{ fontWeight: 600, fontSize: "0.7rem" }} />
              </Box>
            </Box>
          </Box>

          {/* Champion badge */}
          {champion && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid rgba(245,158,11,0.3)", background: "linear-gradient(135deg,#fffbeb,#fef3c7)", display: "flex", alignItems: "center", gap: 1.5 }}>
              <EmojiEvents sx={{ color: "gold", fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} />
              <Box>
                <Typography variant="caption" fontWeight={700} color="#d97706" display="block">🏆 แชมป์</Typography>
                <Typography variant="body1" fontWeight={900} color="#92400e">{champion}</Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Tabs (only if group_knockout) */}
      {isGroupKnockout && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
          <Tab label="กลุ่มแข่งขัน" icon={<Groups sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Knockout Bracket" icon={<EmojiEvents sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      )}

      {/* ── Group Stage Tab ── */}
      {(!isGroupKnockout || tab === 0) && isGroupKnockout && (
        <Box>
          {groups.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
              <Groups sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary">ยังไม่ได้สร้างกลุ่มการแข่งขัน</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {groups.map(group => {
                const gParticipants = participants.filter(p => p.groupId === group.id);
                const gMatches = groupMatches.filter(m => m.groupId === group.id);
                return (
                  <Paper key={group.id} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden", flex: "1 1 420px", minWidth: { xs: "100%", md: 400 } }}>
                    <Box sx={{ px: 2.5, py: 1.5, background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))", borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: "8px", bgcolor: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography fontWeight={900} color="white" fontSize="0.9rem">{group.groupName}</Typography>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={800}>กลุ่ม {group.groupName}</Typography>
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
            <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
              <EmojiEvents sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary">ยังไม่ได้สร้าง Knockout Bracket</Typography>
            </Paper>
          ) : (
            <Box>
              {/* Top-down bracket */}
              <TopDownBracket matches={koMatches} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SpecialTournamentBracketPage;
