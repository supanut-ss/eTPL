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
  Collapse,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  PersonAdd,
  EmojiEvents,
  CloudDownload,
  CheckCircle,
  Error as ErrorIcon,
  Search,
  AutoAwesome,
  Shield,
  Public,
  Code,
  Input,
  ManageHistory,
  Refresh,
  Storage,
  Payments,
  ThumbUp,
  ThumbDown,
  Lock,
  Close,
  ExpandMore,
  Visibility,
  VisibilityOff
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { getPlayerCardUrl } from "../utils/imageUtils";
import { InputAdornment } from "@mui/material";

const AdminDataPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [showPassword, setShowPassword] = useState(false);
  const [submittingBonus, setSubmittingBonus] = useState(false);

  // AI Image Generation State
  const [aiUser, setAiUser] = useState(null);
  const [aiType, setAiType] = useState("LeagueChampion");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [additionalImages, setAdditionalImages] = useState([]); // Array of strings (URLs)
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [showAiSection, setShowAiSection] = useState(false);
  const [aiProvider, setAiProvider] = useState("Leonardo");

  // Bot Q&A State
  const [qaList, setQaList] = useState([]);
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [newQa, setNewQa] = useState({ question: "", answer: "" });
  const [addingQa, setAddingQa] = useState(false);

  // Notification Template State
  const [templates, setTemplates] = useState([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({
    category: "AUCTION_CONFIRM",
    templateText: "",
    targetPlatform: "DISCORD",
    isActive: true
  });
  const [savingTemplate, setSavingTemplate] = useState(false);


  // --- Effects ---
  useEffect(() => {
    fetchUsers();
    fetchBonuses();
    fetchQa();
    fetchTemplates();
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
      // Robust unpacking: handle [item1, ...] or { data: [...] }
      const resData = res.data;
      if (Array.isArray(resData)) {
        setUsers(resData);
      } else if (resData && Array.isArray(resData.data)) {
        setUsers(resData.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    }
  };

  const fetchBonuses = async () => {
    try {
      const res = await adminService.getBonuses();
      const resData = res.data;
      if (Array.isArray(resData)) {
        setBonuses(resData);
      } else if (resData && Array.isArray(resData.data)) {
        setBonuses(resData.data);
      } else {
        setBonuses([]);
      }
    } catch (err) {
      console.error("Failed to fetch bonuses", err);
      setBonuses([]);
    }
  };

  const fetchQa = async () => {
    try {
      const res = await adminService.getQa();
      const resData = res.data;
      if (Array.isArray(resData)) {
        setQaList(resData);
      } else if (resData && Array.isArray(resData.data)) {
        setQaList(resData.data);
      } else {
        setQaList([]);
      }
    } catch (err) {
      console.error("Failed to fetch Q&A", err);
      setQaList([]);
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

  const handleAddQa = async () => {
    if (!newQa.question || !newQa.answer) {
      enqueueSnackbar("Please fill both question and answer", { variant: "warning" });
      return;
    }
    try {
      setAddingQa(true);
      await adminService.addQa(newQa);
      enqueueSnackbar("Auto-response added!", { variant: "success" });
      setNewQa({ question: "", answer: "" });
      setQaModalOpen(false);
      fetchQa();
    } catch (err) {
      enqueueSnackbar("Failed to add auto-response", { variant: "error" });
    } finally {
      setAddingQa(false);
    }
  };

  const handleDeleteQa = async (id) => {
    if (!window.confirm("Delete this auto-response?")) return;
    try {
      await adminService.deleteQa(id);
      enqueueSnackbar("Deleted successfully", { variant: "info" });
      fetchQa();
    } catch (err) {
      enqueueSnackbar("Failed to delete", { variant: "error" });
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await adminService.getNotificationTemplates();
      setTemplates(res.data || []);
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateData.templateText) {
      enqueueSnackbar("Please enter template text", { variant: "warning" });
      return;
    }
    try {
      setSavingTemplate(true);
      if (editingTemplate) {
        await adminService.updateNotificationTemplate(editingTemplate.id, templateData);
        enqueueSnackbar("Template updated!", { variant: "success" });
      } else {
        await adminService.addNotificationTemplate(templateData);
        enqueueSnackbar("Template added!", { variant: "success" });
      }
      setTemplateModalOpen(false);
      setEditingTemplate(null);
      setTemplateData({ category: "AUCTION_CONFIRM", templateText: "", targetPlatform: "DISCORD", isActive: true });
      fetchTemplates();
    } catch (err) {
      enqueueSnackbar("Failed to save template", { variant: "error" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await adminService.deleteNotificationTemplate(id);
      enqueueSnackbar("Template deleted", { variant: "info" });
      fetchTemplates();
    } catch (err) {
      enqueueSnackbar("Failed to delete template", { variant: "error" });
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateData({
      category: template.category,
      templateText: template.templateText,
      targetPlatform: template.targetPlatform,
      isActive: template.isActive
    });
    setTemplateModalOpen(true);
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

  const handleGenerateAiPrompt = async () => {
    if (!aiUser) {
      enqueueSnackbar("Please select a user first", { variant: "warning" });
      return;
    }
    try {
      setGeneratingPrompt(true);
      setAiPrompt("");
      setAiImageUrl("");
      const res = await adminService.generateAiPrompt({
        name: aiUser.userId,
        team: aiUser.currentTeam || "No Team",
        type: aiType
      });
      setAiPrompt(res.data.prompt);
      enqueueSnackbar("Prompt generated! You can now review and generate the image.", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Failed to generate prompt", { variant: "error" });
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleGenerateAiImage = async () => {
    if (!aiPrompt) {
      enqueueSnackbar("Prompt is required", { variant: "warning" });
      return;
    }
    try {
      setGeneratingImage(true);
      
      const allImageUrls = [];
      if (aiUser?.linePic) allImageUrls.push(aiUser.linePic);
      additionalImages.forEach(url => {
        if (url.trim()) allImageUrls.push(url.trim());
      });

      if (allImageUrls.length === 0) {
        enqueueSnackbar("At least one image reference is required", { variant: "warning" });
        setGeneratingImage(false);
        return;
      }

      const res = await adminService.generateAiImage({
        prompt: aiPrompt,
        imageUrls: allImageUrls,
        provider: aiProvider
      });
      setAiImageUrl(res.data.imageUrl);
      enqueueSnackbar("Image generated successfully!", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Failed to generate image", { variant: "error" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const addAdditionalImage = () => {
    if (tempImageUrl.trim()) {
      setAdditionalImages([...additionalImages, tempImageUrl.trim()]);
      setTempImageUrl("");
    }
  };

  const removeAdditionalImage = (index) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };


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
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: 4, 
        px: { xs: 1, sm: 0 } 
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Storage color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Data Management</Typography>
            <Typography variant="body2" color="text.secondary">ADMINISTRATIVE CONTROL CENTER</Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={4} sx={{ width: '100%' }}>
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
                <TextField 
                  fullWidth 
                  label={importMode === "auto" ? "PesDB Player ID" : "Paste HTML Source"} 
                  placeholder={importMode === "auto" ? "e.g. 123456" : "Paste player source code here..."} 
                  variant="outlined" 
                  size="small" 
                  multiline={importMode === "manual"} 
                  rows={importMode === "manual" ? 4 : 1} 
                  value={importMode === "auto" ? playerId : pastedHtml} 
                  onChange={(e) => importMode === "auto" ? setPlayerId(e.target.value) : setPastedHtml(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && importMode === "auto" && handleScrape()} 
                  disabled={scraping} 
                />
                <Button 
                  variant="contained" 
                  disableElevation 
                  fullWidth 
                  startIcon={scraping ? null : <Search />} 
                  onClick={importMode === "auto" ? handleScrape : handleManualParse} 
                  disabled={scraping || (importMode === "auto" ? !playerId : !pastedHtml)} 
                  sx={{ 
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    py: 1.5, 
                    textTransform: 'none', 
                    bgcolor: '#0f172a', 
                    "&:hover": { bgcolor: '#1e293b' }, 
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)" 
                  }}
                >
                  {scraping ? <CircularProgress size={24} /> : "Process Player"}
                </Button>
              </Stack>
              {scrapedData && (
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: importMode === "manual" ? "rgba(76, 175, 80, 0.04)" : "rgba(25, 118, 210, 0.04)", mt: 1, border: '1px solid', borderColor: importMode === "manual" ? 'success.light' : 'primary.light' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                      <Box sx={{ position: 'relative' }}>
                        <Box component="img" src={getPlayerCardUrl(scrapedData.idPlayer)} sx={{ width: 85, height: 'auto', borderRadius: 2, boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: '2px solid #fff' }} />
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
              <Box display="flex" alignItems="center" gap={1.5} mb={{ xs: 2, sm: 1 }}>
                <EmojiEvents color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">Hall of Fame Entry</Typography>
              </Box>
              <Divider />
              <Stack spacing={3} flexGrow={1}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '0.8fr 1.5fr 2.5fr' }, gap: 2 }}>
                  <TextField fullWidth label="Season" name="season" size="small" type="number" value={hofData.season} onChange={handleHofChange} />
                  <TextField fullWidth label="Tournament" name="tournamentTitle" size="small" value={hofData.tournamentTitle} onChange={handleHofChange} select SelectProps={{ native: true }}>
                    <option value="eTPL League">eTPL LEAGUE</option>
                    <option value="eTPL Cup">eTPL CUP</option>
                  </TextField>
                  <Autocomplete fullWidth options={users} getOptionLabel={(option) => option ? `${option.userId} (${option.lineName || ""})` : ""} value={(users || []).find(u => u.userId === hofData.winnerName) || null} onChange={(e, v) => setHofData(prev => ({ ...prev, winnerName: v ? v.userId : "" }))} renderInput={(params) => <TextField {...params} size="small" label="Winner" />} />
                </Box>
                {winnerTeam && <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)' }}><Typography variant="body2" fontWeight="bold" color="warning.dark">Team: {winnerTeam}</Typography></Box>}
                <Box sx={{ mt: 'auto' }}><Button variant="contained" fullWidth onClick={handleAddHof} disabled={addingHof || !hofData.season || !hofData.winnerName} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700, bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' } }}>{addingHof ? "Adding..." : "Add to Hall of Fame"}</Button></Box>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        {/* Special Bonus Management Section */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 2, sm: 0 }} mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Payments color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">Special Bonus Management</Typography>
            </Box>
            <Button fullWidth={isMobile} variant="contained" startIcon={<PersonAdd />} onClick={() => setBonusModalOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', px: 4 }}>Add Special Bonus</Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', overflowX: 'auto' }}>
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
                {(!bonuses || bonuses.length === 0) ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No bonus records found</TableCell></TableRow>
                ) : bonuses.map((b) => (
                  <TableRow key={b?.id || Math.random()} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar src={b?.user?.linePic} sx={{ width: 24, height: 24 }} />
                        <Typography variant="body2" fontWeight="bold">
                          {b?.user?.userId || b?.userId || "Unknown"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        +{Number(b?.amount || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{b?.reason || "-"}</TableCell>
                    <TableCell>
                      <Chip 
                        label={b?.status || "Pending"} 
                        size="small" 
                        color={b?.status === "Approved" ? "success" : "warning"} 
                        sx={{ fontWeight: 'bold' }} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      {b?.status === "Pending" && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" color="success" onClick={() => { setSelectedBonusId(b.id); setModalMode("bonus"); setApproveModalOpen(true); }}>
                            <ThumbUp fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRejectBonus(b.id)}>
                            <ThumbDown fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Bot Auto-Response Management Section */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 2, sm: 0 }} mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <AutoAwesome color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Bot Auto-Response (Q&A)</Typography>
                <Typography variant="caption" color="text.secondary">MANAGE BOT REPLIES BASED ON KEYWORDS</Typography>
              </Box>
            </Box>
            <Button fullWidth={isMobile} variant="contained" startIcon={<PersonAdd />} onClick={() => setQaModalOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', px: 4, bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' } }}>Add New Q&A</Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: '300px', overflowY: 'auto', overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Question Keyword</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Bot Answer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '80px' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!qaList || qaList.length === 0) ? (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}>No auto-responses configured</TableCell></TableRow>
                ) : qaList.map((qa) => (
                  <TableRow key={qa?.id || Math.random()} hover>
                    <TableCell><Typography variant="body2" fontWeight="bold" color="primary">{qa?.question || "No Keyword"}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{qa?.answer || "No Answer"}</Typography></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleDeleteQa(qa?.id)}>
                        <Close fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Notification Templates Section */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3, border: "1px solid", borderColor: "divider", width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 2, sm: 0 }} mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Public color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Notification Headlines</Typography>
                <Typography variant="caption" color="text.secondary">MANAGE RANDOMIZED HEADLINES FOR DISCORD & LIVE FEED</Typography>
              </Box>
            </Box>
            <Button fullWidth={isMobile} variant="contained" startIcon={<PersonAdd />} onClick={() => { setEditingTemplate(null); setTemplateData({ category: "AUCTION_CONFIRM", templateText: "", targetPlatform: "DISCORD", isActive: true }); setTemplateModalOpen(true); }} sx={{ borderRadius: 2, textTransform: 'none', px: 4, bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' } }}>Add New Template</Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Template Text</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '80px' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!templates || templates.length === 0) ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>No templates configured</TableCell></TableRow>
                ) : templates.map((t) => (
                  <TableRow key={t?.id || Math.random()} hover>
                    <TableCell>
                      <Chip label={t.category} size="small" variant="outlined" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={t.targetPlatform} size="small" color={t.targetPlatform === 'DISCORD' ? 'primary' : 'secondary'} sx={{ fontWeight: 'bold', fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{t.templateText}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" color="primary" onClick={() => handleEditTemplate(t)}>
                          <ManageHistory fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(t.id)}>
                          <Close fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={bonusModalOpen} onClose={() => setBonusModalOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>Request Special Bonus</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Target User</InputLabel>
              <Select 
                value={bonusRequest.userId} 
                label="Target User" 
                onChange={(e) => setBonusRequest(p => ({ ...p, userId: e.target.value }))}
              >
                {(users || []).map((u, i) => (
                  <MenuItem key={u?.id || i} value={u?.id}>
                    {u?.userId || "Unknown"} ({u?.lineName || ""})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="Bonus Amount (TP)" type="number" size="small" value={bonusRequest.amount} onChange={(e) => setBonusRequest(p => ({ ...p, amount: e.target.value }))} />
            <TextField fullWidth label="Reason / Note" multiline rows={3} size="small" value={bonusRequest.reason} onChange={(e) => setBonusRequest(p => ({ ...p, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}><Button onClick={() => setBonusModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleBonusRequest}>Submit Request</Button></DialogActions>
      </Dialog>

      <Dialog open={approveModalOpen} onClose={() => setApproveModalOpen(false)} fullWidth maxWidth="xs" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'warning.main' }}>Super Admin Authorization</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>Enter Super Admin password to approve this bonus:</Typography>
          <TextField 
            fullWidth 
            type={showPassword ? "text" : "password"} 
            size="small" 
            value={adminPassword} 
            onChange={(e) => setAdminPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleApproveBonus()} 
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                    {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#fff9f0' }}><Button onClick={() => setApproveModalOpen(false)}>Cancel</Button><Button variant="contained" color="warning" onClick={handleApproveBonus}>Approve & Pay</Button></DialogActions>
      </Dialog>

      <Dialog open={qaModalOpen} onClose={() => setQaModalOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>Add Bot Auto-Response</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField fullWidth label="Question Keyword (e.g. !ready)" size="small" value={newQa.question} onChange={(e) => setNewQa(p => ({ ...p, question: e.target.value }))} helperText="The bot will respond if the user message contains this keyword." />
            <TextField fullWidth label="Bot Answer" multiline rows={4} size="small" value={newQa.answer} onChange={(e) => setNewQa(p => ({ ...p, answer: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setQaModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddQa} disabled={addingQa} sx={{ bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' } }}>{addingQa ? "Adding..." : "Save Response"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
          {editingTemplate ? "Edit Template" : "Add New Template"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select value={templateData.category} label="Category" onChange={(e) => setTemplateData(p => ({ ...p, category: e.target.value }))}>
                  <MenuItem value="AUCTION_CONFIRM">AUCTION_CONFIRM</MenuItem>
                  <MenuItem value="TRANSFER">TRANSFER</MenuItem>
                  <MenuItem value="LOAN">LOAN</MenuItem>
                  <MenuItem value="MARKET_LISTED">MARKET_LISTED</MenuItem>
                  <MenuItem value="MATCH_DRAW">MATCH_DRAW</MenuItem>
                  <MenuItem value="MATCH_WIN_CLOSE">MATCH_WIN_CLOSE</MenuItem>
                  <MenuItem value="MATCH_WIN_CRUSHING">MATCH_WIN_CRUSHING</MenuItem>
                  <MenuItem value="MARKET_ACTIVITY">MARKET_ACTIVITY</MenuItem>
                  <MenuItem value="DEAL_ACTIVITY">DEAL_ACTIVITY</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Platform</InputLabel>
                <Select value={templateData.targetPlatform} label="Platform" onChange={(e) => setTemplateData(p => ({ ...p, targetPlatform: e.target.value }))}>
                  <MenuItem value="DISCORD">DISCORD</MenuItem>
                  <MenuItem value="LIVE_FEED">LIVE_FEED</MenuItem>
                  <MenuItem value="BOTH">BOTH</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField fullWidth label="Template Text" multiline rows={4} size="small" value={templateData.templateText} onChange={(e) => setTemplateData(p => ({ ...p, templateText: e.target.value }))} placeholder="e.g. {team} ปิดดีลคว้า {player} ร่วมทัพ!" />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>AVAILABLE PLACEHOLDERS:</Typography>
              <Typography variant="caption" display="block" color="text.disabled">
                • {`{player}, {team}, {price}, {from}, {to}`} (for Transfer/Auction)<br />
                • {`{home}, {away}, {hScore}, {aScore}, {winner}, {loser}, {wScore}, {lScore}`} (for Match Results)<br />
                • {`{manager}, {player}`} (for Market Activity)
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate} disabled={savingTemplate} sx={{ bgcolor: '#0f172a', "&:hover": { bgcolor: '#1e293b' } }}>
            {savingTemplate ? "Saving..." : "Save Template"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDataPage;
