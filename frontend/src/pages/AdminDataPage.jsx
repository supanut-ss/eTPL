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
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";

const AdminDataPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [playerId, setPlayerId] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);

  const [users, setUsers] = useState([]);
  const [hofData, setHofData] = useState({
    platform: "PC",
    season: "",
    tournamentTitle: "",
    tournamentSubtitle: "",
    winnerName: "",
    winnerTeam: "",
    runnerUpName: "",
    displayColor: "#fbbf24",
  });
  const [addingHof, setAddingHof] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
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
      enqueueSnackbar("Player added successfully!", { variant: "success" });
      setPlayerId("");
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Scraping failed", { variant: "error" });
    } finally {
      setScraping(false);
    }
  };

  const handleHofChange = (e) => {
    const { name, value } = e.target;
    setHofData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddHof = async () => {
    if (!hofData.season || !hofData.tournamentTitle || !hofData.winnerName) {
      enqueueSnackbar("Please fill in required HOF fields", { variant: "warning" });
      return;
    }
    try {
      setAddingHof(true);
      await adminService.addHof(hofData);
      enqueueSnackbar("Hall of Fame entry added!", { variant: "success" });
      // Reset form partially
      setHofData(prev => ({
        ...prev,
        winnerName: "",
        winnerTeam: "",
        runnerUpName: "",
      }));
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to add HOF", { variant: "error" });
    } finally {
      setAddingHof(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ 
          background: "linear-gradient(90deg, #1976d2, #82b1ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 1
        }}>
          Data Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          ADMINISTRATIVE CONTROL CENTER
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Scrape Player Section */}
        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ 
            p: 4, 
            borderRadius: 4, 
            border: "1px solid",
            borderColor: "divider",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            height: "100%"
          }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <CloudDownload />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">Add New Player</Typography>
                  <Typography variant="caption" color="text.secondary">SYNC FROM PESDB.NET</Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  label="PesDB Player ID"
                  placeholder="e.g. 123456"
                  variant="outlined"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleScrape()}
                  disabled={scraping}
                />
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleScrape}
                  disabled={scraping}
                  sx={{ borderRadius: 2, px: 3, fontWeight: "bold" }}
                >
                  {scraping ? <CircularProgress size={24} /> : "SCRAPE"}
                </Button>
              </Box>

              {scrapedData && (
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: "rgba(25, 118, 210, 0.04)" }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar 
                        src={`https://pesdb.net/assets/img/card/b${scrapedData.idPlayer}.png`}
                        sx={{ width: 64, height: 64, border: "2px solid #fff", boxShadow: 1 }}
                      />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">{scrapedData.playerName}</Typography>
                        <Typography variant="body2" color="text.secondary">OVR: {scrapedData.playerOvr}</Typography>
                      </Box>
                      <Box sx={{ ml: "auto" }}>
                        <CheckCircle color="success" />
                      </Box>
                    </Box>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" display="block">Team</Typography>
                        <Typography variant="body2" fontWeight="medium">{scrapedData.teamName || "-"}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" display="block">Position</Typography>
                        <Typography variant="body2" fontWeight="medium">{scrapedData.position || "-"}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
              
              <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  * Entering a valid ID will fetch player name, rating, position, and physical stats from PesDB and store them in the central database.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Hall of Fame Section */}
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ 
            p: 4, 
            borderRadius: 4, 
            border: "1px solid",
            borderColor: "divider",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)"
          }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ bgcolor: "warning.main" }}>
                  <EmojiEvents />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">Hall of Fame Entry</Typography>
                  <Typography variant="caption" color="text.secondary">AWARD ACHIEVEMENTS</Typography>
                </Box>
              </Box>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Platform"
                    name="platform"
                    value={hofData.platform}
                    onChange={handleHofChange}
                    select
                    SelectProps={{ native: true }}
                  >
                    <option value="PC">PC</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Console">Console</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Season"
                    name="season"
                    placeholder="Season 1"
                    value={hofData.season}
                    onChange={handleHofChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Theme Color"
                    name="displayColor"
                    type="color"
                    value={hofData.displayColor}
                    onChange={handleHofChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tournament Title"
                    name="tournamentTitle"
                    placeholder="League Champions"
                    value={hofData.tournamentTitle}
                    onChange={handleHofChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Tournament Subtitle"
                    name="tournamentSubtitle"
                    placeholder="D1 Division"
                    value={hofData.tournamentSubtitle}
                    onChange={handleHofChange}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Winner Information</Typography>
                  <Autocomplete
                    fullWidth
                    options={users}
                    getOptionLabel={(option) => `${option.userId} (${option.lineName || "No Name"})`}
                    onChange={(event, newValue) => {
                      setHofData(prev => ({ ...prev, winnerName: newValue ? newValue.userId : "" }));
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Winner (UserId)" placeholder="Type to search user..." />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                        <Avatar src={option.linePic} sx={{ width: 24, height: 24, mr: 1 }} />
                        {option.userId} ({option.lineName})
                      </Box>
                    )}
                  />
                  <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: "block" }}>
                    * Winner's profile picture will be automatically pulled from their LINE account.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Winner Team"
                    name="winnerTeam"
                    value={hofData.winnerTeam}
                    onChange={handleHofChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Runner Up"
                    name="runnerUpName"
                    value={hofData.runnerUpName}
                    onChange={handleHofChange}
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                fullWidth
                size="large"
                disableElevation
                startIcon={<AutoAwesome />}
                onClick={handleAddHof}
                disabled={addingHof}
                sx={{ 
                  borderRadius: 3, 
                  py: 1.5, 
                  fontWeight: "bold",
                  background: "linear-gradient(45deg, #1a237e 30%, #283593 90%)",
                  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
                }}
              >
                {addingHof ? "CREATING..." : "ADD TO HALL OF FAME"}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDataPage;
