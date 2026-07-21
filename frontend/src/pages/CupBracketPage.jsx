import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Stack,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { EmojiEvents, Edit, SportsSoccer } from "@mui/icons-material";
import cupService from "../services/cupService";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import { getLogoUrl } from "../utils/imageUtils";
import SEO from "../components/SEO";

// ─── Layout constants ────────────────────────────────────────────────────────
const MATCH_HEIGHT = 103; // Actual rendered card height: 2 rows × ~50px + 1px inner border + 2px Paper border
const BASE_GAP = 20;
const BASE_SLOT_H = MATCH_HEIGHT + BASE_GAP; // 110 px
const CARD_WIDTH = 210;
const H_STUB = 20; // horizontal stub on each side of vertical connector
const LINE_THICKNESS = 2;
const JOIN_OVERLAP = 1;
// Column width = card + stub + vertical + stub (right margin for bracket lines)
const RIGHT_MARGIN = H_STUB + LINE_THICKNESS + H_STUB; // 62 px
const COL_WIDTH = CARD_WIDTH + RIGHT_MARGIN; // 282 px
// x of vertical connector line, relative to slot-Box left edge
const VERT_X = CARD_WIDTH + H_STUB; // 250 px

const CupBracketPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const [bracketData, setBracketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdminOrMod =
    user?.userLevel === "admin" || user?.userLevel === "moderator";

  useEffect(() => {
    fetchBracket();
  }, []);

  const fetchBracket = async () => {
    setLoading(true);
    try {
      const res = await cupService.getBracket();
      setBracketData(res.data?.data || []);
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Failed to load bracket data", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = (match) => {
    if (!match.homeUserId || !match.awayUserId) {
      enqueueSnackbar("This match does not have both players yet", { variant: "info" });
      return;
    }
    setSelectedMatch(match);
    setHomeScore(match.homeScore ?? "");
    setAwayScore(match.awayScore ?? "");
    setReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (homeScore === "" || awayScore === "" || isNaN(parseInt(homeScore)) || isNaN(parseInt(awayScore))) {
      enqueueSnackbar("Please enter all scores", { variant: "warning" });
      return;
    }
    if (parseInt(homeScore) < 0 || parseInt(awayScore) < 0) {
      enqueueSnackbar("Scores cannot be negative", { variant: "warning" });
      return;
    }
    if (parseInt(homeScore) === parseInt(awayScore)) {
      enqueueSnackbar("Cup matches must have a winner (no draws)", { variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await cupService.reportResult(selectedMatch.id, {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
      });
      enqueueSnackbar(res.data?.message || "Result saved successfully", {
        variant: "success",
      });
      setReportModalOpen(false);
      fetchBracket();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save result", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canReport = (match) => {
    if (!user) return false;
    if (match.isBye) return false;
    // Cannot report if either side is TBD
    if (!match.homeUserId || !match.awayUserId) return false;
    if (isAdminOrMod) return true;
    if (match.isPlayed) return false;
    return match.homeUserId === user.userId || match.awayUserId === user.userId;
  };

  // 1. Calculate active players count (unique non-null/non-empty user IDs)
  const uniqueUsers = new Set();
  bracketData.forEach((m) => {
    if (m.homeUserId && m.homeUserId !== "TBD" && m.homeUserId !== "null") uniqueUsers.add(m.homeUserId);
    if (m.awayUserId && m.awayUserId !== "TBD" && m.awayUserId !== "null") uniqueUsers.add(m.awayUserId);
  });
  const totalUniqueUsers = uniqueUsers.size;

  // 2. Identify rounds
  const allRounds = [...new Set(bracketData.map((m) => m.round))].sort(
    (a, b) => b - a,
  );

  // 3. Detect if play-in fallback should be active (< 70% of 64, i.e., < 45 players)
  const isPlayInActive = allRounds.includes(64) && totalUniqueUsers < 45;
  const playInMatches = isPlayInActive
    ? bracketData.filter((m) => m.round === 64 && !m.isBye)
    : [];

  const rounds = isPlayInActive
    ? allRounds.filter((r) => r <= 32)
    : allRounds;

  const handleDistributePrizes = async () => {
    if (!window.confirm("คุณต้องการคำนวณและแจกเงินรางวัลบอลถ้วยประจำซีซั่นนี้ใหม่หรือไม่?")) return;
    try {
      const res = await cupService.distributePrizes();
      enqueueSnackbar(res.data?.message || "แจกเงินรางวัลบอลถ้วยสำเร็จ!", { variant: "success" });
      fetchBracket();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "คำนวณเงินรางวัลบอลถ้วยไม่สำเร็จ", { variant: "error" });
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.default",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <SEO 
        title="ตารางสายการแข่งขันฟุตบอลถ้วย Cup Bracket" 
        description="สายการจับคู่และอันดับล่วงหน้าของทัวร์นาเมนต์บอลถ้วยแบบแพ้คัดออก (Knockout Cup) ในรายการ eTPL ประจำฤดูกาล ติดตามดูคู่แข่งขัน รายงานผลการแข่งขัน และผู้ผ่านเข้ารอบต่อไป"
        keywords="สายแข่งบอลถ้วย eTPL, Cup Bracket eTPL, บอลถ้วย eTPL, eFootball PES Knockout, ตารางการแข่งขัน eTPL Cup"
      />

      {/* Decorative Blur Blobs */}
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
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0) 70%)",
        filter: "blur(100px)",
        animation: "floatBlob3 30s infinite ease-in-out",
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

      <Box sx={{ position: "relative", zIndex: 1, px: { xs: 1.5, sm: 2, md: 3 }, py: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            px: { xs: 1, sm: 0 },
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Cup Bracket
              </Typography>
              <Typography variant="body2" color="text.secondary">
                KNOCKOUT TOURNAMENT TREE
              </Typography>
            </Box>
          </Box>

          {isAdminOrMod && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EmojiEvents />}
              onClick={handleDistributePrizes}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: "bold" }}
            >
              คำนวณเงินรางวัลบอลถ้วย
            </Button>
          )}
        </Box>

      {/* Play-in Matches Section */}
      {!loading && isPlayInActive && playInMatches.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 4,
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(241, 245, 249, 0.65) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: "rgba(226, 232, 240, 0.8)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1)",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: "rgba(203, 213, 225, 0.8)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
            }
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              <SportsSoccer sx={{ color: "white", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ color: "#1e293b", letterSpacing: 0.5 }}>
                รอบคัดเลือก / Play-in Matches
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                ผู้เล่นในลีกที่ไม่มีสิทธิ์บายในรอบแรก ต้องแข่งขันรอบคัดเลือกเพื่อผ่านเข้าสู่รอบ 32 ทีมสุดท้าย
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
            }}
          >
            {playInMatches.map((match) => {
              const isHomeWinner = match.isPlayed && match.homeScore > match.awayScore;
              const isAwayWinner = match.isPlayed && match.awayScore > match.homeScore;
              const hasReportPermission = canReport(match);
              
              return (
                <Paper
                  key={match.id}
                  elevation={1}
                  sx={{
                    width: { xs: "100%", sm: 300 },
                    borderRadius: 3.5,
                    overflow: "hidden",
                    background: "white",
                    border: "1px solid",
                    borderColor: match.isPlayed ? "rgba(34, 197, 94, 0.2)" : "rgba(226, 232, 240, 0.8)",
                    boxShadow: match.isPlayed 
                      ? "0 4px 12px rgba(34, 197, 94, 0.05)" 
                      : "0 4px 12px rgba(0,0,0,0.02)",
                    position: "relative",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: match.isPlayed
                        ? "0 8px 20px rgba(34, 197, 94, 0.1)"
                        : "0 8px 20px rgba(0,0,0,0.06)",
                    },
                  }}
                >
                  {/* Match header */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      bgcolor: match.isPlayed ? "rgba(34, 197, 94, 0.04)" : "#f8fafc",
                      borderBottom: "1px solid",
                      borderColor: match.isPlayed ? "rgba(34, 197, 94, 0.1)" : "rgba(226, 232, 240, 0.8)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: match.isPlayed ? "success.main" : "text.secondary" }}>
                      {match.isPlayed ? "COMPLETED" : "CUP PLAY-IN"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                      Match #{match.matchNo}
                    </Typography>
                  </Box>

                  {/* Home Player */}
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      bgcolor: isHomeWinner ? "rgba(34, 197, 94, 0.06)" : "transparent",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.5} sx={{ maxWidth: "75%" }}>
                      <Avatar
                        src={getLogoUrl(match.homeLogo || match.homeTeam)}
                        sx={{
                          width: 32,
                          height: 32,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                          bgcolor: match.homeLogo || match.homeTeam
                            ? "transparent"
                            : isHomeWinner
                            ? "success.main"
                            : "#3b82f6",
                          color: match.homeLogo || match.homeTeam ? "grey.500" : "#fff",
                          "& img": { objectFit: "contain", p: "2px" },
                        }}
                      >
                        H
                      </Avatar>
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography
                          variant="body2"
                          fontWeight={isHomeWinner ? 800 : 600}
                          noWrap
                          sx={{ color: isHomeWinner ? "success.dark" : "text.primary" }}
                        >
                          {match.homeUserId || "TBD"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {match.homeTeam || "Team A"}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h6" fontWeight="800" sx={{ color: isHomeWinner ? "success.dark" : "text.primary" }}>
                      {match.isPlayed ? match.homeScore : "-"}
                    </Typography>
                  </Box>

                  {/* Away Player */}
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      bgcolor: isAwayWinner ? "rgba(34, 197, 94, 0.06)" : "transparent",
                      borderTop: "1px solid rgba(226, 232, 240, 0.5)",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.5} sx={{ maxWidth: "75%" }}>
                      <Avatar
                        src={getLogoUrl(match.awayLogo || match.awayTeam)}
                        sx={{
                          width: 32,
                          height: 32,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                          bgcolor: match.awayLogo || match.awayTeam
                            ? "transparent"
                            : isAwayWinner
                            ? "success.main"
                            : "#ef4444",
                          color: match.awayLogo || match.awayTeam ? "grey.500" : "#fff",
                          "& img": { objectFit: "contain", p: "2px" },
                        }}
                      >
                        A
                      </Avatar>
                      <Box sx={{ overflow: "hidden" }}>
                        <Typography
                          variant="body2"
                          fontWeight={isAwayWinner ? 800 : 600}
                          noWrap
                          sx={{ color: isAwayWinner ? "success.dark" : "text.primary" }}
                        >
                          {match.awayUserId || "TBD"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {match.awayTeam || "Team B"}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h6" fontWeight="800" sx={{ color: isAwayWinner ? "success.dark" : "text.primary" }}>
                      {match.isPlayed ? match.awayScore : "-"}
                    </Typography>
                  </Box>

                  {/* Report Button overlay/action */}
                  {hasReportPermission && (
                    <Box
                      sx={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                      }}
                    >
                      <IconButton
                        size="small"
                        color="primary"
                        sx={{
                          bgcolor: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          border: "1px solid rgba(226, 232, 240, 0.8)",
                          "&:hover": { bgcolor: "#f1f5f9" },
                        }}
                        onClick={() => handleOpenReport(match)}
                      >
                        {match.isPlayed ? (
                          <Edit fontSize="small" />
                        ) : (
                          <SportsSoccer fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Paper>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : bracketData.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary">
            ยังไม่มีสายการแข่งขันในซีซั่นนี้
          </Typography>
        </Paper>
      ) : (
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
          {rounds.map((roundVal, roundIndex) => {
            const matchesInRound = bracketData.filter(
              (m) => m.round === roundVal,
            );
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
                    {isFinal ? "FINAL" : `ROUND OF ${roundVal}`}
                  </Typography>
                </Box>

                <Box sx={{ position: "relative" }}>
                  {slots.map((matchNo) => {
                    const match = matchesInRound.find(
                      (m) => m.matchNo === matchNo,
                    );
                    // isBye = no match record OR match.isBye === true
                    const isBye = !match || match.isBye === true;
                    const isOdd = matchNo % 2 !== 0;

                    const pairMatchNo = isOdd ? matchNo + 1 : matchNo - 1;
                    const pairMatch = matchesInRound.find(
                      (m) => m.matchNo === pairMatchNo,
                    );
                    const pairIsBye = !pairMatch || pairMatch.isBye === true;

                    // ── Vertical connector + exit line geometry ──────────────
                    //
                    // Offsets are relative to the TOP of the current slot Box (height = slotH).
                    //
                    // Slot layout (odd slot on top, even slot directly below, same height):
                    //
                    //   [odd  slot, height=slotH]   mid = slotH/2
                    //   [even slot, height=slotH]   mid = slotH + slotH/2  = slotH*1.5
                    //
                    // The exit line (→ next round) must always exit at the TRUE midpoint
                    // between the two real match cards:
                    //
                    //   exitY_abs = average of midpoints of the two NON-BYE slots
                    //             = slotH/2         if only odd  is real  (even is bye)
                    //             = slotH*1.5       if only even is real  (odd  is bye)
                    //             = slotH           if both are real      (average of slotH/2 and slotH*1.5)
                    //
                    // Wait — "midpoint between two real cards" when both are real:
                    //   (slotH/2 + slotH*1.5) / 2 = slotH  ✓ (boundary between the two slots)
                    //
                    // When one is bye the "pair" degenerates to just the one real card's midpoint.
                    // That is exactly where the exit should go.
                    //
                    // The vertical connector spans from the real card's stub end to the exit point
                    // (or from exit point to the other real card's stub end):
                    //
                    //   Both real  → connector: slotH/2 → slotH*1.5,  exit at slotH
                    //   Odd real, even bye  → connector: slotH/2 → slotH,  exit at slotH/2
                    //                         (vertical of length slotH/2, exit at its END = bottom)
                    //   Odd bye, even real  → connector: slotH → slotH*1.5, exit at slotH*1.5
                    //                         (vertical of length slotH/2, exit at its START = top)
                    //
                    // Hmm — but exit at slotH/2 means the exit stub is at the card's own midpoint
                    // which is also where the outbound stub already is. That's correct: when the
                    // partner is bye, the winner just passes straight through — the vertical is just
                    // a short corner connector.
                    //
                    // Simplify: for the ODD slot, we compute everything relative to odd-slot top.
                    //
                    //   realOddMid  = slotH / 2            (if odd is real, else not used)
                    //   realEvenMid = slotH * 1.5          (if even is real, else not used)
                    //
                    //   exitAbsY (rel to odd-slot top):
                    //     both real  → slotH          (midpoint between the two)
                    //     odd real only  → slotH / 2  (straight through, connector length = 0...
                    //                                   draw a tiny corner: slotH/2 → slotH/2, height=1)
                    //     even real only → slotH * 1.5
                    //
                    //   lineStart (top of vertical, rel to odd-slot top):
                    //     = min(exitAbsY, realMid of whichever is real)
                    //     both real  → min(slotH, slotH/2) = slotH/2
                    //     odd only   → slotH/2  (exit = oddMid, connector length = 0)
                    //     even only  → slotH    (exit = evenMid = slotH*1.5... no, exit=slotH*1.5)
                    //                  lineStart = slotH, lineEnd = slotH*1.5
                    //
                    // Final clean summary for ODD slot:
                    //
                    //   Case A (both real):
                    //     lineStart = slotH/2,   lineEnd = slotH*1.5,  exitAbsY = slotH
                    //   Case B (odd real, even bye):
                    //     lineStart = slotH/2,   lineEnd = slotH,      exitAbsY = slotH/2
                    //     → vertical from oddMid down to midBoundary, exit at oddMid (top of vertical)
                    //   Case C (odd bye, even real):
                    //     lineStart = slotH,     lineEnd = slotH*1.5,  exitAbsY = slotH*1.5
                    //     → vertical from midBoundary down to evenMid, exit at evenMid (bottom)
                    //   Case D (both bye): no connector

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
                    // exitOffsetY is relative to the connector Box's own top (lineStart)
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
                            <Paper
                              elevation={2}
                              sx={{
                                borderRadius: 3,
                                overflow: "hidden",
                                background: "white",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              {/* Home row */}
                              <Box
                                sx={{
                                  p: 1.5,
                                  px: 2,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  bgcolor:
                                    match.isPlayed &&
                                    match.homeScore > match.awayScore
                                      ? "rgba(46,125,50,0.08)"
                                      : "transparent",
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={1.5}
                                >
                                  <Avatar
                                    src={getLogoUrl(match.homeLogo || match.homeTeam)}
                                    sx={{
                                      width: 26,
                                      height: 26,
                                      fontSize: 11,
                                      fontWeight: "bold",
                                      bgcolor: match.homeLogo || match.homeTeam
                                        ? "transparent"
                                        : match.isPlayed &&
                                          match.homeScore > match.awayScore
                                        ? "success.main"
                                        : "#3b82f6",
                                      color: match.homeLogo || match.homeTeam ? "grey.500" : "#fff",
                                      "& img": { objectFit: "contain", p: "2px" },
                                    }}
                                  >
                                    H
                                  </Avatar>
                                  <Typography
                                    variant="body2"
                                    fontWeight={
                                      match.isPlayed &&
                                      match.homeScore > match.awayScore
                                        ? "bold"
                                        : "500"
                                    }
                                  >
                                    {match.homeUserId || "TBD"}
                                  </Typography>
                                </Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {match.isPlayed ? match.homeScore : "-"}
                                </Typography>
                              </Box>
                              {/* Away row */}
                              <Box
                                sx={{
                                  p: 1.5,
                                  px: 2,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  bgcolor:
                                    match.isPlayed &&
                                    match.awayScore > match.homeScore
                                      ? "rgba(46,125,50,0.08)"
                                      : "transparent",
                                }}
                              >
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={1.5}
                                >
                                  <Avatar
                                    src={getLogoUrl(match.awayLogo || match.awayTeam)}
                                    sx={{
                                      width: 26,
                                      height: 26,
                                      fontSize: 11,
                                      fontWeight: "bold",
                                      bgcolor: match.awayLogo || match.awayTeam
                                        ? "transparent"
                                        : match.isPlayed &&
                                          match.awayScore > match.homeScore
                                        ? "success.main"
                                        : "#ef4444",
                                      color: match.awayLogo || match.awayTeam ? "grey.500" : "#fff",
                                      "& img": { objectFit: "contain", p: "2px" },
                                    }}
                                  >
                                    A
                                  </Avatar>
                                  <Typography
                                    variant="body2"
                                    fontWeight={
                                      match.isPlayed &&
                                      match.awayScore > match.homeScore
                                        ? "bold"
                                        : "500"
                                    }
                                  >
                                    {match.awayUserId || "TBD"}
                                  </Typography>
                                </Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {match.isPlayed ? match.awayScore : "-"}
                                </Typography>
                              </Box>
                            </Paper>

                            {/* Report icon — outside Paper so not clipped */}
                            {canReport(match) && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  right: -16,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  cursor: (!match.homeUserId || !match.awayUserId || match.isBye) ? "not-allowed" : "pointer",
                                  opacity: (!match.homeUserId || !match.awayUserId || match.isBye) ? 0.8 : 1,
                                  "&:hover": {
                                    boxShadow: (!match.homeUserId || !match.awayUserId || match.isBye) 
                                      ? "0 4px 12px rgba(0,0,0,0.05)" 
                                      : "0 12px 24px rgba(0,0,0,0.12)",
                                    transform: (!match.homeUserId || !match.awayUserId || match.isBye) 
                                      ? "translateY(-50%)" 
                                      : "translateY(-50%) translateY(-2px)",
                                  },
                                  zIndex: 10,
                                }}
                              >
                                <IconButton
                                  size="small"
                                  color="primary"
                                  sx={{
                                    bgcolor: "#fff",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                                    "&:hover": { bgcolor: "#f0f0f0" },
                                  }}
                                  onClick={() => handleOpenReport(match)}
                                >
                                  {match.isPlayed ? (
                                    <Edit fontSize="small" />
                                  ) : (
                                    <SportsSoccer fontSize="small" />
                                  )}
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        )}

                        {isFinal && matchNo === 1 && (
                          <Box
                            component="img"
                            src="/trophy.png"
                            alt="Champion Trophy"
                            sx={{
                              position: "absolute",
                              left: CARD_WIDTH / 2,
                              top: Math.max(8, (slotH - MATCH_HEIGHT) / 2 - 130),
                              transform: "translateX(-50%)",
                              height: 120,
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
                                  boxShadow: "0 0 6px rgba(251, 191, 36, 0.4)",
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
                                  boxShadow: "0 0 6px rgba(251, 191, 36, 0.4)",
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
                                    boxShadow: "0 0 6px rgba(251, 191, 36, 0.4)",
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
      )}

      {/* Report Modal */}
      <Dialog
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 3,
            pb: 2,
            background: "linear-gradient(to right, #1e293b, #334155)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <SportsSoccer sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight="800" sx={{ letterSpacing: 0.5 }}>
              {selectedMatch?.isPlayed && isAdminOrMod
                ? "EDIT MATCH RESULT"
                : "REPORT CUP RESULT"}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setReportModalOpen(false)} 
            sx={{ color: "rgba(255,255,255,0.7)", "&:hover": { color: "white" } }}
          >
            <Box sx={{ fontSize: 24, fontWeight: "bold" }}>×</Box>
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", overflowY: "auto" }}>
          {selectedMatch && (
            <Box sx={{ py: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: { xs: 2, md: 4 },
                  mb: 4,
                }}
              >
                {/* Home Team */}
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Avatar
                    src={getLogoUrl(selectedMatch.homeLogo || selectedMatch.homeTeam)}
                    sx={{
                      width: { xs: 60, md: 80 },
                      height: { xs: 60, md: 80 },
                      mx: "auto",
                      mb: 2,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      bgcolor: "white",
                      border: "4px solid white",
                      "& img": { objectFit: "contain", p: 1 },
                    }}
                  >
                    H
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight="800" color="text.primary" noWrap>
                    {selectedMatch.homeUserId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
                    {selectedMatch.homeTeam || "TEAM A"}
                  </Typography>
                </Box>

                {/* Score Input */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 3,
                    py: 1,
                    borderRadius: 3,
                    bgcolor: "white",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <TextField
                    type="number"
                    variant="standard"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    inputProps={{ min: 0 }}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: "2rem",
                        fontWeight: "900",
                        width: 50,
                        textAlign: "center",
                        "& input": { textAlign: "center", p: 0 },
                      },
                    }}
                  />
                  <Typography variant="h5" fontWeight="900" color="grey.300">
                    :
                  </Typography>
                  <TextField
                    type="number"
                    variant="standard"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    inputProps={{ min: 0 }}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: "2rem",
                        fontWeight: "900",
                        width: 50,
                        textAlign: "center",
                        "& input": { textAlign: "center", p: 0 },
                      },
                    }}
                  />
                </Box>

                {/* Away Team */}
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Avatar
                    src={getLogoUrl(selectedMatch.awayLogo || selectedMatch.awayTeam)}
                    sx={{
                      width: { xs: 60, md: 80 },
                      height: { xs: 60, md: 80 },
                      mx: "auto",
                      mb: 2,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      bgcolor: "white",
                      border: "4px solid white",
                      "& img": { objectFit: "contain", p: 1 },
                    }}
                  >
                    A
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight="800" color="text.primary" noWrap>
                    {selectedMatch.awayUserId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
                    {selectedMatch.awayTeam || "TEAM B"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography variant="body2" color="warning.main" fontWeight="bold">
                  * Cup matches must have a winner
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: "white", justifyContent: "center" }}>
          <Button
            onClick={() => setReportModalOpen(false)}
            sx={{
              px: 4,
              borderRadius: 2,
              color: "text.secondary",
              fontWeight: "bold",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitReport}
            disabled={submitting || !selectedMatch?.homeUserId || !selectedMatch?.awayUserId}
            sx={{
              px: 6,
              borderRadius: 2,
              fontWeight: "bold",
              background: "linear-gradient(to right, #2563eb, #3b82f6)",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              "&:hover": {
                background: "linear-gradient(to right, #1d4ed8, #2563eb)",
              },
            }}
          >
            {submitting ? "Saving..." : "Confirm Result"}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default CupBracketPage;
