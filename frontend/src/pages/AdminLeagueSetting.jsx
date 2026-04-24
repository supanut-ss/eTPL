import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  GlobalStyles,
  Stack
} from "@mui/material";
import {
  MilitaryTech,
  Save,
  KeyboardArrowDown,
  KeyboardArrowUp,
  EmojiEvents
} from "@mui/icons-material";
import adminService from "../services/adminService";
import { useSnackbar } from "notistack";

const AdminLeagueSetting = () => {
  const { enqueueSnackbar } = useSnackbar();

  // --- State Definitions ---
  const [prizeGroups, setPrizeGroups] = useState([
    { rank: "1st" },
    { rank: "2nd" },
    { rank: "3rd" },
    { rank: "4th" },
    { rank: "5th" },
    { rank: "6th" },
    { rank: "7-8th" },
    { rank: "9-12th" },
    { rank: "13-16th" },
    { rank: "17th +" },
    { rank: "Top Scorer" },
    { rank: "Best Defense" }
  ]);
  const [showPrizeSettings, setShowPrizeSettings] = useState(true);
  const [savingPrizes, setSavingPrizes] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchPrizes();
  }, []);

  // --- API Handlers ---
  const fetchPrizes = async () => {
    try {
      const res = await adminService.getPrizes();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const fetchedPrizes = res.data.map(p => ({
          rank: p.rankLabel || "",
          amount: (p.amount || 0).toString()
        }));

        // Check and add missing required categories if they don't exist in fetched data
        const requiredLabels = ["Top Scorer", "Best Defense"];
        const mergedPrizes = [...fetchedPrizes];
        
        requiredLabels.forEach(label => {
          if (!mergedPrizes.find(p => p.rank === label)) {
            mergedPrizes.push({ rank: label, amount: "" });
          }
        });

        setPrizeGroups(mergedPrizes);
      }
    } catch (err) {
      console.error("Failed to fetch prizes", err);
    }
  };

  const handlePrizeChange = (index, field, value) => {
    const newGroups = [...prizeGroups];
    newGroups[index][field] = value;
    setPrizeGroups(newGroups);
  };

  const handleSavePrizes = async () => {
    try {
      setSavingPrizes(true);
      const prizes = prizeGroups.map(pg => ({
        rankLabel: pg.rank,
        amount: Number(pg.amount)
      }));
      await adminService.savePrizes({ prizes, password: "" });
      enqueueSnackbar("Prizes saved successfully!", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed to save prizes", { variant: "error" });
    } finally {
      setSavingPrizes(false);
    }
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
        alignItems: 'center', 
        mb: 4, 
        px: { xs: 1, sm: 0 } 
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <EmojiEvents color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">League Settings</Typography>
            <Typography variant="body2" color="text.secondary">TOURNAMENT CONFIGURATION</Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={4} sx={{ width: '100%' }}>
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
              <Button 
                variant="contained" 
                startIcon={<Save />} 
                onClick={handleSavePrizes} 
                disabled={savingPrizes}
                sx={{ borderRadius: 2, textTransform: 'none', px: 4 }}
              >
                Save All Prizes
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: showPrizeSettings ? 4 : 0 }} />
          
          <Collapse in={showPrizeSettings}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, width: '100%' }}>
              {(prizeGroups || []).map((group, index) => (
                <Box key={index} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)", "&:hover": { borderColor: "primary.light" } }}>
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Rank" 
                    value={group.rank} 
                    onChange={(e) => handlePrizeChange(index, 'rank', e.target.value)} 
                    sx={{ mb: 1.5, "& fieldset": { border: "none" }, bgcolor: "rgba(0,0,0,0.03)", borderRadius: 1 }} 
                  />
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Amount (TP)" 
                    value={group.amount} 
                    onChange={(e) => handlePrizeChange(index, 'amount', e.target.value)} 
                    InputProps={{ 
                      endAdornment: <Typography variant="caption" fontWeight="bold" color="primary">TP</Typography>, 
                      sx: { bgcolor: "white" } 
                    }} 
                  />
                </Box>
              ))}
            </Box>
          </Collapse>
        </Paper>
      </Stack>
    </Box>
  );
};


export default AdminLeagueSetting;
