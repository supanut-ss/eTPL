import { Link as RouterLink } from "react-router-dom";
import {
  Skeleton,
  Box,
  Typography,
  Avatar,
  IconButton,
  Link,
} from "@mui/material";
import { Groups, ChevronLeft, ChevronRight } from "@mui/icons-material";
import SectionHeader from "./shared/SectionHeader";

const ActiveMemberBox = ({ visibleMembers, loading, currentIndex, totalCount, pageSize, onPageChange }) => {
  if (loading)
    return (
      <Skeleton variant="rectangular" height="100%" sx={{ borderRadius: 4 }} />
    );

  const pageCount = Math.ceil(totalCount / pageSize);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        icon={<Groups sx={{ fontSize: 18 }} />}
        title="Active Member"
        color="#0d9488"
        action={
          <Link
            component={RouterLink}
            to="/members"
            sx={{
              fontSize: 10,
              fontWeight: 800,
              color: "#0d9488",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            View All
          </Link>
        }
      />
      <Box sx={{ flex: "0 0 255px", py: 0.5, overflow: "hidden" }}>
        {visibleMembers.map((member, idx) => (
          <Box
            key={idx}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              py: 1,
              minHeight: 60,
              bgcolor: idx % 2 === 0 ? "transparent" : "rgba(15, 23, 42, 0.02)", // Extremely subtle neutral slate for alternating rows
              transition: "all 0.2s ease",
              "&:hover": { 
                bgcolor: "rgba(15, 23, 42, 0.05)", 
                px: 3.5 
              },
            }}
          >
            <Avatar
              src={member.linePic}
              sx={{ width: 44, height: 44, border: "1px solid #e2e8f0" }}
            >
              <Groups sx={{ fontSize: 22 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ color: "#0f172a" }}
                noWrap
              >
                {member.lineName || "Manager"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 9 }}>
                {member.userId}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Progress dots */}
      <Box sx={{ mt: "auto", display: "flex", gap: 1, justifyContent: "center", pb: 3 }}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <Box
            key={i}
            onClick={() => onPageChange(i)}
            sx={{
              width: i === currentIndex ? 20 : 6,
              height: 4,
              borderRadius: 2,
              bgcolor: i === currentIndex ? "#0d9488" : "rgba(15, 23, 42, 0.1)",
              transition: "all 0.5s ease",
              cursor: "pointer",
              "&:hover": { bgcolor: "rgba(13, 148, 136, 0.4)" },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ActiveMemberBox;
