import { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Skeleton,
  Link,
  ButtonBase,
} from "@mui/material";
import { AutoAwesome, ChevronRight } from "@mui/icons-material";
import { getAnnouncementImageUrl } from "../../../utils/imageUtils";
import SectionHeader from "./shared/SectionHeader";

const AiMagazineBox = ({ magazineData, loading }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Only reset index if the number of items decreased and current index is out of bounds
    if (magazineData && index >= magazineData.length) {
      setIndex(0);
    }
    
    if (!magazineData || magazineData.length <= 1) return undefined;
    
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % magazineData.length);
    }, 4000); // Speed up to 4 seconds
    return () => clearInterval(interval);
  }, [magazineData?.length, magazineData]); // Track length changes

  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  if (!magazineData || magazineData.length === 0) return null;

  const active = magazineData[index] || magazineData[0];
  if (!active) return null;

  return (
    <ButtonBase
      component={RouterLink}
      to="/news"
      state={{ tab: 1 }}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: "100%",
        height: "100%",
        minHeight: 340, 
        bgcolor: "transparent",
        borderRadius: 2,
        overflow: "hidden",
        textAlign: "left",
        "&:hover": { bgcolor: "rgba(0,0,0,0.02)" }
      }}
    >
      <SectionHeader 
        icon={<AutoAwesome sx={{ fontSize: 18 }} />} 
        title="AI Magazine" 
        color="#a855f7" 
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/news", { state: { tab: 1 } }); }}
            underline="none"
            sx={{ 
              fontSize: 10, 
              fontWeight: 800, 
              color: "rgba(100, 116, 139, 0.6)",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              textTransform: "uppercase",
              letterSpacing: 1,
              "&:hover": { color: "#a855f7" }
            }}
          >
            View All <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />
      {/* Image Area */}
      <Box sx={{ width: "100%", overflow: "hidden", position: "relative", aspectRatio: "16 / 9" }}>
        {/* Layered Images for Smooth Transition */}
        {magazineData.map((item, i) => (
          <Box
            key={item.id || i}
            component="img"
            src={getAnnouncementImageUrl(item.imageUrl)}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800";
            }}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: i === index ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
              zIndex: i === index ? 1 : 0,
            }}
          />
        ))}

        {/* Dots removed from here */}
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <Box>
          <Typography
            key={`title-${index}`}
            variant="subtitle2"
            fontWeight={1000}
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              color: "#0f172a",
              lineHeight: 1.3,
              fontSize: { xs: 13, md: 15 },
              letterSpacing: -0.2,
              animation: "fadeIn 0.8s ease-in-out",
            }}
          >
            {active.announcement}
          </Typography>
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          pt={1}
        >
          <Typography
            key={`announcer-${index}`}
            variant="caption"
            sx={{
              color: "rgba(15, 23, 42, 0.5)",
              fontWeight: 800,
              fontSize: 10,
              animation: "fadeIn 0.5s ease-in-out",
            }}
          >
            {active.announcer || "E-TPL AI Editor"}
          </Typography>
          
          {/* Navigation Dots - Pill Style (Elite) */}
          {magazineData.length > 1 && (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {magazineData.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setIndex(i)}
                  sx={{
                    width: i === index ? 16 : 6,
                    height: 3,
                    borderRadius: 2,
                    bgcolor: i === index ? "#a855f7" : "rgba(15, 23, 42, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </ButtonBase>
  );
};

export default AiMagazineBox;
