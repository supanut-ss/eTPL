import { cloneElement } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const SectionHeader = ({ icon, title, color = "#4f46e5", action }) => (
  <Box
    display="flex"
    alignItems="center"
    px={2.5}
    py={1.8}
    sx={{
      background:
        "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.95) 100%)",
      borderBottom: "1px solid",
      borderColor: "rgba(15, 23, 42, 0.05)",
      position: "relative",
      "&::before": {
        content: '""',
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 2.5,
        background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.3)} 100%)`,
      },
    }}
  >
    <Box sx={{ color: color, mr: 1.5, display: "flex", alignItems: "center" }}>
      {cloneElement(icon, { sx: { fontSize: 22 } })}
    </Box>
    <Typography
      fontWeight={1000}
      fontSize={12}
      color={color}
      sx={{
        letterSpacing: 1.2,
        textTransform: "uppercase",
        flex: 1,
        opacity: 0.9,
      }}
    >
      {title}
    </Typography>
    {action && <Box sx={{ ml: 1 }}>{action}</Box>}
  </Box>
);

export default SectionHeader;
