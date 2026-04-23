import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Stack,
  Autocomplete,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  GlobalStyles,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse
} from "@mui/material";
import {
  PersonAdd,
  EmojiEvents,
  CloudDownload,
  CheckCircle,
  Error as ErrorIcon,
  Search,
  MilitaryTech,
  AutoAwesome,
  Shield,
  Public,
  Code,
  Input,
  ManageHistory,
  Save,
  Refresh,
  Storage,
  Payments,
  ThumbUp,
  ThumbDown,
  Lock,
  KeyboardArrowDown,
  KeyboardArrowUp
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

const AdminDataPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // --- State Definitions ---
  const [playerId, setPlayerId] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [importMode, setImportMode] = useState("auto"); // "auto" or "manual"
  const [pastedHtml, setPastedHtml] = useState("");

  const [users, setUsers] = useState([]);
  const [hofData, setHofData] = useState({
    platform: "PC",
    season: "", 
    tournamentTitle: "eTPL League",
    winnerName: "",
    displayColor: "#fbbf24",
  });
  const [winnerTeam, setWinnerTeam] = useState("");
  const [addingHof, setAddingHof] = useState(false);

  // Special Bonus State
  const [bonuses, setBonuses] = useState([]);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusRequest, setBonusRequest] = useState({ userId: "", amount: "", reason: "" });
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedBonusId, setSelectedBonusId] = useState(null);
  const [modalMode, setModalMode] = useState("bonus"); // "bonus" | "prizes"
  const [adminPassword, setAdminPassword] = useState("");
  const [pendingPrizes, setPendingPrizes] = useState(null);
  const [submittingBonus, setSubmittingBonus] = useState(false);

  const [prizeGroups, setPrizeGroups] = useState([
    { rank: "1st", amount: "600" },
    { rank: "2nd", amount: "500" },
    { rank: "3rd", amount: "450" },
    { rank: "4th", amount: "410" },
    { rank: "5th", amount: "380" },
    { rank: "6th", amount: "350" },
    { rank: "7-8th", amount: "330" },
    { rank: "9-12th", amount: "310" },
    { rank: "13-16th", amount: "290" },
    { rank: "17th +", amount: "270" },
  ]);
  const [showPrizeSettings, setShowPrizeSettings] = useState(true);
  const [savingPrizes, setSavingPrizes] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchUsers();
    fetchPrizes();
    fetchBonuses();
  }, []);

  useEffect(() => {
    const fetchTeam = async () => {
      if (hofData.winnerName && hofData.season) {
        try {
          const res = await adminService.getUserTeam(hofData.winnerName, hofData.platform, hofData.season);
          setWinnerTeam(res.data?.teamName || "");
        } catch (err) {
          console.error("Failed to fetch team", err);
          setWinnerTeam("");
        }
      } else {
        setWinnerTeam("");
      }
    };
    fetchTeam();
  }, [hofData.winnerName, hofData.season, hofData.platform]);

  // --- API Handlers ---
  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    }
  };

  const fetchPrizes = async () => {
    try {
      const res = await adminService.getPrizes();
      if (res.data && Array.isArray(res.data)) {
        setPrizeGroups(res.data.map(p => ({
          rank: p.rankLabel || "",
          amount: (p.amount || 0).toString()
        })));
      }
    } catch (err) {
      console.error("Failed to fetch prizes", err);
    }
  };

  const fetchBonuses = async () => {
    try {
      const res = await adminService.getBonuses();
      setBonuses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch bonuses", err);
    }
  };

  const handleBonusRequest = async () => {
    if (!bonusRequest.userId || !bonusRequest.amount || !bonusRequest.reason) {
      enqueueSnackbar("Please fill all fields", { variant: "warning" });
      return;
    }
    try {
      setSubmittingBonus(true);
      await adminService.requestBonus({ ...bonusRequest, amount: Number(bonusRequest.amount) });
      enqueueSnackbar("Bonus request submitted!", { variant: "success" });
      setBonusModalOpen(false);
      setBonusRequest({ userId: "", amount: "", reason: "" });
      fetchBonuses();
    } catch (err) {
      enqueueSnackbar("Failed to submit bonus", { variant: "error" });
    } finally {
      setSubmittingBonus(false);
    }
  };

  const handleApproveBonus = async () => {
    if (!adminPassword) {
      enqueueSnackbar("Please enter admin password", { variant: "warning" });
      return;
    }
    try {
      if (modalMode === "bonus") {
        await adminService.approveBonus({ bonusId: selectedBonusId, password: adminPassword });
        enqueueSnackbar("Bonus approved!", { variant: "success" });
        fetchBonuses();
      } else {
        await adminService.savePrizes({ prizes: pendingPrizes, password: adminPassword });
        enqueueSnackbar("Prizes saved successfully!", { variant: "success" });
      }
      setApproveModalOpen(false);
      setAdminPassword("");
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Authorization failed", { variant: "error" });
    }
  };

  const handleRejectBonus = async (id) => {
    if (!window.confirm("Reject this bonus?")) return;
    try {
      await adminService.rejectBonus(id);
      enqueueSnackbar("Bonus rejected", { variant: "info" });
      fetchBonuses();
    } catch (err) {
      enqueueSnackbar("Failed to reject bonus", { variant: "error" });
    }
  };

  const handleScrape = async () => {
    if (!playerId) {
      enqueueSnackbar("Please enter a Player ID", { variant: "warning" });
      return;
    }
    try {
      setScraping(true);
      setScrapedData(null);
      const res = await adminService.scrapePlayer(playerId);
      setScrapedData(res.data);
      enqueueSnackbar("Player data synced successfully!", { variant: "success" });
      setPlayerId("");
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Scraping failed", { variant: "error" });
    } finally {
      setScraping(false);
    }
  };

  const handleManualParse = () => {
    if (!pastedHtml || !playerId) {
      enqueueSnackbar("Please enter Player ID AND paste HTML content", { variant: "warning" });
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(pastedHtml, "text/html");
      const getXPathNode = (xpath) => doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

      const spanOvr = getXPathNode("//tr[th[contains(text(),'Overall Rating')]]/td/b") || 
                      getXPathNode("//td[text()='Overall Rating:']/following-sibling::td/b") ||
                      getXPathNode("//span[@class='c0' and @id='a0']");
      
      const data = {
        idPlayer: parseInt(playerId),
        playerOvr: spanOvr ? parseInt(spanOvr.textContent) : 0,
        playerName: (getXPathNode("//tr/th[text()='Player Name:']/following-sibling::td/span")?.textContent || 
                    getXPathNode("//td[text()='Player Name:']/following-sibling::td")?.textContent || "Unknown").trim(),
        teamName: (getXPathNode("//tr/th[text()='Team Name:']/following-sibling::td/span/a")?.textContent || 
                   getXPathNode("//td[text()='Team Name:']/following-sibling::td/a")?.textContent || "").trim(),
        league: (getXPathNode("//tr/th[text()='League:']/following-sibling::td/span/a")?.textContent || "").trim(),
        position: (getXPathNode("//tr/th[text()='Position:']/following-sibling::td/span")?.textContent || 
                  getXPathNode("//td[text()='Position:']/following-sibling::td")?.textContent || "").trim(),
        nationality: (getXPathNode("//tr/th[text()='Nationality:']/following-sibling::td/span/a")?.textContent || 
                     getXPathNode("//tr/th[text()='Nationality:']/following-sibling::td/span")?.textContent || "").trim(),
        playingStyle: (getXPathNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td/span/a")?.textContent || 
                        getXPathNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td/span")?.textContent || 
                        getXPathNode("//tr[th[contains(normalize-space(.),'Playing Style')]]/td")?.textContent || "").trim(),
        foot: (getXPathNode("//tr/th[text()='Foot:']/following-sibling::td/span")?.textContent || "").trim(),
        height: parseInt(getXPathNode("//tr/th[text()='Height (cm):']/following-sibling::td/span")?.textContent || 
                        getXPathNode("//tr/th[text()='Height:']/following-sibling::td/span")?.textContent || "0"),
        weight: parseInt(getXPathNode("//tr/th[text()='Weight (kg):']/following-sibling::td/span")?.textContent || 
                        getXPathNode("//tr/th[text()='Weight:']/following-sibling::td/span")?.textContent || "0"),
        age: parseInt(getXPathNode("//tr/th[text()='Age:']/following-sibling::td/span")?.textContent || 
                     getXPathNode("//tr/th[text()='Age:']/following-sibling::td")?.textContent || "0"),
      };

      if (!spanOvr && !data.playerName) {
        enqueueSnackbar("Could not parse player data. Check HTML source.", { variant: "error" });
        return;
      }

      setScrapedData(data);
      enqueueSnackbar("HTML Parsed! Please review and save.", { variant: "info" });
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Parsing failed", { variant: "error" });
    }
  };

  const handleManualSave = async () => {
    try {
      setScraping(true);
      await adminService.addPlayerManual(scrapedData);
      enqueueSnackbar("Player saved successfully!", { variant: "success" });
      setScrapedData(null);
      setPastedHtml("");
      setPlayerId("");
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save player", { variant: "error" });
    } finally {
      setScraping(false);
    }
  };

  const handleHofChange = (e) => {
    const { name, value } = e.target;
    setHofData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "tournamentTitle") {
        newData.displayColor = value === "eTPL League" ? "#fbbf24" : "#A86929";
      }
      return newData;
    });
  };

  const handleAddHof = async () => {
    if (!hofData.season || !hofData.tournamentTitle || !hofData.winnerName) {
      enqueueSnackbar("Please fill in required HOF fields", { variant: "warning" });
      return;
    }
    try {
      setAddingHof(true);
      const payload = {
        ...hofData,
        season: `Season ${hofData.season}`,
        winnerTeam: winnerTeam
      };
      await adminService.addHof(payload);
      enqueueSnackbar("Hall of Fame entry added!", { variant: "success" });
      setHofData(prev => ({ ...prev, winnerName: "" }));
      setWinnerTeam("");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.title || err.message || "Failed to add HOF";
      enqueueSnackbar(errorMsg, { variant: "error" });
    } finally {
      setAddingHof(false);
    }
  };

  const handlePrizeChange = (index, field, value) => {
    const newGroups = [...prizeGroups];
    newGroups[index][field] = value;
    setPrizeGroups(newGroups);
  };

  const handleSavePrizes = async () => {
    const prizes = prizeGroups.map(pg => ({
      rankLabel: pg.rank,
      amount: Number(pg.amount)
    }));
    setPendingPrizes(prizes);
    setModalMode("prizes");
    setApproveModalOpen(true);
  };

  // --- Render ---
  return (
    <Box sx={{ width: '100%', px: { xs: 0, sm: 0 } }}>
      <GlobalStyles styles={{
        '@keyframes pulse': {
          '0%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(1.2)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        }
      }} />
      
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, px: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Storage color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Data Management</Typography>
            <Typography variant="body2" color="text.secondary">ADMINISTRATIVE CONTROL CENTER</Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={4} sx={{ width: '100%' }}>
        {/* Top Sections: Add Player & HOF */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, width: '100%' }}>
          {/* Scrape Player Section */}
          <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%", display: 'flex', flexDirection: 'column' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <CloudDownload color="primary" sx={{ fontSize: 28 }} />
                  <Typography variant="h6" fontWeight="bold">Add New Player</Typography>
                </Box>
                <Box sx={{ display: "flex", bgcolor: "action.hover", p: 0.5, borderRadius: 2 }}>
                  <Button size="small" variant={importMode === "auto" ? "contained" : "text"} onClick={() => setImportMode("auto")} disableElevation sx={{ borderRadius: 1.5, textTransform: 'none', px: 2 }}>Auto</Button>
                  <Button size="small" variant={importMode === "manual" ? "contained" : "text"} onClick={() => setImportMode("manual")} disableElevation sx={{ borderRadius: 1.5, textTransform: 'none', px: 2 }}>Manual</Button>
                </Box>
              </Box>

              <Divider />

              <Stack spacing={2} flexGrow={1}>
                <TextField fullWidth label={importMode === "auto" ? "PesDB Player ID" : "Paste HTML Source"} placeholder={importMode === "auto" ? "e.g. 123456" : "Paste player source code here..."} variant="outlined" size="small" multiline={importMode === "manual"} rows={importMode === "manual" ? 4 : 1} value={importMode === "auto" ? playerId : pastedHtml} onChange={(e) => importMode === "auto" ? setPlayerId(e.target.value) : setPastedHtml(e.target.value)} onKeyPress={(e) => e.key === "Enter" && importMode === "auto" && handleScrape()} disabled={scraping} />
                <Button variant="contained" disableElevation fullWidth startIcon={scraping ? null : <Search />} onClick={importMode === "auto" ? handleScrape : handleManualParse} disabled={scraping || (importMode === "auto" ? !playerId : !pastedHtml)} sx={{ borderRadius: '12px', fontWeight: 700, py: 1.5, textTransform: 'none', bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' }, boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)" }}>{scraping ? <CircularProgress size={24} /> : "Process Player"}</Button>
              </Stack>

              {scrapedData && (
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: importMode === "manual" ? "rgba(76, 175, 80, 0.04)" : "rgba(25, 118, 210, 0.04)", mt: 1, border: '1px solid', borderColor: importMode === "manual" ? 'success.light' : 'primary.light' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                      <Box sx={{ position: 'relative' }}>
                        <Box component="img" src={`https://pesdb.net/assets/img/card/b${scrapedData.idPlayer}.png`} sx={{ width: 85, height: 'auto', borderRadius: 2, boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: '2px solid #fff' }} />
                        <Box sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'white', borderRadius: '50%' }}><CheckCircle color="success" sx={{ fontSize: 24 }} /></Box>
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1.5 }}>
                          <Typography variant="h5" fontWeight="900" sx={{ color: '#0f172a' }}>{scrapedData.playerName}</Typography>
                          <Box sx={{ px: 1.5, py: 0.25, borderRadius: 1, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>OVR</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 900 }}>{scrapedData.playerOvr}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 4, mb: 1, flexWrap: 'wrap' }}>
                          {[{ label: 'POS', value: scrapedData.position }, { label: 'AGE', value: scrapedData.age }, { label: 'FOOT', value: scrapedData.foot }].map((s, i) => (
                            <Box key={i}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>{s.label}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.value || "-"}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                    {importMode === "manual" && <Button fullWidth variant="contained" color="success" sx={{ mt: 2, borderRadius: 2 }} onClick={handleManualSave}>SAVE PLAYER TO DATABASE</Button>}
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Paper>
          
          {/* Hall of Fame Section */}
          <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <EmojiEvents color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">Hall of Fame Entry</Typography>
              </Box>
              <Divider />
              <Stack spacing={3} flexGrow={1}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '0.8fr 1.5fr 2.5fr' }, gap: 2 }}>
                  <TextField fullWidth label="Season" name="season" size="small" type="number" value={hofData.season} onChange={handleHofChange} />
                  <TextField fullWidth label="Tournament" name="tournamentTitle" size="small" value={hofData.tournamentTitle} onChange={handleHofChange} select SelectProps={{ native: true }}>
                    <option value="eTPL League">eTPL League</option>
                    <option value="eTPL Cup">eTPL Cup</option>
                  </TextField>
                  <Autocomplete fullWidth options={users} getOptionLabel={(option) => option ? `${option.userId} (${option.lineName || ""})` : ""} value={(users || []).find(u => u.userId === hofData.winnerName) || null} onChange={(e, v) => setHofData(prev => ({ ...prev, winnerName: v ? v.userId : "" }))} renderInput={(params) => <TextField {...params} size="small" label="Winner" />} />
                </Box>
                {winnerTeam && <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)' }}><Typography variant="body2" fontWeight="bold" color="warning.dark">Team: {winnerTeam}</Typography></Box>}
                <Box sx={{ mt: 'auto' }}><Button variant="contained" fullWidth onClick={handleAddHof} disabled={addingHof || !hofData.season || !hofData.winnerName} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700, bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' } }}>{addingHof ? "Adding..." : "Add to Hall of Fame"}</Button></Box>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        {/* Prize Money Settings Section */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <MilitaryTech color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">Tournament Prize Settings</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton size="small" onClick={() => setShowPrizeSettings(!showPrizeSettings)} sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                {showPrizeSettings ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
              <Button variant="contained" startIcon={<Save />} onClick={handleSavePrizes} disabled={savingPrizes} sx={{ borderRadius: 2, textTransform: 'none', px: 4 }}>Save All Prizes</Button>
            </Box>
          </Box>
          <Divider sx={{ mb: showPrizeSettings ? 4 : 0 }} />
          
          <Collapse in={showPrizeSettings}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, width: '100%' }}>
              {(prizeGroups || []).map((group, index) => (
                <Box key={index} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)", "&:hover": { borderColor: "primary.light" } }}>
                  <TextField fullWidth size="small" placeholder="Rank" value={group.rank} onChange={(e) => handlePrizeChange(index, 'rank', e.target.value)} sx={{ mb: 1.5, "& fieldset": { border: "none" }, bgcolor: "rgba(0,0,0,0.03)", borderRadius: 1 }} />
                  <TextField fullWidth size="small" placeholder="Amount (TP)" value={group.amount} onChange={(e) => handlePrizeChange(index, 'amount', e.target.value)} InputProps={{ endAdornment: <Typography variant="caption" fontWeight="bold" color="primary">TP</Typography>, sx: { bgcolor: "white" } }} />
                </Box>
              ))}
            </Box>
          </Collapse>
        </Paper>

        {/* Special Bonus Management Section */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Payments color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">Special Bonus Management</Typography>
            </Box>
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setBonusModalOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', px: 4 }}>Add Special Bonus</Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Amount (TP)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(bonuses || []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No bonus records found</TableCell></TableRow>
                ) : bonuses.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell><Box display="flex" alignItems="center" gap={1}><Avatar src={b.user?.linePic} sx={{ width: 24, height: 24 }} /><Typography variant="body2" fontWeight="bold">{b.user?.userId || b.userId}</Typography></Box></TableCell>
                    <TableCell><Typography variant="body2" fontWeight="bold">+{Number(b.amount || 0).toLocaleString()}</Typography></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{b.reason}</TableCell>
                    <TableCell><Chip label={b.status} size="small" color={b.status === "Approved" ? "success" : "warning"} sx={{ fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="right">
                      {b.status === "Pending" && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" color="success" onClick={() => { setSelectedBonusId(b.id); setModalMode("bonus"); setApproveModalOpen(true); }}><ThumbUp fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRejectBonus(b.id)}><ThumbDown fontSize="small" /></IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      {/* Modals */}
      <Dialog open={bonusModalOpen} onClose={() => setBonusModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>Request Special Bonus</DialogTitle>
        <DialogContent sx={{ pt: 3 }}><Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small"><InputLabel>Target User</InputLabel><Select value={bonusRequest.userId} label="Target User" onChange={(e) => setBonusRequest(p => ({ ...p, userId: e.target.value }))}>{(users || []).map((u, i) => <MenuItem key={u.id || i} value={u.id}>{u.userId} ({u.lineName || ""})</MenuItem>)}</Select></FormControl>
          <TextField fullWidth label="Bonus Amount (TP)" type="number" size="small" value={bonusRequest.amount} onChange={(e) => setBonusRequest(p => ({ ...p, amount: e.target.value }))} />
          <TextField fullWidth label="Reason / Note" multiline rows={3} size="small" value={bonusRequest.reason} onChange={(e) => setBonusRequest(p => ({ ...p, reason: e.target.value }))} />
        </Stack></DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}><Button onClick={() => setBonusModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleBonusRequest}>Submit Request</Button></DialogActions>
      </Dialog>

      <Dialog open={approveModalOpen} onClose={() => setApproveModalOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold', color: 'warning.main' }}>Super Admin Authorization</DialogTitle>
        <DialogContent><Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Enter Super Admin password to {modalMode === "bonus" ? "approve this bonus" : "save prize settings"}:</Typography><TextField fullWidth type="password" size="small" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleApproveBonus()} /></DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#fff9f0' }}><Button onClick={() => setApproveModalOpen(false)}>Cancel</Button><Button variant="contained" color="warning" onClick={handleApproveBonus}>{modalMode === "bonus" ? "Approve & Pay" : "Authorize & Save"}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDataPage;
