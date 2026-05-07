import { memo } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Skeleton,
  Box,
  Typography,
  Link,
  ButtonBase,
} from "@mui/material";
import { Campaign, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";
import { getAnnouncementImageUrl } from "../../../utils/imageUtils";

const EventUpdateBox = memo(({ announcements, loading }) => {
  const navigate = useNavigate();
  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 2 }} />
    );

  if (!announcements || announcements.length === 0) return null;

  const list = announcements.slice(0, 10);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "transparent",
      }}
    >
      <SectionHeader
        icon={<Campaign sx={{ fontSize: 18 }} />}
        title="Event Updates"
        color="#0ea5e9"
        action={
          <Link 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate("/news", { state: { tab: 2 } }); }}
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
              "&:hover": { color: "#38bdf8" }
            }}
          >
            VIEW ALL <ChevronRight sx={{ fontSize: 14 }} />
          </Link>
        }
      />

      <Box sx={{ 
        flex: 1, // Fill available vertical space
        display: "flex", 
        flexDirection: "column", 
        p: 0, 
        overflowY: "auto",
        "&::-webkit-scrollbar": { display: "none" },
        msOverflowStyle: "none",
        scrollbarWidth: "none"
      }}>
        {list.map((item, idx) => (
          <ButtonBase
            key={idx}
            component={RouterLink}
            to="/news"
            state={{ tab: 2 }}
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: 2,
              px: 2,
              width: "100%",
              height: 100,
              borderRadius: 2,
              transition: "all 0.2s ease",
              borderBottom: idx !== list.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" }
            }}
          >
            <Box
              sx={{
                width: 125, // Reduced from 140
                height: 80, // Reduced from 90
                borderRadius: 1.5,
                overflow: "hidden",
                flexShrink: 0,
                bgcolor: "rgba(0,0,0,0.05)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}
            >
              <Box
                component="img"
                src={getAnnouncementImageUrl(item.imageUrl)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200";
                }}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{
                  color: "#0f172a",
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  fontSize: 14 // Slightly larger font
                }}
              >
                {item.announcement}
              </Typography>
            </Box>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
});

export default EventUpdateBox;
