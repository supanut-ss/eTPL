import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Button,
} from "@mui/material";
import { Close, Language, Favorite } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import HandshakeIcon from "@mui/icons-material/Handshake";
import { panelSx } from "./shared/designTokens";
import { getSponsors } from "../../../api/sponsorApi";

const isImageUrl = (url) => {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.match(/\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i)
  );
};

const SponsorMarquee = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [loveCount, setLoveCount] = useState(124);
  const [loveClicked, setLoveClicked] = useState(false);

  useEffect(() => {
    getSponsors()
      .then((res) => {
        setSponsors(res.data.data || res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load sponsors", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSponsorClick = (sponsor) => {
    setSelectedSponsor(sponsor);
    // Generate a random appreciation count for fun and demo purposes
    setLoveCount(Math.floor(Math.random() * 200) + 120);
    setLoveClicked(false);
  };

  const handleClose = () => {
    setSelectedSponsor(null);
  };

  const handleLoveClick = (e) => {
    e.stopPropagation();
    if (loveClicked) return;
    setLoveCount((prev) => prev + 1);
    setLoveClicked(true);

    // Call canvas-confetti if it exists in the window scope
    if (window.confetti) {
      window.confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: [selectedSponsor?.brandColor || "#6366f1", "#cbd5e1", "#ec4899", "#ffb020"],
      });
    }
  };

  if (loading || sponsors.length === 0) {
    return null; // Avoid showing blank marquee while loading or if empty
  }

  // Duplicate list to ensure infinite smooth marquee scroll
  const marqueeSponsors = [...sponsors, ...sponsors];

  return (
    <Box sx={{ ...panelSx, p: 0, mb: 3, overflow: "hidden", position: "relative" }}>
      {/* CSS Styles for Infinite Scrolling Marquee */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 60s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Section Header with handshake icon */}
      <SectionHeader
        icon={<HandshakeIcon />}
        title="Community Supporters"
        color="#94a3b8"
      />

      {/* Marquee Outer Container */}
      <Box
        sx={{
          py: 2.5,
          px: 1,
          overflow: "hidden",
          width: "100%",
          position: "relative",
          background: "linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(248,250,252,0.4) 100%)",
          display: "flex",
          alignItems: "center",
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            width: { xs: 30, sm: 80 },
            zIndex: 2,
            pointerEvents: "none",
          },
          "&::before": {
            left: 0,
            background: "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0) 100%)",
          },
          "&::after": {
            right: 0,
            background: "linear-gradient(270deg, #ffffff 0%, rgba(255,255,255,0) 100%)",
          },
        }}
      >
        <div className="marquee-track">
          {marqueeSponsors.map((sponsor, index) => (
            <Box
              key={`${sponsor.id}-${index}`}
              onClick={() => handleSponsorClick(sponsor)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 160,
                height: 90,
                mx: 3,
                px: 3,
                py: 1.5,
                borderRadius: "16px",
                border: "none",
                background: "rgba(255, 255, 255, 0.9)",
                cursor: "pointer",
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 2px 16px -4px rgba(0, 0, 0, 0.10), 0 1px 4px -2px rgba(0,0,0,0.06)",
                userSelect: "none",
                "&:hover": {
                  transform: "translateY(-5px) scale(1.03)",
                  boxShadow: `0 12px 32px -8px ${sponsor.brandColor}55, 0 4px 12px -4px rgba(0,0,0,0.08)`,
                  background: "#ffffff",
                  "& .sponsor-marquee-logo": {
                    transform: "scale(1.08)",
                  },
                },
              }}
            >
              <Box sx={{ 
                height: 42, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                mb: 0.8
              }}>
                {isImageUrl(sponsor.logo) ? (
                  <Box
                    component="img"
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className="sponsor-marquee-logo"
                    sx={{
                      height: "100%",
                      width: "auto",
                      maxWidth: 110,
                      objectFit: "contain",
                      transition: "transform 0.3s ease",
                    }}
                  />
                ) : (
                  <Typography
                    className="sponsor-marquee-logo"
                    sx={{
                      fontSize: "1.8rem",
                      transition: "transform 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {sponsor.logo}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.65rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                  textAlign: "center",
                  mt: 0.5
                }}
              >
                {sponsor.name}
              </Typography>
            </Box>
          ))}
        </div>
      </Box>

      {/* PREMIUM GLASSMORPHIC SPONSOR BANNER DIALOG */}
      <Dialog
        open={Boolean(selectedSponsor)}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            overflow: "hidden",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.25)",
          },
        }}
      >
        {selectedSponsor && (
          <DialogContent sx={{ p: 3, position: "relative" }}>
            <IconButton
              onClick={handleClose}
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                color: "#64748b",
                bgcolor: "rgba(15,23,42,0.04)",
                zIndex: 3,
                "&:hover": {
                  bgcolor: "rgba(15,23,42,0.08)",
                  color: "#0f172a",
                },
              }}
            >
              <Close sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Dynamic CSS Banner Mockup */}
            <Box
              sx={{
                background: selectedSponsor.bannerBg,
                borderRadius: "16px",
                p: 3.5,
                position: "relative",
                overflow: "hidden",
                color: "#ffffff",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)",
                mb: 3,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: 140,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  filter: "blur(20px)",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: -30,
                  left: "60%",
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  filter: "blur(15px)",
                }}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 2.2, zIndex: 1 }}>
                <Box
                  sx={{
                    fontSize: "2.5rem",
                    width: 60,
                    height: 60,
                    borderRadius: "14px",
                    bgcolor: "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.25)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {isImageUrl(selectedSponsor.logo) ? (
                    <Box
                      component="img"
                      src={selectedSponsor.logo}
                      alt={selectedSponsor.name}
                      sx={{
                        width: 44,
                        height: 44,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    selectedSponsor.logo
                  )}
                </Box>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: "rgba(255,255,255,0.72)",
                      fontWeight: 800,
                      letterSpacing: 2,
                      fontSize: 9,
                      lineHeight: 1,
                      display: "block",
                      mb: 0.5,
                    }}
                  >
                    COMMUNITY SPONSOR
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.1,
                    }}
                  >
                    {selectedSponsor.name}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ px: 1, mb: 3.5 }}>
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{ color: selectedSponsor.brandColor, mb: 1, letterSpacing: 0.2 }}
              >
                {selectedSponsor.tagline}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#475569",
                  lineHeight: 1.6,
                  fontSize: 13,
                }}
              >
                {selectedSponsor.description}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                pt: 2.5,
                borderTop: "1px solid rgba(15, 23, 42, 0.06)",
              }}
            >
              {selectedSponsor.hasBanner ? (
                <Button
                  variant="text"
                  onClick={handleLoveClick}
                  startIcon={
                    <Favorite
                      sx={{
                        color: loveClicked ? "#ef4444" : "#cbd5e1",
                        transform: loveClicked ? "scale(1.2)" : "scale(1)",
                        transition: "all 0.3s ease",
                      }}
                    />
                  }
                  sx={{
                    color: loveClicked ? "#ef4444" : "#64748b",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 12.5,
                    borderRadius: "10px",
                    px: 1.5,
                    bgcolor: loveClicked ? "rgba(239,68,68,0.06)" : "transparent",
                    "&:hover": {
                      bgcolor: "rgba(15,23,42,0.03)",
                    },
                  }}
                >
                  {loveCount}
                </Button>
              ) : (
                <Box />
              )}

              <Button
                variant="contained"
                href={selectedSponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<Language />}
                sx={{
                  bgcolor: selectedSponsor.brandColor,
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: "12px",
                  px: 2.5,
                  py: 1,
                  fontSize: 12.5,
                  boxShadow: `0 8px 20px -6px ${selectedSponsor.brandColor}`,
                  "&:hover": {
                    bgcolor: selectedSponsor.brandColor,
                    transform: "translateY(-2px)",
                    boxShadow: `0 12px 25px -6px ${selectedSponsor.brandColor}`,
                  },
                }}
              >Website
              </Button>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
};

export default SponsorMarquee;
