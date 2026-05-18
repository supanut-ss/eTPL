import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Chip,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Download,
  EmojiEvents,
  AccountBalanceWallet,
  Groups,
  Star,
  MonetizationOn,
  TrendingUp,
  MilitaryTech,
  Verified,
  AccountCircle,
} from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { getUserById } from "../api/userApi";
import { hofApi } from "../api/hofApi";
import auctionService from "../services/auctionService";
import { getLogoUrl, getPlayerFaceUrlPesmaster, getPlayerFaceUrl } from "../utils/imageUtils";
import { API_BASE_URL } from "../api/axiosInstance";
import html2canvas from "html2canvas";
import { useSnackbar } from "notistack";

// Custom Google Font for that premium look
const FONT_OUTFIT = "'Outfit', sans-serif";
const PROD_BASE = "https://thaipesleague.com";

const toProxyUrl = (url) => {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  let normalized = url;
  if (!url.startsWith("http")) {
    normalized = `${PROD_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  } else if (url.includes("localhost") || url.startsWith(window.location.origin)) {
    try {
      const parsed = new URL(url);
      normalized = `${PROD_BASE}${parsed.pathname}${parsed.search}`;
    } catch { normalized = url; }
  }
  return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
};

const PlayerMiniCard = ({ player, label, value, color, icon }) => {
  const initialId = player ? (player.pesPlayerId || player.playerId) : null;
  const [src, setSrc] = useState(initialId ? getPlayerFaceUrlPesmaster(initialId, "webp") : "");
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (player) {
      const id = player.pesPlayerId || player.playerId;
      setSrc(getPlayerFaceUrlPesmaster(id, "webp"));
      setRetry(0);
      setError(false);
    }
  }, [player]);

  if (!player) return null;
  const ovr = player.playerOvr ?? player.playerOVR ?? player.ovr ?? player.OVR ?? player.overallRating ?? 0;
  
  const handleImgError = () => {
    const id = player.pesPlayerId || player.playerId;
    if (retry === 0) {
      setSrc(getPlayerFaceUrlPesmaster(id, "png"));
      setRetry(1);
    } else if (retry === 1) {
      setSrc(getPlayerFaceUrl(id));
      setRetry(2);
    } else {
      setError(true);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, 
      borderRadius: 3, 
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateX(4px)',
        background: 'rgba(255,255,255,0.05)',
        borderColor: `${color}44`
      }
    }}>
      <Box sx={{ position: 'relative', width: 48, height: 48 }}>
        <Box sx={{ width: '100%', height: '100%', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', border: `2px solid ${color}33`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {error ? (
            <AccountCircle sx={{ fontSize: 40, color: 'rgba(255,255,255,0.3)' }} />
          ) : (
            <Box 
              component="img"
              src={src}
              onError={handleImgError}
              referrerPolicy="no-referrer"
              sx={{ 
                width: '110%', height: '110%', 
                objectFit: retry >= 2 ? 'contain' : 'cover',
                zIndex: 1,
                display: 'block',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                transform: 'translateY(5%)'
              }} 
            />
          )}
        </Box>
      </Box>
      <Box flex={1} overflow="hidden">
        <Typography sx={{ 
          fontSize: '0.55rem', color: "rgba(255,255,255,0.4)", 
          display: "flex", alignItems: "center", gap: 0.5, 
          fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
          mb: 0.5 // Added spacing here
        }}>
          {icon} {label}
        </Typography>
        <Typography variant="body2" fontWeight={800} color="white" noWrap sx={{ 
          fontFamily: FONT_OUTFIT, 
          lineHeight: 1.1,
          mb: 0.3
        }}>
          {player.playerName.toUpperCase()}
        </Typography>
        <Typography variant="caption" fontWeight={900} sx={{ color: color, fontSize: '0.7rem' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

const ProfilePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [userProfile, setUserProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [squad, setSquad] = useState([]);
  const [totalTrophies, setTotalTrophies] = useState(0);

  useEffect(() => {
    if (user && !userProfile) setUserProfile(user);
  }, [user, userProfile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId) return;
      setLoading(true);
      try {
        const [summaryRes, userRes, hofRes] = await Promise.all([
          auctionService.getSummary(),
          getUserById(user.userId),
          hofApi.getHof().catch(() => [])
        ]);

        const summaryData = summaryRes?.data || summaryRes;
        if (summaryData?.squad) setSquad(summaryData.squad);

        const userData = userRes?.data?.data || userRes?.data || userRes;
        if (userData && userData.userId) {
          setUserProfile(userData);
          
          // Calculate total trophies from HOF data
          const userHofWins = (hofRes || []).filter(h => 
            h.winnerName?.trim().toLowerCase() === userData.userId.trim().toLowerCase()
          );
          setTotalTrophies(userHofWins.length);
        }
      } catch (err) {
        console.error("Data fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.userId]);

  const handleExport = async () => {
    const element = cardRef.current;
    if (!element) return;
    setExporting(true);

    const blobUrls = [];

    // Create temporary hidden container
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = "1000px";
    tempContainer.style.height = "560px";
    tempContainer.style.zIndex = "-9999";
    document.body.appendChild(tempContainer);

    // Clone element and lock size to exact desktop resolution (1000x560)
    const clonedElement = element.cloneNode(true);
    clonedElement.style.width = "1000px";
    clonedElement.style.height = "560px";
    clonedElement.style.minHeight = "560px";
    clonedElement.style.position = "relative";
    clonedElement.style.boxShadow = "none";
    clonedElement.style.transform = "none";
    tempContainer.appendChild(clonedElement);

    // Normalize a URL for export (same as PitchViewPage)
    const toProxyUrlExport = (url) => {
      if (!url || url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:")) return null;
      let normalized = url;
      if (!url.startsWith("http")) {
        normalized = `${PROD_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
      } else if (url.includes("localhost") || url.startsWith(window.location.origin)) {
        try {
          const parsed = new URL(url);
          normalized = `${PROD_BASE}${parsed.pathname}${parsed.search}`;
        } catch { normalized = url; }
      }
      return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
    };

    // Fetch image via proxy and return a local blob URL
    const toBlob = async (url) => {
      const proxyUrl = toProxyUrlExport(url);
      if (!proxyUrl) return null;
      try {
        console.log("[Export] Fetching:", url);
        const res = await fetch(proxyUrl);
        if (!res.ok) { console.warn("[Export] Failed:", res.status, url); return null; }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobUrls.push(blobUrl);
        return blobUrl;
      } catch (e) {
        console.warn("[Export] Error:", url, e.message);
        return null;
      }
    };

    // Wait for an <img> to finish loading its new src
    const waitForLoad = (img) => new Promise((resolve) => {
      if (img.complete && img.naturalWidth > 0) { resolve(); return; }
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 4000);
    });

    // 1. Swap all <img> src to blob URLs on clonedElement
    const allImgs = Array.from(clonedElement.querySelectorAll("img"));
    console.log("[Export] Found", allImgs.length, "img elements in clone");
    await Promise.all(allImgs.map(async (img) => {
      // Use data-export-url if set (preserves original URL even after onError changed src)
      const urlToFetch = img.dataset.exportUrl || img.src;
      if (!urlToFetch) return;
      const blobUrl = await toBlob(urlToFetch);
      if (blobUrl) {
        img.src = blobUrl;
        await waitForLoad(img);
      }
    }));

    // 2. Swap inline-style background-images on clonedElement
    const allBoxes = Array.from(clonedElement.querySelectorAll("[style*='background-image']"));
    console.log("[Export] Found", allBoxes.length, "inline background-image elements in clone");
    await Promise.all(allBoxes.map(async (box) => {
      const originalStyle = box.style.backgroundImage;
      const match = originalStyle.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1]) {
        const blobUrl = await toBlob(match[1]);
        if (blobUrl) {
          box.style.backgroundImage = `url(${blobUrl})`;
        }
      }
    }));

    // 3. Scan computed styles of all elements inside the ORIGINAL element
    // and apply their background images as inline style blobs on the CLONED element!
    const originalEls = Array.from(element.querySelectorAll("*"));
    const clonedEls = Array.from(clonedElement.querySelectorAll("*"));
    await Promise.all(originalEls.map(async (origEl, idx) => {
      const bg = getComputedStyle(origEl).backgroundImage;
      if (!bg || bg === "none") return;
      const match = bg.match(/url\(["']?(https?:[^"')]+)["']?\)/);
      if (!match || !match[1]) return;
      const url = match[1];
      const blobUrl = await toBlob(url);
      if (blobUrl && clonedEls[idx]) {
        clonedEls[idx].style.backgroundImage = `url(${blobUrl})`;
      }
    }));

    try {
      // Give a tiny timeout for layout rendering
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(clonedElement, {
        useCORS: false,     // All sources are now same-origin blob URLs
        allowTaint: false,  // No taint possible with blob URLs
        backgroundColor: "#020617",
        scale: 2,
        width: 1000,
        height: 560,
        logging: false,
        ignoreElements: (el) => el.classList?.contains("no-export"),
      });
      const link = document.createElement("a");
      link.download = `etpl_manager_card_${userProfile?.userId || 'profile'}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      enqueueSnackbar("Manager Card exported!", { variant: "success" });
    } catch (err) {
      console.error("[Export] Failed:", err);
      enqueueSnackbar(`Export failed: ${err?.message || "unknown error"}`, { variant: "error" });
    } finally {
      // Remove temporary hidden container and revoke blob URLs
      document.body.removeChild(tempContainer);
      blobUrls.forEach(url => URL.revokeObjectURL(url));
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0b0f19", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#2563eb" }} />
      </Box>
    );
  }

  const isLevel = (lvl) => (userProfile?.userLevel || "").toLowerCase() === lvl.toLowerCase();
  const themes = {
    admin: { primary: "#fbbf24", secondary: "#fbbf24", accent: "#fbbf24", bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", glow: "rgba(251, 191, 36, 0.4)", label: "ELITE ADMIN" },
    mod: { primary: "#818cf8", secondary: "#818cf8", accent: "#818cf8", bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", glow: "rgba(129, 140, 248, 0.3)", label: "COMMUNITY MOD" },
    default: { primary: "#60a5fa", secondary: "#60a5fa", accent: "#60a5fa", bg: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", glow: "rgba(96, 165, 250, 0.2)", label: "PRO MANAGER" }
  };
  const currentTheme = isLevel("admin") ? themes.admin : (isLevel("mod") || isLevel("moderator") ? themes.mod : themes.default);
  const resolvedTeam = userProfile?.currentTeam || "Free Agent";
  const teamLogo = resolvedTeam !== "Free Agent" ? getLogoUrl(resolvedTeam) : "/logo-etpl.png";
  const nickname = userProfile?.teamNickname || "";
  const teamValue = squad.reduce((sum, p) => sum + (Number(p.pricePaid || p.buyPrice || p.price || 0)), 0);
  const squadCount = squad.length;
  const avgOvr = squadCount > 0 ? Math.round(squad.reduce((sum, p) => sum + Number(p.playerOvr ?? p.ovr ?? 0), 0) / squadCount) : 0;
  
  let mostExpensivePlayer = null;
  let highestOvrPlayer = null;
  if (squadCount > 0) {
    mostExpensivePlayer = [...squad].sort((a, b) => Number(b.pricePaid || b.price || 0) - Number(a.pricePaid || a.price || 0))[0];
    highestOvrPlayer = [...squad].sort((a, b) => Number(b.playerOvr ?? b.ovr ?? 0) - Number(a.playerOvr ?? a.ovr ?? 0))[0];
  }

  const resolvedAvatar = userProfile?.linePic ? (userProfile.linePic.startsWith("/") ? `${API_BASE_URL}${userProfile.linePic}` : userProfile.linePic) : null;

  return (
    <Box sx={{ 
      position: 'absolute', top: -20, left: -28, right: -28, bottom: -24,
      bgcolor: "#020617", color: "white", display: "flex", flexDirection: "column",
      fontFamily: FONT_OUTFIT, overflow: 'hidden', zIndex: 1,
    }}>
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        background: `radial-gradient(circle at 50% -20%, ${currentTheme.primary}44 0%, #020617 70%)`,
      }} />

      <Box className="no-export" sx={{ position: 'fixed', top: 80, right: 32, zIndex: 2000 }}>
        <Button
          variant="contained"
          startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <Download />}
          onClick={handleExport}
          disabled={exporting}
          sx={{
            bgcolor: "rgba(37, 99, 235, 0.8)", backdropFilter: "blur(10px)",
            borderRadius: 2, fontWeight: 800, px: 3, py: 1,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
          }}
        >
          {exporting ? "Generating..." : "Download Card"}
        </Button>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box 
          ref={cardRef}
          style={{ backgroundColor: '#020617' }}
          sx={{
            position: 'relative', width: '100%', maxWidth: 1000, 
            borderRadius: 6, overflow: 'hidden', 
            boxShadow: `0 40px 100px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.05)`,
            display: 'flex', minHeight: 560,
          }}
        >
          {/* BG Layer 0: Base gradient - inline style so html2canvas reads it as a real DOM property */}
          <Box 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e1b4b 100%)',
              pointerEvents: 'none', zIndex: 0
            }}
          />
          {/* BG Layer 1: Texture pattern (real DOM element so html2canvas can capture it) */}
          <Box component="img"
            src="https://www.transparenttextures.com/patterns/shattered-island.png"
            data-export-url="https://www.transparenttextures.com/patterns/shattered-island.png"
            sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, pointerEvents: 'none', zIndex: 1 }}
          />
          {/* BG Layer 2: Color gradient overlay - inline style */}
          <Box 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: `radial-gradient(circle at 20% 20%, ${currentTheme.primary}18 0%, transparent 45%), radial-gradient(circle at 80% 80%, ${currentTheme.primary}18 0%, transparent 45%)`,
              pointerEvents: 'none', zIndex: 2
            }} 
          />
          {/* BG Layer 3: Subtle dot pattern */}
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, pointerEvents: 'none', zIndex: 1,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
          {/* BG Layer 4: Shine animation (web only, excluded from export via no-export class) */}
          <Box 
            className="no-export"
            sx={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
              animation: 'shine 6s infinite linear',
              pointerEvents: 'none', zIndex: 3,
              '@keyframes shine': {
                '0%': { backgroundPosition: '-100% -100%' },
                '100%': { backgroundPosition: '100% 100%' }
              }
            }}
          />

          {/* Manager Sidebar (Elite Design) */}
          <Box sx={{ 
            width: 230, display: "flex", flexDirection: "column", alignItems: "center", 
            px: 1.5, py: 3, zIndex: 5,
            position: 'relative'
          }}>
            <Box sx={{ position: 'relative', mb: 3 }}>
              {/* Profile Avatar with Royal Frame */}
              <Box sx={{ 
                p: 0.5, borderRadius: '50%', 
                background: `linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)`,
                boxShadow: `0 0 30px ${currentTheme.primary}44`
              }}>
                <Avatar src={resolvedAvatar} sx={{ width: 125, height: 125, border: `3px solid #020617` }} />
              </Box>
              <Box sx={{ 
                position: 'absolute', bottom: 5, right: 5, 
                background: "linear-gradient(135deg, #bf953f, #fcf6ba, #aa771c)",
                color: "#000", width: 34, height: 34, borderRadius: "50%", border: "3px solid #020617",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 15px rgba(0,0,0,0.8)`, zIndex: 6
              }}>
                <Verified sx={{ fontSize: 20 }} />
              </Box>
            </Box>
            
            <Typography variant="body1" fontWeight={950} textAlign="center" mb={3} sx={{ 
              color: 'white', 
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              letterSpacing: 0.5,
              fontFamily: FONT_OUTFIT,
              fontSize: '0.9rem',
              width: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              px: 1
            }}>
              {userProfile?.userId?.toUpperCase() || "MANAGER"}
            </Typography>

            <Box sx={{ 
              px: 2, py: 0.5, borderRadius: 1, mb: 4,
              background: `linear-gradient(135deg, ${currentTheme.primary}22, transparent)`,
              border: `1px solid ${currentTheme.primary}44`,
            }}>
              <Typography sx={{ color: currentTheme.primary, fontWeight: 900, fontSize: '0.6rem', letterSpacing: 2 }}>{currentTheme.label}</Typography>
            </Box>

            <Box sx={{ mt: 'auto', mb: 4, width: '100%', px: 2, opacity: 0.6 }}>
              <Box sx={{ height: '1px', width: '40px', bgcolor: currentTheme.primary, mb: 1.5, mx: 'auto', opacity: 0.5 }} />
              <Typography sx={{ color: 'white', fontSize: '0.55rem', fontWeight: 900, letterSpacing: 1.5, textAlign: 'center', mb: 0.5 }}>
                CERTIFIED BY
              </Typography>
              <Typography sx={{ color: currentTheme.primary, fontSize: '0.65rem', fontWeight: 950, letterSpacing: 2, textAlign: 'center' }}>
                THAI PES LEAGUE
              </Typography>
              <Typography sx={{ color: 'white', fontSize: '0.45rem', fontWeight: 700, letterSpacing: 1, textAlign: 'center', mt: 0.5, opacity: 0.7 }}>
                ELITE PRO COMPETITOR STATUS
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />
            
            <Box sx={{ textAlign: 'center', width: '100%', mb: 1 }}>
              <Box component="img" src="/logo-etpl.png" sx={{ width: 65, mb: 1, filter: 'brightness(1.5) drop-shadow(0 0 10px rgba(251,191,36,0.5))' }} />
              <Typography variant="caption" sx={{ color: currentTheme.primary, fontWeight: 900, letterSpacing: 3, fontSize: '0.45rem', display: 'block', textTransform: 'uppercase', opacity: 0.8 }}>
                ELITE PRO CARD
              </Typography>
            </Box>
          </Box>

          {/* Luxury Content Area */}
          <Box sx={{ flex: 1, p: 4, pt: 5, display: 'flex', flexDirection: 'column', zIndex: 5, position: 'relative' }}>
            {/* Inner Border Line (Luxury Detail) */}
            <Box sx={{ width: '1px', height: '60%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)', position: 'absolute', left: 0, top: '20%' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 900, letterSpacing: 2 }}>REPRESENTING CLUB</Typography>
                <Typography variant="h3" fontWeight={950} color="white" sx={{ textShadow: '0 4px 20px rgba(0,0,0,1)', lineHeight: 1 }}>{resolvedTeam.toUpperCase()}</Typography>
                {nickname && <Typography variant="h6" sx={{ color: currentTheme.primary, fontWeight: 800, mt: 0.5 }}>"{nickname}"</Typography>}
              </Box>
              <Box sx={{ 
                width: 110, height: 110, // Fixed size for consistency
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                p: 1, borderRadius: 4, 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)'
              }}>
                <Box component="img" src={teamLogo} sx={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 4 }}>
              {[
                { label: "TROPHIES", val: totalTrophies, icon: <EmojiEvents sx={{ color: '#fbbf24' }} /> },
                { label: "VALUE", val: `${(teamValue / 1000).toFixed(1)}k`, sub: "TP", icon: <AccountBalanceWallet sx={{ color: '#10b981' }} /> },
                { label: "AVG. OVR", val: avgOvr, icon: <Star sx={{ color: '#60a5fa' }} /> },
                { label: "SQUAD", val: squadCount, icon: <Groups sx={{ color: '#818cf8' }} /> },
              ].map((stat, idx) => (
                <Grid item xs={3} key={idx}>
                  <Box sx={{ 
                    p: 2, borderRadius:3 , 
                    minWidth: 120, 
                    background: "rgba(255, 255, 255, 0.02)", 
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': { background: 'rgba(255,255,255,0.05)', transform: 'translateY(-2px)' }
                  }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1} sx={{ width: '100%' }}>
                      {stat.icon}
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 800, fontSize: '0.6rem', letterSpacing: 1 }}>{stat.label}</Typography>
                    </Box>
                    <Box display="flex" alignItems="baseline" justifyContent="center" gap={0.5} sx={{ width: '100%' }}>
                      <Typography variant="h4" fontWeight={950} color="white" sx={{ fontFamily: FONT_OUTFIT }}>{stat.val}</Typography>
                      {stat.sub && <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontSize: '0.6rem', fontWeight: 900 }}>{stat.sub}</Typography>}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ 
                color: 'white', opacity: 0.15, fontSize: '0.8rem', fontWeight: 900, 
                letterSpacing: 8, textTransform: 'uppercase' 
              }}>
                ELITE PROFESSIONAL COMPETITOR
              </Typography>
            </Box>

            <Box sx={{ mt: 'auto' }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontWeight: 900, letterSpacing: 2, mb: 1, display: 'block' }}>KEY TALENTS SHOWCASE</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {mostExpensivePlayer && (
                  <Box sx={{ flex: 1 }}>
                    <PlayerMiniCard player={mostExpensivePlayer} label="MOST VALUABLE" value={`${(mostExpensivePlayer.pricePaid || 0).toLocaleString()} TP`} color="#10b981" icon={<MonetizationOn sx={{ fontSize: 14 }} />} />
                  </Box>
                )}
                {highestOvrPlayer && (
                  <Box sx={{ flex: 1 }}>
                    <PlayerMiniCard player={highestOvrPlayer} label="HIGHEST OVERALL" value={`${highestOvrPlayer.playerOvr || 0} OVR`} color="#60a5fa" icon={<TrendingUp sx={{ fontSize: 14 }} />} />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Club Watermark Logo (Luxury Deep Layer) */}
            <Box component="img" src={teamLogo} sx={{ 
              position: 'absolute', bottom: -80, right: -60, width: 450, height: 450, 
              opacity: 0.03, pointerEvents: 'none', zIndex: -1, 
              filter: 'grayscale(1) brightness(2)',
              transform: 'rotate(-25deg)' // Tilted up from bottom right
            }} />
          </Box>

          <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 4, background: `linear-gradient(to right, ${currentTheme.primary}, ${currentTheme.accent})` }} />
        </Box>
      </Box>
      
      <Box sx={{ py: 1.5, textAlign: 'center', zIndex: 1 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.1)', fontWeight: 800, letterSpacing: 2, fontSize: '0.55rem' }}>OFFICIAL ETPL ECOSYSTEM</Typography>
      </Box>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        body { overflow: hidden; }
      `}</style>
    </Box>
  );
};

export default ProfilePage;
