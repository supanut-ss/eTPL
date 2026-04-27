import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Avatar, Tooltip, Stack,
  Chip, CircularProgress
} from "@mui/material";
import { EmojiEvents, Edit, SportsSoccer } from "@mui/icons-material";
import cupService from "../services/cupService";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";

const CupBracketPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  
  const [bracketData, setBracketData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdminOrMod = user?.userLevel === "admin" || user?.userLevel === "moderator";

  useEffect(() => {
    fetchBracket();
  }, []);

  const fetchBracket = async () => {
    setLoading(true);
    try {
      const res = await cupService.getBracket();
      setBracketData(res.data?.data || []);
    } catch (error) {
      console.error(error);
      enqueueSnackbar("ดึงข้อมูลสายการแข่งขันไม่สำเร็จ", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = (match) => {
    setSelectedMatch(match);
    setHomeScore(match.homeScore ?? "");
    setAwayScore(match.awayScore ?? "");
    setReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (homeScore === "" || awayScore === "") {
      enqueueSnackbar("กรุณากรอกสกอร์ให้ครบถ้วน", { variant: "warning" });
      return;
    }
    if (parseInt(homeScore) === parseInt(awayScore)) {
      enqueueSnackbar("บอลถ้วยต้องมีผู้ชนะ (ห้ามเสมอ)", { variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await cupService.reportResult(selectedMatch.id, {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore)
      });
      enqueueSnackbar(res.data?.message || "บันทึกผลสำเร็จ", { variant: "success" });
      setReportModalOpen(false);
      fetchBracket(); 
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "บันทึกผลไม่สำเร็จ", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const canReport = (match) => {
    if (!user) return false;
    if (match.isBye) return false;
    if (isAdminOrMod) return true;
    if (match.isPlayed) return false;
    return match.homeUserId === user.id || match.awayUserId === user.id;
  };

  const rounds = [...new Set(bracketData.map(m => m.round))].sort((a, b) => b - a);

  return (
    <Box sx={{ width: "100%", px: { xs: 0, sm: 0 }, bgcolor: "background.default", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, px: { xs: 1, sm: 0 }, pt: 4 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Cup Bracket</Typography>
            <Typography variant="body2" color="text.secondary">KNOCKOUT TOURNAMENT TREE</Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : bracketData.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary">ยังไม่มีสายการแข่งขันในซีซั่นนี้</Typography>
        </Paper>
      ) : (() => {
        const matchHeight = 92;
        const baseGap = 32;
        const baseSlotHeight = matchHeight + baseGap;
        
        return (
          <Box sx={{ 
            display: "flex", 
            overflowX: "auto", 
            pb: 8,
            gap: 0,
            "&::-webkit-scrollbar": { height: 8 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 4 }
          }}>
            {rounds.map((roundVal, roundIndex) => {
              const matchesInRound = bracketData.filter(m => m.round === roundVal);
              const isFinal = roundVal === 2;
              const currentSlotHeight = baseSlotHeight * Math.pow(2, roundIndex);
              const numSlots = roundVal / 2;
              const slots = Array.from({ length: numSlots }, (_, i) => i + 1);
              
              return (
                <Box key={roundVal} sx={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  minWidth: 280, 
                  position: "relative" 
                }}>
                  {/* Fixed Y-axis Header */}
                  <Box sx={{ height: 80, mb: 2, display: "flex", alignItems: "center", justifyContent: "center", width: 240 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ 
                      color: isFinal ? "primary.main" : "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      background: isFinal ? "rgba(25, 118, 210, 0.08)" : "rgba(0,0,0,0.03)",
                      py: 1, px: 3,
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: isFinal ? "primary.light" : "divider",
                    }}>
                      {isFinal ? "FINAL" : `ROUND OF ${roundVal}`}
                    </Typography>
                  </Box>

                  <Box sx={{ position: "relative" }}>
                    {slots.map(matchNo => {
                      const match = matchesInRound.find(m => m.matchNo === matchNo);
                      const isBye = !match || match.isBye;
                      
                      return (
                        <Box key={matchNo} sx={{ 
                          height: currentSlotHeight, 
                          position: "relative",
                          width: 240
                        }}>
                          {/* INBOUND LINE (from left) - For all rounds except the first */}
                          {roundIndex > 0 && (
                            <Box sx={{ 
                              position: "absolute", left: -40, top: "50%", 
                              width: 40, height: "2px", bgcolor: "grey.400" 
                            }} />
                          )}

                          {!isBye ? (
                            <Paper elevation={2} sx={{ 
                              position: "absolute",
                              top: (currentSlotHeight - matchHeight) / 2,
                              left: 0,
                              width: "100%",
                              borderRadius: 3, 
                              overflow: "hidden", 
                              background: "white",
                              border: "1px solid",
                              borderColor: "divider",
                              zIndex: 1
                            }}>
                              <Box sx={{ 
                                p: 1.5, px: 2,
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center",
                                bgcolor: match.isPlayed && match.homeScore > match.awayScore ? "rgba(46, 125, 50, 0.08)" : "transparent",
                                borderBottom: "1px solid",
                                borderColor: "divider"
                              }}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <Avatar sx={{ width: 26, height: 26, fontSize: 11, fontWeight: "bold", bgcolor: match.isPlayed && match.homeScore > match.awayScore ? "success.main" : "#3b82f6", color: "#fff" }}>
                                    H
                                  </Avatar>
                                  <Typography variant="body2" fontWeight={match.isPlayed && match.homeScore > match.awayScore ? "bold" : "500"}>
                                    {match.homeName || "TBD"}
                                  </Typography>
                                </Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {match.isPlayed ? match.homeScore : "-"}
                                </Typography>
                              </Box>

                              <Box sx={{ 
                                p: 1.5, px: 2,
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center",
                                bgcolor: match.isPlayed && match.awayScore > match.homeScore ? "rgba(46, 125, 50, 0.08)" : "transparent"
                              }}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <Avatar sx={{ width: 26, height: 26, fontSize: 11, fontWeight: "bold", bgcolor: match.isPlayed && match.awayScore > match.homeScore ? "success.main" : "#ef4444", color: "#fff" }}>
                                    A
                                  </Avatar>
                                  <Typography variant="body2" fontWeight={match.isPlayed && match.awayScore > match.homeScore ? "bold" : "500"}>
                                    {match.awayName || "TBD"}
                                  </Typography>
                                </Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {match.isPlayed ? match.awayScore : "-"}
                                </Typography>
                              </Box>

                              {canReport(match) && (
                                <Box sx={{ position: "absolute", right: -15, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
                                  <IconButton 
                                    size="small" 
                                    color="primary" 
                                    sx={{ bgcolor: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", "&:hover": { bgcolor: "#f0f0f0" } }}
                                    onClick={() => handleOpenReport(match)}
                                  >
                                    {match.isPlayed ? <Edit fontSize="small" /> : <SportsSoccer fontSize="small" />}
                                  </IconButton>
                                </Box>
                              )}
                            </Paper>
                          ) : null}

                          {/* BRACKET LINES - DRAW FOR ALL TO KEEP TREE STRUCTURE */}
                          {!isFinal && (
                            <>
                              <Box sx={{ 
                                position: "absolute", right: -40, top: "50%", 
                                width: 40, height: "2px", bgcolor: "grey.400" 
                              }} />
                              
                              {matchNo % 2 !== 0 && (
                                <Box sx={{ 
                                  position: "absolute", right: -40, top: "50%", 
                                  width: "2px", height: currentSlotHeight, bgcolor: "grey.400",
                                  zIndex: 0
                                }}>
                                  <Box sx={{ 
                                    position: "absolute", left: 0, top: currentSlotHeight / 2, 
                                    width: 40, height: "2px", bgcolor: "grey.400" 
                                  }} />
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
            
            {rounds.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", minWidth: 260, pl: 8 }}>
                <Box sx={{ height: 80, mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "gold", textTransform: "uppercase", letterSpacing: 2 }}>
                    CHAMPION
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center", mt: ( (baseSlotHeight * Math.pow(2, rounds.length-1)) / 2 ) - 40 }}>
                  <EmojiEvents sx={{ fontSize: 80, color: "gold", mb: 2, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" }} />
                  {(() => {
                    const finalMatch = bracketData.find(m => m.round === 2);
                    if (finalMatch && finalMatch.isPlayed) {
                      const champName = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeName : finalMatch.awayName;
                      return (
                        <Paper elevation={4} sx={{ 
                          p: 3, mt: 3, 
                          borderRadius: 4, 
                          background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)", 
                          border: "2px solid gold",
                          boxShadow: "0 8px 32px rgba(255,215,0,0.15)"
                        }}>
                          <Typography variant="h5" fontWeight="bold" color="primary.dark">{champName}</Typography>
                        </Paper>
                      );
                    }
                    return (
                      <Paper elevation={1} sx={{ p: 2, mt: 3, borderRadius: 4, bgcolor: "rgba(0,0,0,0.02)", border: "2px dashed divider" }}>
                        <Typography variant="body1" color="text.secondary">TBD</Typography>
                      </Paper>
                    );
                  })()}
                </Box>
              </Box>
            )}
          </Box>
        );
      })()}

      <Dialog open={reportModalOpen} onClose={() => setReportModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
          <SportsSoccer color="primary" /> {selectedMatch?.isPlayed && isAdminOrMod ? "แก้ไขผลการแข่งขัน" : "รายงานผลบอลถ้วย"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedMatch && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontWeight="bold" sx={{ width: "40%" }} noWrap>{selectedMatch.homeName}</Typography>
                <TextField 
                  type="number" 
                  size="small" 
                  sx={{ width: "25%" }} 
                  value={homeScore} 
                  onChange={(e) => setHomeScore(e.target.value)} 
                  inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 'bold' } }}
                />
              </Box>
              <Box display="flex" justifyContent="center">
                <Typography variant="caption" color="text.secondary" fontWeight="bold">VS</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontWeight="bold" sx={{ width: "40%" }} noWrap>{selectedMatch.awayName}</Typography>
                <TextField 
                  type="number" 
                  size="small" 
                  sx={{ width: "25%" }} 
                  value={awayScore} 
                  onChange={(e) => setAwayScore(e.target.value)} 
                  inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 'bold' } }}
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReportModalOpen(false)} color="inherit">ยกเลิก</Button>
          <Button onClick={handleSubmitReport} variant="contained" color="primary" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "ยืนยันผล"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CupBracketPage;
