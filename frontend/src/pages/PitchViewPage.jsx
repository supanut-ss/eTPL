import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
  Card,
} from "@mui/material";
import {
  SportsSoccer,
  Download,
  RestartAlt,
  Save,
  Groups,
  PersonAdd,
  AccountCircle,
  AccountBalanceWallet,
  Star,
  EmojiEvents,
} from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { useSnackbar } from "notistack";
import { useAuth } from "../store/AuthContext";
import { getPlayerFaceUrlPesmaster, getPlayerCardUrl, getLogoUrl, getPlayerFaceUrl } from "../utils/imageUtils";
import { API_BASE_URL } from "../api/axiosInstance";
import html2canvas from "html2canvas";

const GRADE_STYLE_MAP = {
  S: {
    color: "#ffb300",
    gradient: "linear-gradient(135deg, #ffe082 0%, #ffb300 100%)",
    glow: "0 0 15px rgba(255, 179, 0, 0.6)",
  },
  A: {
    color: "#f4511e",
    gradient: "linear-gradient(135deg, #ffab91 0%, #f4511e 100%)",
    glow: "0 0 15px rgba(244, 81, 30, 0.6)",
  },
  B: {
    color: "#8e24aa",
    gradient: "linear-gradient(135deg, #ce93d8 0%, #8e24aa 100%)",
    glow: "0 0 15px rgba(142, 36, 170, 0.6)",
  },
  C: {
    color: "#1e88e5",
    gradient: "linear-gradient(135deg, #90caf9 0%, #1e88e5 100%)",
    glow: "0 0 15px rgba(30, 136, 229, 0.6)",
  },
  D: {
    color: "#43a047",
    gradient: "linear-gradient(135deg, #a5d6a7 0%, #43a047 100%)",
    glow: "0 0 15px rgba(67, 160, 71, 0.6)",
  },
  E: {
    color: "#757575",
    gradient: "linear-gradient(135deg, #eeeeee 0%, #9e9e9e 100%)",
    glow: "0 0 10px rgba(117, 117, 117, 0.4)",
  },
  DEFAULT: {
    color: "#9e9e9e",
    gradient: "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
    glow: "none",
  },
};
const getPlayerStyle = (player) => {
  if (!player) return { ...GRADE_STYLE_MAP.DEFAULT, grade: "" };
  const grade = player.grade || player.playerGrade || "E";
  const style = GRADE_STYLE_MAP[grade] || GRADE_STYLE_MAP.DEFAULT;
  return { ...style, grade };
};

const PitchPlayerAvatar = ({ playerId, style }) => {
  const [src, setSrc] = useState(getPlayerFaceUrlPesmaster(playerId, "webp"));
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);

  const handleError = () => {
    if (retry === 0) {
      setSrc(getPlayerFaceUrlPesmaster(playerId, "png"));
      setRetry(1);
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    if (playerId) {
      setSrc(getPlayerFaceUrlPesmaster(playerId, "webp"));
      setRetry(0);
      setError(false);
    }
  }, [playerId]);

  if (!playerId || error) {
    return <AccountCircle sx={{ fontSize: '120%', color: 'rgba(255,255,255,0.5)' }} />;
  }

  return (
    <Box
      component="img"
      src={src}
      onError={handleError}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      sx={{
        width: '100%',
        height: '100%',
        objectFit: retry === 3 ? 'contain' : 'cover', // Cover for faces, contain for full cards
        borderRadius: '50%',
        zIndex: 1,
        display: 'block'
      }}
    />
  );
};

const FORMATIONS = {
  "4-3-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "LCM", x: 25, y: 55 }, { pos: "CM", x: 50, y: 55 }, { pos: "RCM", x: 75, y: 55 },
    { pos: "LW", x: 20, y: 25 }, { pos: "ST", x: 50, y: 20 }, { pos: "RW", x: 80, y: 25 }
  ],
  "4-2-3-1": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 35, y: 62 }, { pos: "CDM", x: 65, y: 62 },
    { pos: "LAM", x: 25, y: 38 }, { pos: "CAM", x: 50, y: 38 }, { pos: "RAM", x: 75, y: 38 },
    { pos: "ST", x: 50, y: 18 }
  ],
  "4-4-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "LM", x: 15, y: 50 }, { pos: "LCM", x: 38, y: 50 }, { pos: "RCM", x: 62, y: 50 }, { pos: "RM", x: 85, y: 50 },
    { pos: "ST", x: 35, y: 22 }, { pos: "ST", x: 65, y: 22 }
  ],
  "4-1-4-1": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 50, y: 62 },
    { pos: "LM", x: 15, y: 40 }, { pos: "LCM", x: 35, y: 45 }, { pos: "RCM", x: 65, y: 45 }, { pos: "RM", x: 85, y: 40 },
    { pos: "ST", x: 50, y: 18 }
  ],
  "4-2-1-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 35, y: 60 }, { pos: "CDM", x: 65, y: 60 },
    { pos: "CAM", x: 50, y: 40 },
    { pos: "LW", x: 20, y: 22 }, { pos: "ST", x: 50, y: 15 }, { pos: "RW", x: 80, y: 22 }
  ],
  "4-1-2-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 50, y: 65 },
    { pos: "LCM", x: 30, y: 50 }, { pos: "RCM", x: 70, y: 50 },
    { pos: "LW", x: 20, y: 22 }, { pos: "ST", x: 50, y: 15 }, { pos: "RW", x: 80, y: 22 }
  ],
  "4-3-1-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "LCM", x: 25, y: 55 }, { pos: "CM", x: 50, y: 55 }, { pos: "RCM", x: 75, y: 55 },
    { pos: "CAM", x: 50, y: 38 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "4-2-2-2 (AMF)": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 35, y: 62 }, { pos: "CDM", x: 65, y: 62 },
    { pos: "LAM", x: 30, y: 40 }, { pos: "RAM", x: 70, y: 40 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "4-2-2-2 (Side)": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 35, y: 62 }, { pos: "CDM", x: 65, y: 62 },
    { pos: "LM", x: 15, y: 45 }, { pos: "RM", x: 85, y: 45 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "4-1-3-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "CDM", x: 50, y: 65 },
    { pos: "LM", x: 15, y: 40 }, { pos: "CAM", x: 50, y: 40 }, { pos: "RM", x: 85, y: 40 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "4-2-4": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "LCM", x: 38, y: 55 }, { pos: "RCM", x: 62, y: 55 },
    { pos: "LW", x: 15, y: 25 }, { pos: "ST", x: 38, y: 18 }, { pos: "ST", x: 62, y: 18 }, { pos: "RW", x: 85, y: 25 }
  ],
  "3-4-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "LM", x: 15, y: 50 }, { pos: "LCM", x: 38, y: 55 }, { pos: "RCM", x: 62, y: 55 }, { pos: "RM", x: 85, y: 50 },
    { pos: "LW", x: 22, y: 25 }, { pos: "ST", x: 50, y: 18 }, { pos: "RW", x: 78, y: 25 }
  ],
  "3-2-2-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 38, y: 62 }, { pos: "CDM", x: 62, y: 62 },
    { pos: "LAM", x: 35, y: 40 }, { pos: "RAM", x: 65, y: 40 },
    { pos: "LW", x: 20, y: 22 }, { pos: "ST", x: 50, y: 15 }, { pos: "RW", x: 80, y: 22 }
  ],
  "3-2-3-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 38, y: 62 }, { pos: "CDM", x: 62, y: 62 },
    { pos: "LM", x: 15, y: 45 }, { pos: "CAM", x: 50, y: 40 }, { pos: "RM", x: 85, y: 45 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "3-2-4-1": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 38, y: 65 }, { pos: "CDM", x: 62, y: 65 },
    { pos: "LM", x: 15, y: 42 }, { pos: "LAM", x: 35, y: 45 }, { pos: "RAM", x: 65, y: 45 }, { pos: "RM", x: 85, y: 42 },
    { pos: "ST", x: 50, y: 18 }
  ],
  "3-1-4-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 50, y: 65 },
    { pos: "LM", x: 15, y: 45 }, { pos: "LCM", x: 35, y: 48 }, { pos: "RCM", x: 65, y: 48 }, { pos: "RM", x: 85, y: 45 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "3-3-2-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 50, y: 65 }, { pos: "LM", x: 15, y: 55 }, { pos: "RM", x: 85, y: 55 },
    { pos: "LAM", x: 35, y: 40 }, { pos: "RAM", x: 65, y: 40 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "3-4-1-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "LM", x: 15, y: 50 }, { pos: "LCM", x: 38, y: 55 }, { pos: "RCM", x: 62, y: 55 }, { pos: "RM", x: 85, y: 50 },
    { pos: "CAM", x: 50, y: 38 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "5-2-2-1": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LWB", x: 10, y: 65 }, { pos: "LCB", x: 30, y: 78 }, { pos: "CB", x: 50, y: 80 }, { pos: "RCB", x: 70, y: 78 }, { pos: "RWB", x: 90, y: 65 },
    { pos: "LCM", x: 38, y: 55 }, { pos: "RCM", x: 62, y: 55 },
    { pos: "LAM", x: 35, y: 38 }, { pos: "RAM", x: 65, y: 38 },
    { pos: "ST", x: 50, y: 18 }
  ],
  "5-2-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LWB", x: 10, y: 65 }, { pos: "LCB", x: 30, y: 78 }, { pos: "CB", x: 50, y: 80 }, { pos: "RCB", x: 70, y: 78 }, { pos: "RWB", x: 90, y: 65 },
    { pos: "LCM", x: 38, y: 52 }, { pos: "RCM", x: 62, y: 52 },
    { pos: "LW", x: 22, y: 22 }, { pos: "ST", x: 50, y: 15 }, { pos: "RW", x: 78, y: 22 }
  ],
  "5-3-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LWB", x: 10, y: 65 }, { pos: "LCB", x: 30, y: 78 }, { pos: "CB", x: 50, y: 80 }, { pos: "RCB", x: 70, y: 78 }, { pos: "RWB", x: 90, y: 65 },
    { pos: "LCM", x: 30, y: 50 }, { pos: "CM", x: 50, y: 50 }, { pos: "RCM", x: 70, y: 50 },
    { pos: "ST", x: 35, y: 22 }, { pos: "ST", x: 65, y: 22 }
  ],
  "5-4-1": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LWB", x: 10, y: 65 }, { pos: "LCB", x: 30, y: 78 }, { pos: "CB", x: 50, y: 80 }, { pos: "RCB", x: 70, y: 78 }, { pos: "RWB", x: 90, y: 65 },
    { pos: "LM", x: 20, y: 45 }, { pos: "LCM", x: 40, y: 48 }, { pos: "RCM", x: 60, y: 48 }, { pos: "RM", x: 80, y: 45 },
    { pos: "ST", x: 50, y: 20 }
  ],
  "5-2-1-2": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LWB", x: 10, y: 65 }, { pos: "LCB", x: 30, y: 78 }, { pos: "CB", x: 50, y: 80 }, { pos: "RCB", x: 70, y: 78 }, { pos: "RWB", x: 90, y: 65 },
    { pos: "LCM", x: 38, y: 52 }, { pos: "RCM", x: 62, y: 52 },
    { pos: "CAM", x: 50, y: 38 },
    { pos: "ST", x: 35, y: 20 }, { pos: "ST", x: 65, y: 20 }
  ],
  "4-3-2-1": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LB", x: 15, y: 75 }, { pos: "CB", x: 38, y: 75 }, { pos: "CB", x: 62, y: 75 }, { pos: "RB", x: 85, y: 75 },
    { pos: "LCM", x: 30, y: 55 }, { pos: "CM", x: 50, y: 58 }, { pos: "RCM", x: 70, y: 55 },
    { pos: "LSS", x: 35, y: 35 }, { pos: "RSS", x: 65, y: 35 },
    { pos: "ST", x: 50, y: 18 }
  ],
  "3-3-1-3 (Diamond)": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 50, y: 65 }, { pos: "LCM", x: 30, y: 52 }, { pos: "RCM", x: 70, y: 52 },
    { pos: "CAM", x: 50, y: 38 },
    { pos: "LW", x: 20, y: 22 }, { pos: "ST", x: 50, y: 15 }, { pos: "RW", x: 80, y: 22 }
  ],
  "3-1-3-3": [
    { pos: "GK", x: 50, y: 92 },
    { pos: "LCB", x: 25, y: 75 }, { pos: "CB", x: 50, y: 78 }, { pos: "RCB", x: 75, y: 75 },
    { pos: "CDM", x: 50, y: 65 },
    { pos: "LM", x: 15, y: 48 }, { pos: "CM", x: 50, y: 48 }, { pos: "RM", x: 85, y: 48 },
    { pos: "LW", x: 20, y: 22 }, { pos: "ST", x: 50, y: 15 }, { pos: "RW", x: 80, y: 22 }
  ]
};

const PitchViewPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const pitchRef = useRef(null);
  const dashboardRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [formation, setFormation] = useState("4-3-3");
  const [lineup, setLineup] = useState({}); // formationIndex -> player
  const [bench, setBench] = useState([]);
  const [summary, setSummary] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchSquad();
  }, []);

  const fetchSquad = async () => {
    try {
      setLoading(true);
      const [sumRes, clubRes, usersRes] = await Promise.all([
        auctionService.getSummary().catch(() => null),
        auctionService.getClubs(),
        fetch('/api/users').then(r => r.json()).catch(() => null)
      ]);
      
      const data = sumRes?.data || sumRes || {};
      setSummary(data);
      setClubs(clubRes?.data || clubRes || []);

      // Find the current user's fresh profile from user list
      const allUsers = usersRes?.data || usersRes || [];
      const freshProfile = Array.isArray(allUsers) 
        ? allUsers.find(u => u.userId === currentUser?.userId)
        : null;
      if (freshProfile) setUserProfile(freshProfile);

      let squadData = data.squad || [];
      let quotasData = data.quotas || [];
      
      if (squadData.length === 0 && data.data) squadData = data.data.squad || [];
      if (quotasData.length === 0 && data.data) quotasData = data.data.quotas || [];

      if (quotasData.length === 0) {
        const qRes = await auctionService.getQuotas();
        quotasData = qRes?.data || qRes || [];
      }
      
      const players = squadData.filter(p => p.status !== 'Loaned');
      setSquad(players);
      setQuotas(quotasData);

      const savedData = localStorage.getItem(`etpl_lineup_default`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.formation && FORMATIONS[parsed.formation]) {
          setFormation(parsed.formation);
          setLineup(parsed.lineup || {});
          const assignedIds = Object.values(parsed.lineup || {}).map(p => p.squadId);
          setBench(players.filter(p => !assignedIds.includes(p.squadId)));
        } else {
          setBench(players);
        }
      } else {
        setBench(players);
      }
    } catch (err) {
      enqueueSnackbar("Failed to load squad data", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStyle = (player) => {
    const defaultStyle = { ...GRADE_STYLE_MAP["DEFAULT"], grade: "" };
    if (!player || !quotas.length) return defaultStyle;
    
    const ovr = Number(player.playerOvr ?? player.playerOVR ?? player.ovr ?? player.OVR ?? 0);
    
    const quota = quotas.find((q) => {
      const min = Number(q.minOvr ?? q.minOVR ?? q.MinOVR ?? 0);
      const max = Number(q.maxOvr ?? q.maxOVR ?? q.MaxOVR ?? 0);
      return ovr >= min && ovr <= max;
    });
    
    if (!quota) return defaultStyle;
    const rawGrade = quota.gradeName ?? quota.GradeName ?? quota.grade ?? "";
    const grade = rawGrade.toString().trim().toUpperCase();
    
    return { 
      ...(GRADE_STYLE_MAP[grade] || GRADE_STYLE_MAP["DEFAULT"]),
      grade: grade 
    };
  };

  const handleSaveLineup = () => {
    localStorage.setItem(`etpl_lineup_default`, JSON.stringify({ formation, lineup }));
    enqueueSnackbar("Lineup saved", { variant: "success" });
  };

  const handleResetLineup = () => {
    setLineup({});
    setBench(squad);
    enqueueSnackbar("Lineup cleared", { variant: "info" });
  };

  const handleFormationChange = (e) => {
    const newForm = e.target.value;
    setFormation(newForm);
    const maxSlots = FORMATIONS[newForm].length;
    const newLineup = {};
    const backToBench = [];
    Object.keys(lineup).forEach(idx => {
      if (parseInt(idx) < maxSlots) newLineup[idx] = lineup[idx];
      else backToBench.push(lineup[idx]);
    });
    setLineup(newLineup);
    setBench(prev => [...prev, ...backToBench]);
  };

  const handleExport = async () => {
    if (!dashboardRef.current) return;
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, { 
        useCORS: true, 
        backgroundColor: null,
        scale: 2,
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        logging: false
      });
      const link = document.createElement("a");
      link.download = `etpl_dashboard_${formation}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      enqueueSnackbar("Exported Dashboard as PNG", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Export failed", { variant: "error" });
    }
  };

  const onDragStart = (e, player, fromIndex = null) => {
    e.dataTransfer.setData("player", JSON.stringify(player));
    e.dataTransfer.setData("fromIndex", fromIndex === null ? "" : fromIndex);
  };

  const onDrop = (e, toIndex) => {
    e.preventDefault();
    const playerData = e.dataTransfer.getData("player");
    if (!playerData) return;
    const player = JSON.parse(playerData);
    const fromIndex = e.dataTransfer.getData("fromIndex");
    const newLineup = { ...lineup };
    const currentPlayerAtPos = newLineup[toIndex];

    if (fromIndex !== "") {
      if (currentPlayerAtPos) newLineup[fromIndex] = currentPlayerAtPos;
      else delete newLineup[fromIndex];
      newLineup[toIndex] = player;
    } else {
      if (currentPlayerAtPos) setBench(prev => [...prev.filter(p => p.squadId !== player.squadId), currentPlayerAtPos]);
      else setBench(prev => prev.filter(p => p.squadId !== player.squadId));
      newLineup[toIndex] = player;
    }
    setLineup(newLineup);
  };

  const onRemoveFromLineup = (index) => {
    const player = lineup[index];
    if (!player) return;
    const newLineup = { ...lineup };
    delete newLineup[index];
    setLineup(newLineup);
    setBench(prev => [...prev, player]);
  };

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

  // Resolve team name from fresh profile (AllowAnonymous API) first
  const resolvedTeam = userProfile?.currentTeam || summary?.club?.teamName || currentUser?.currentTeam;
  const teamName = resolvedTeam || "Free Agent";
  const teamLogo = teamName !== "Free Agent" ? getLogoUrl(teamName) : "";
  const profilePic = currentUser?.linePic || "https://ui-avatars.com/api/?name=Manager&background=random";

  const teamValue = squad.reduce((sum, p) => sum + (Number(p.pricePaid || p.buyPrice || p.price || 0)), 0);
  const squadCount = squad.length;
  const avgOvr = squadCount > 0 
    ? Math.round(squad.reduce((sum, p) => sum + Number(p.playerOvr ?? p.playerOVR ?? p.ovr ?? p.OVR ?? 0), 0) / squadCount) 
    : 0;

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#f8fafc',
      backgroundImage: `
        radial-gradient(at 0% 0%, ${alpha(theme.palette.primary.main, 0.05)} 0px, transparent 50%),
        radial-gradient(at 100% 0%, ${alpha(theme.palette.primary.light, 0.05)} 0px, transparent 50%),
        radial-gradient(at 50% 100%, ${alpha(theme.palette.primary.main, 0.02)} 0px, transparent 50%)
      `,
      p: { xs: 2, md: 3, lg: 4 },
      pb: 10
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <SportsSoccer color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Pitch View</Typography>
            <Typography variant="body2" color="text.secondary">VISUAL SQUAD BUILDER</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleResetLineup}>Reset</Button>
          <Button variant="outlined" startIcon={<Save />} onClick={handleSaveLineup}>Save</Button>
          <Button variant="contained" startIcon={<Download />} onClick={handleExport}>Export PNG</Button>
        </Box>
      </Box>

      <Box 
        ref={dashboardRef}
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', xl: 'row' }, 
          gap: 2, 
          alignItems: 'stretch',
          p: 2, // Internal padding for clean export edges
          borderRadius: 4
        }}
      >
        {/* Left: Profile Area */}
        <Box sx={{ flex: { xs: '1 1 auto', xl: '0 0 300px' }, minWidth: 300 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              height: '100%', 
              p: 0, 
              m: 0,
              borderRadius: 4, 
              border: '1px solid', 
              borderColor: 'rgba(255, 255, 255, 0.1)', 
              bgcolor: 'rgba(15, 23, 42, 0.9)', 
              background: `
                radial-gradient(at 0% 100%, ${alpha(theme.palette.primary.main, 0.15)} 0px, transparent 50%),
                radial-gradient(at 100% 0%, ${alpha(theme.palette.secondary.main, 0.08)} 0px, transparent 50%),
                linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.9) 100%)
              `,
              backdropFilter: 'blur(24px)',
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              color: 'white'
            }}
          >
            {/* 1. Profile Pic - Cinematic Frame (Full Bleed Top) */}
            <Box sx={{ 
              width: '100%', 
              height: 340, 
              position: 'relative', 
              bgcolor: 'transparent', 
              overflow: 'hidden',
              borderTopLeftRadius: 'inherit',
              borderTopRightRadius: 'inherit'
            }}>
               <Box 
                sx={{ 
                  width: '100%', 
                  height: '100%', 
                  backgroundImage: `url(${profilePic})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center top',
                  filter: 'brightness(1.05) contrast(1.05)',
                  transition: 'transform 0.5s ease',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
               />
               <Box sx={{ 
                 position: 'absolute', inset: 0,
                 background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.4) 40%, transparent 100%)',
                 p: 3,
                 display: 'flex',
                 flexDirection: 'column',
                 justifyContent: 'flex-end',
                 alignItems: 'center',
                 textAlign: 'center'
               }}>
                 <Typography 
                  variant="h5" 
                  fontWeight="1000" 
                  sx={{ 
                    color: 'white', 
                    lineHeight: 1.1, 
                    mb: 1,
                    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.03em',
                    fontSize: '1.75rem'
                  }}
                 >
                   {currentUser?.lineName || "Manager"}
                 </Typography>
                 <Box sx={{ 
                   display: 'inline-flex', 
                   px: 2, py: 0.75, 
                   borderRadius: 10, 
                   bgcolor: 'rgba(255,255,255,0.12)', 
                   backdropFilter: 'blur(8px)',
                   border: '1px solid rgba(255,255,255,0.2)',
                   boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                 }}>
                   <Typography variant="caption" sx={{ color: 'white', fontWeight: '900', letterSpacing: 1.5, fontSize: '0.65rem' }}>
                     {currentUser?.userId?.toUpperCase() || "ADMIN"}
                   </Typography>
                 </Box>
               </Box>
            </Box>

            <Box sx={{ px: 2.5, py: 3.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Team Identity Badge */}
              <Box sx={{ 
                width: '100%', 
                mb: 4, 
                p: 2,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                transition: 'all 0.3s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.6)', transform: 'translateY(-2px)' }
              }}>
                <Box sx={{ position: 'relative' }}>
                  <Box 
                    component="img"
                    src={teamLogo} 
                    onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=Team&background=random"; }}
                    sx={{ 
                      width: 56, 
                      height: 56, 
                      bgcolor: 'white', 
                      border: '1px solid', 
                      borderColor: 'divider', 
                      p: 0.75, 
                      borderRadius: 3, // Squircle shape
                      objectFit: 'contain',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="caption" 
                    color="primary.light" 
                    fontWeight="1000" 
                    sx={{ display: 'block', mb: 0.2, letterSpacing: 2, fontSize: '0.6rem', opacity: 0.9 }}
                  >
                    CURRENT TEAM
                  </Typography>
                  <Typography variant="h6" fontWeight="1000" sx={{ color: 'white', lineHeight: 1, letterSpacing: '-0.02em', fontSize: '1.15rem' }}>
                    {teamName}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={1.5}>
                {/* Left: Team Value */}
                <Grid item xs={6}>
                  <Box 
                    sx={{ 
                      height: '100%',
                      p: 2.5, 
                      borderRadius: 4, 
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { 
                        transform: 'translateY(-4px) scale(1.02)',
                        bgcolor: 'rgba(255, 255, 255, 0.06)'
                      }
                    }}
                  >
                    <Typography variant="caption" color="primary.light" fontWeight="900" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1, fontSize: '0.6rem', letterSpacing: 1, alignSelf: 'flex-start' }}>
                      <AccountBalanceWallet sx={{ fontSize: 14 }} /> VALUE
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <Box display="flex" alignItems="baseline" gap={0.3}>
                        <Typography variant="h5" fontWeight="1000" color="white" sx={{ letterSpacing: '-0.04em', lineHeight: 1 }}>
                          {teamValue.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" fontWeight="1000" color="white" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>TP</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                
                {/* Right: Squad & OVR Stack */}
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                    {/* Squad */}
                    <Box 
                      sx={{ 
                        flex: 1,
                        p: 1.5, 
                        borderRadius: 3, 
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.4s ease',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' }
                      }}
                    >
                      <Typography variant="caption" color="white" fontWeight="900" sx={{ fontSize: '0.6rem', letterSpacing: 0.5, mb: 0.2, alignSelf: 'flex-start', opacity: 0.7 }}>
                        SQUAD
                      </Typography>
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <Typography variant="h6" fontWeight="1000" sx={{ lineHeight: 1, color: 'white' }}>{squadCount}</Typography>
                      </Box>
                    </Box>

                    {/* Avg OVR */}
                    <Box 
                      sx={{ 
                        flex: 1,
                        p: 1.5, 
                        borderRadius: 3, 
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.4s ease',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' }
                      }}
                    >
                      <Typography variant="caption" color="white" fontWeight="900" sx={{ fontSize: '0.6rem', letterSpacing: 0.5, mb: 0.2, alignSelf: 'flex-start', opacity: 0.7 }}>
                        AVG OVR
                      </Typography>
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <Typography variant="h6" fontWeight="1000" sx={{ lineHeight: 1, color: '#f59e0b' }}>{avgOvr}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              flex: 1, 
              p: 2, 
              borderRadius: 4, 
              border: '1px solid', 
              borderColor: 'rgba(255, 255, 255, 0.1)', 
              bgcolor: 'rgba(15, 23, 42, 0.9)', 
              background: `
                radial-gradient(at 100% 100%, ${alpha(theme.palette.primary.main, 0.12)} 0px, transparent 50%),
                linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.9) 100%)
              `,
              backdropFilter: 'blur(24px)',
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              color: 'white'
            }}
          >
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: '1000', letterSpacing: 2, display: 'block', opacity: 0.9 }}>FORMATION</Typography>
                <FormControl size="small" variant="standard" sx={{ mt: 0.5 }}>
                  <Select
                    value={formation}
                    onChange={handleFormationChange}
                    sx={{ 
                      fontWeight: '900', 
                      fontSize: '1.1rem',
                      color: 'white',
                      '&:before, &:after': { border: 'none' },
                      '& .MuiSelect-select': { py: 0, color: 'white' }
                    }}
                  >
                    {Object.keys(FORMATIONS).map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: '900', letterSpacing: 1 }}>FULL HEIGHT FIELD</Typography>
            </Box>

            <Box ref={pitchRef} sx={{ 
              height: 'calc(100vh - 240px)', // FILL VIEWPORT HEIGHT
              minHeight: 550,
              aspectRatio: '3/4', // KEEP PROPORTIONAL
              width: 'auto',
              mx: 'auto',
              background: 'linear-gradient(180deg, #166534 0%, #14532d 100%)', 
              borderRadius: 3, 
              position: 'relative', 
              overflow: 'hidden', 
              border: '4px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)'
            }}>
              {/* Pitch Markings */}
              <Box sx={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '25%', height: '18%', border: '2px solid white', borderRadius: '50%' }} />
                <Box sx={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '2px', bgcolor: 'white' }} />
                <Box sx={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '18%', border: '2px solid white' }} />
                <Box sx={{ position: 'absolute', bottom: 0, left: '20%', width: '60%', height: '18%', border: '2px solid white' }} />
              </Box>

              {FORMATIONS[formation].map((slot, index) => {
                const player = lineup[index];
                const style = getPlayerStyle(player);
                return (
                  <Box key={index} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, index)} sx={{ position: 'absolute', left: `${slot.x}%`, top: `${slot.y}%`, transform: 'translate(-50%, -50%)', width: 80, textAlign: 'center', zIndex: 10 }}>
                    <Box 
                      draggable={!!player} 
                      onDragStart={e => onDragStart(e, player, index)} 
                      onClick={() => player && onRemoveFromLineup(index)}
                      sx={{ 
                        width: isMobile ? 50 : 64, 
                        height: isMobile ? 50 : 64, 
                        margin: '0 auto', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        position: 'relative',
                        background: player ? style.gradient : 'rgba(255,255,255,0.05)',
                        border: player ? '1px solid rgba(255,255,255,0.4)' : '2px dashed rgba(255,255,255,0.2)',
                        padding: player ? '3px' : 0,
                        boxShadow: player ? style.glow : 'none',
                        transition: 'all 0.2s',
                        '&:hover': { transform: player ? 'scale(1.1) translateY(-5px)' : 'none', zIndex: 20 },
                      }}
                    >
                      {/* Shine Container (to prevent overflow) */}
                      {player && (
                        <Box sx={{ 
                          position: 'absolute', 
                          inset: 0, 
                          borderRadius: '50%', 
                          overflow: 'hidden', 
                          zIndex: 2,
                          pointerEvents: 'none'
                        }}>
                          <Box sx={{
                            position: 'absolute',
                            top: 0, left: 0, width: '100%', height: '100%',
                            background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                            backgroundSize: '200% 200%',
                            animation: 'shine 3s infinite linear',
                          }} />
                        </Box>
                      )}

                      {player ? (
                        <>
                          <Box sx={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                            <PitchPlayerAvatar playerId={player.playerId} style={style} />
                          </Box>
                          <Box sx={{
                            position: 'absolute',
                            top: -2,
                            left: -2,
                            bgcolor: 'rgba(0,0,0,0.85)',
                            color: style.color,
                            fontSize: 8,
                            fontWeight: 900,
                            px: 0.6,
                            py: 0.2,
                            borderRadius: '4px 0 4px 0',
                            border: `1px solid ${style.color}`,
                            zIndex: 10,
                            textTransform: 'uppercase'
                          }}>
                            {player.position}
                          </Box>
                          {/* OVR Badge (Bottom Right) - Only OVR for pitch tokens */}
                          <Box sx={{ 
                            position: 'absolute', 
                            bottom: -2, 
                            right: -2, 
                            bgcolor: style.color, 
                            color: 'black',
                            width: 22, 
                            height: 22, 
                            borderRadius: '50%', 
                            fontSize: 10, 
                            lineHeight: 1,
                            fontWeight: 1000, 
                            border: '1px solid white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            pt: '1px' // Slight adjustment for vertical centering in most fonts
                          }}>
                            {player.playerOvr}
                          </Box>
                        </>
                      ) : <PersonAdd sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }} />}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px black', fontSize: 10 }}>
                      {player ? player.playerName.split(' ').pop() : slot.pos}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>

        {/* Right: Squad Bench */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              height: '100%', 
              borderRadius: 4, 
              border: '1px solid', 
              borderColor: 'rgba(255, 255, 255, 0.1)', 
              bgcolor: 'rgba(15, 23, 42, 0.9)', 
              background: `
                radial-gradient(at 0% 0%, ${alpha(theme.palette.primary.main, 0.12)} 0px, transparent 50%),
                linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.9) 100%)
              `,
              backdropFilter: 'blur(24px)',
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              color: 'white'
            }}
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Groups sx={{ color: 'primary.light', fontSize: 28 }} />
              <Typography variant="h6" fontWeight="1000" sx={{ letterSpacing: '-0.02em' }}>Squad Bench</Typography>
              <Box sx={{ 
                ml: 'auto',
                px: 1.5, py: 0.5, 
                borderRadius: 2, 
                bgcolor: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)' 
              }}>
                <Typography variant="caption" fontWeight="900" sx={{ color: 'primary.light' }}>{bench.length}</Typography>
              </Box>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Box sx={{ px: 8, py: 2, maxHeight: '70vh', overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                {bench.sort((a,b) => b.playerOvr - a.playerOvr).map(player => {
                  const style = getPlayerStyle(player);
                  return (
                    <Box key={player.squadId} sx={{ width: { xs: '50%', sm: '33.33%', md: '20%' }, p: 0.1, mb: 1.5 }}>
                      <Box draggable onDragStart={e => onDragStart(e, player)}
                        sx={{ 
                          p: 0.2, 
                          textAlign: 'center', 
                          borderRadius: 0, 
                          cursor: 'grab', 
                          position: 'relative',
                          height: 125, 
                          width: 90, 
                          mx: 'auto', 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(180deg, ${alpha(style.color, 0.1)} 0%, rgba(255,255,255,0.05) 100%)`,
                          backdropFilter: 'blur(5px)',
                          boxShadow: style.glow === 'none' ? '0 4px 10px rgba(0,0,0,0.1)' : style.glow, 
                          border: '1px solid',
                          borderColor: alpha(style.color, 0.3),
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': { 
                            transform: 'translateY(-6px)', 
                            borderColor: style.color,
                            boxShadow: `0 8px 20px ${alpha(style.color, 0.3)}`,
                            zIndex: 10 
                          }
                        }}
                      >
                        {/* Grade Badge */}
                        <Box sx={{ 
                          position: 'absolute', 
                          top: -6, 
                          right: -6, 
                          bgcolor: style.color, 
                          color: 'black', 
                          fontSize: '12px', 
                          fontWeight: '900', 
                          minWidth: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          zIndex: 5,
                          border: '1px solid white'
                        }}>
                          {style.grade}
                        </Box>

                        <Box
                          component="img"
                          src={getPlayerCardUrl(player.playerId)}
                          crossOrigin="anonymous"
                          sx={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                          }} 
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      <style>{`@keyframes shine { 0% { transform: translateX(-150%) rotate(45deg); } 20% { transform: translateX(150%) rotate(45deg); } 100% { transform: translateX(150%) rotate(45deg); } }`}</style>
    </Box>
  );
};

export default PitchViewPage;
