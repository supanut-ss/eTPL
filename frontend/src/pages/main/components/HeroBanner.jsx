import { useState, useEffect, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  ButtonBase,
} from "@mui/material";
import {
  getAnnouncementImageUrl,
} from "../../../utils/imageUtils";
import { 
  DESIGN_TOKENS, 
  formatMatchDate 
} from "./shared/designTokens";

const HeroBanner = ({ announcements }) => {
  const [index, setIndex] = useState(0);

  const displayAnnouncements = useMemo(() => (announcements || []).slice(0, 5), [announcements]);

  useEffect(() => {
    setIndex(0);
  }, [announcements]);

  useEffect(() => {
    if (displayAnnouncements.length <= 1) return undefined;

    const timerId = setInterval(() => {
      setIndex((prev) => (prev + 1) % displayAnnouncements.length);
    }, 4500);

    return () => clearInterval(timerId);
  }, [displayAnnouncements]);

  const activeAnnouncement = displayAnnouncements[index] || null;

  return (
    <ButtonBase
      component={RouterLink}
      to="/news"
      state={{ tab: 0 }}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        display: "block",
        width: "100%",
        height: { xs: 240, md: 600 },
        border: "1px solid",
        borderColor: DESIGN_TOKENS.border,
        boxShadow: DESIGN_TOKENS.shadow,
        transition: "transform 0.3s ease",
        "&:hover": { 
          transform: "translateY(-4px)",
          borderColor: "secondary.main",
        },
        "&:hover .news-image": { transform: "scale(1.05)" },
      }}
    >
      {/* Layered Images for Smooth Cross-fade */}
      {(displayAnnouncements.length > 0 ? displayAnnouncements : [{ imageUrl: null }]).map((ann, i) => (
        <Box
          key={ann.id || i}
          component="img"
          className="news-image"
          src={ann.imageUrl 
            ? getAnnouncementImageUrl(ann.imageUrl) 
            : "https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&q=80&w=1600"}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1551288049-bbbda546697a?auto=format&fit=crop&q=80&w=1600";
          }}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: i === index ? 1 : 0,
            transition: "opacity 1.5s ease-in-out, transform 8s linear",
            zIndex: i === index ? 1 : 0,
            transform: i === index ? "scale(1.05)" : "scale(1)",
          }}
        />
      ))}
      
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.4) 40%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Slider Dots */}
      {displayAnnouncements.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 10,
            display: "flex",
            gap: 0.8,
          }}
        >
          {displayAnnouncements.map((_, idx) => (
            <Box
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(idx);
              }}
              sx={{
                width: idx === index ? 10 : 10,
                height: 10,
                borderRadius: "50%",
                bgcolor:
                  idx === index
                    ? "secondary.main"
                    : "rgba(255,255,255,0.3)",
                border: idx === index ? "2px solid #fff" : "none",
                boxShadow: idx === index ? "0 0 10px rgba(255,255,255,0.5)" : "none",
                cursor: "pointer",
                transition: "0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": { transform: "scale(1.2)", bgcolor: "secondary.light" }
              }}
            />
          ))}
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          p: { xs: 3, md: 5 },
          pt: { md: 3 }, // More space from the top of the text
          zIndex: 2,
          background: "linear-gradient(to top, rgba(2, 6, 23, 0.6) 0%, transparent 70%)",
          backdropFilter: "blur(6px)",
          borderTop: "0px solid rgba(255,255,255,0.1)",
        }}
      >
        <Typography
          variant="h3"
          fontWeight={1000}
          color="white"
          sx={{
            mb: 2,
            fontSize: { xs: "1.4rem", md: "2.2rem" },
            lineHeight: 1.05,
            letterSpacing: -1,
            textShadow: "0 8px 24px rgba(0,0,0,0.6)",
            maxWidth: "90%",
          }}
        >
          {activeAnnouncement?.announcement?.split("\n")[0] ||
            "The Season Begins"}
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.85)",
              fontWeight: 800,
              fontSize: 8,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {activeAnnouncement?.announcer || "E-TPL News"}
          </Typography>
          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.3)" }} />
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.5)",
              fontWeight: 700,
              fontSize: 8,
            }}
          >
            {formatMatchDate(activeAnnouncement?.createDate) || "TODAY"}
          </Typography>
        </Box>
      </Box>
    </ButtonBase>
  );
};

export default HeroBanner;
