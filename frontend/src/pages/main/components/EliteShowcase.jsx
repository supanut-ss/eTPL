import { useState, useEffect } from "react";
import {
  Skeleton,
  Box,
  Typography,
  Link,
} from "@mui/material";
import { AutoAwesome, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import {
  getLogoUrl,
  getPlayerFaceUrl,
  getPlayerCardUrl,
  getPlayerFaceUrlPesmaster,
  getPesdbInfoUrl,
} from "../../../utils/imageUtils";
import { dealCard } from "./shared/designTokens";

const EliteShowcaseBox = ({ elitePlayers, loading, clubs = [] }) => {
  const [index, setIndex] = useState(0);
  const displayCount = 3;
  const players = (elitePlayers || []).slice(0, 12);

  useEffect(() => {
    if (players.length <= displayCount) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + displayCount) % players.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [players.length]);

  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  // if (players.length === 0) return null; // Removed to show header even if empty

  const visiblePlayers = players.length > 0 ? players.slice(index, index + displayCount) : [];
  if (players.length > 0 && visiblePlayers.length < displayCount) {
    visiblePlayers.push(...players.slice(0, displayCount - visiblePlayers.length));
  }

  return (
    <Box 
      sx={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        position: "relative",
        background: "transparent", // Inherit glass from parent
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <SectionHeader
        icon={<AutoAwesome sx={{ fontSize: 18 }} />}
        title="Elite Showcase"
        color="#d1ad73ff"
        titleId="elite-showcase-title"
        action={
          <Link 
            href="/auction-results" 
            underline="none"
            sx={{ 
              fontSize: 10, 
              fontWeight: 800, 
              color: "rgba(100, 116, 139, 0.6)",
              letterSpacing: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              transition: "all 0.3s ease",
              "&:hover": { 
                color: "#d1ad73ff",
                transform: "translateX(3px)",
              }
            }}
          >
            VIEW DASHBOARD <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          position: "relative",
          minHeight: 280,
        }}
      >
        {players.length === 0 ? (
          <Box 
            sx={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center",
              opacity: 0.5,
              mt: -2
            }}
          >
            <AutoAwesome sx={{ fontSize: 48, mb: 1, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Elite Showcase Coming Soon
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Check back after first auctions complete
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 3, width: "100%", justifyContent: "center", px: 2 }}>
            {visiblePlayers.map((player, idx) => {
              const pId = player.playerId || player.idPlayer || player.id;
              const price = player.currentPrice || player.CurrentPrice || player.pricePaid || 0;
              const clubOwner = clubs.find(c => c.id === player.ownedByUserId || (c.currentTeam && c.currentTeam === player.teamName));
              const owner = player.highestBidderName || player.winnerName || clubOwner?.userId || "Manager";

              return (
                <Box
                  key={`${index}-${idx}`}
                  sx={{
                    animation: `${dealCard} 1s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    maxWidth: "25%",
                    position: "relative",
                  }}
                >
                  <Box
                    component="a"
                    href={getPesdbInfoUrl(pId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      position: "relative",
                      mb: 1.5,
                      p: "1.5px", 
                      borderRadius: 0, 
                      background: "linear-gradient(135deg, #fde68a 0%, #fcd34d 50%, #fde68a 100%)", 
                      display: "flex",
                      justifyContent: "center",
                      filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.15))",
                      textDecoration: "none",
                      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      "&:hover": { 
                        transform: "scale(1.08) translateY(-8px)",
                        filter: "drop-shadow(0 15px 35px rgba(251, 191, 36, 0.3))",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={getPlayerCardUrl(pId) || player.imageUrl}
                      onError={(e) => {
                        if (e.target.src.includes("/card/b")) {
                          e.target.src = e.target.src.replace("/card/b", "/card/f");
                        } else if (e.target.src.includes("/card/f")) {
                          e.target.src = e.target.src.replace("/card/f", "/card/");
                        } else if (e.target.src.includes("/card/")) {
                          e.target.src = getPlayerFaceUrl(pId);
                        } else if (e.target.src.includes("/player/")) {
                          e.target.src = getPlayerFaceUrlPesmaster(pId, "webp");
                        } else {
                          e.target.onerror = null;
                          e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/330px-No-Image-Placeholder.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20200912122019";
                          e.target.style.height = "80px";
                          e.target.style.width = "80px";
                          e.target.style.borderRadius = "50%";
                          e.target.style.objectFit = "cover";
                          e.target.style.border = "4px solid white";
                          e.target.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)";
                        }
                      }}
                      sx={{
                        height: { xs: 110, md: 135 },
                        width: "auto",
                        objectFit: "contain",
                        position: "relative",
                        zIndex: 2,
                        borderRadius: 0,
                      }}
                    />
                  </Box>

                  <Box sx={{ 
                    textAlign: "center", 
                    width: "100%",
                    minWidth: 120,
                    px: 1,
                    py: 0.5,
                    overflow: "visible",
                  }}>
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 0.8,
                      mt: 0.5
                    }}>
                      <Box 
                        sx={{ 
                          width: 18, 
                          height: 18, 
                          borderRadius: "50%", 
                          background: "linear-gradient(135deg, #fbbf24 0%, #d1ad73ff 100%)",
                          color: "white",
                          fontSize: 9,
                          fontWeight: 1000,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(255,255,255,0.4)"
                        }}
                      >
                        TP
                      </Box>
                      <Typography
                        variant="caption"
                        fontWeight={1000}
                        sx={{
                          color: "#ec830cd8",
                          fontSize: { xs: 13, md: 15 },
                          letterSpacing: 0.2,
                        }}
                      >
                        {price.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#ec830cd8",
                        fontWeight: 800,
                        fontSize: 9,
                        display: "block",
                        mt: 1,
                        letterSpacing: 1,
                        textTransform: "uppercase"
                      }}
                    >
                      {owner}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Progress dots */}
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", pb: 3 }}>
        {Array.from({ length: Math.ceil(players.length / displayCount) }).map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i * displayCount)}
            sx={{
              width: i === Math.floor(index / displayCount) ? 20 : 6,
              height: 4,
              borderRadius: 2,
              bgcolor: i === Math.floor(index / displayCount) ? "#d1ad73ff" : "rgba(15, 23, 42, 0.1)",
              transition: "all 0.5s ease",
              cursor: "pointer",
              "&:hover": { bgcolor: "#d1ad73ff" },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default EliteShowcaseBox;
