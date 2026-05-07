import { keyframes } from "@mui/material";
import { alpha } from "@mui/material/styles";

export const extractPlayer = (team) => {
  if (!team) return "";
  const match = team.match(/\(([^)]+)\)/);
  return match ? match[1] : team;
};

export const extractTeam = (team) => {
  if (!team) return "";
  return team.replace(/\s*\([^)]+\)/, "").trim();
};

export const formatMatchDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

export const dealCard = keyframes`
  0% { transform: translateY(120px) rotate(25deg) scale(0.2); opacity: 0; filter: blur(15px); }
  60% { transform: translateY(-20px) rotate(-5deg) scale(1.05); opacity: 1; filter: blur(0); }
  100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
`;

export const shine = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const goldGlow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4)); }
  50% { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4)); }
`;

export const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 113, 133, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(251, 113, 133, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 113, 133, 0); }
`;

export const pulseOutline = keyframes`
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
`;

export const DESIGN_TOKENS = {
  background: "#ffffff",
  glowA: "rgba(79, 70, 229, 0.04)",
  glowB: "rgba(56, 189, 248, 0.03)",
  shell:
    "linear-gradient(145deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 1) 100%)",
  glass: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)",
  glassSoft: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.8) 100%)",
  border: "rgba(255, 255, 255, 0.5)", // Brighter rim light
  borderStrong: "rgba(255, 255, 255, 0.8)",
  shadow: "0 10px 30px -15px rgba(15, 23, 42, 0.1), inset 0 0 10px rgba(255,255,255,0.5)",
};

export const panelSx = {
  p: 3, 
  borderRadius: 3,
  overflow: "hidden",
  border: "1px solid",
  borderColor: DESIGN_TOKENS.border,
  background: DESIGN_TOKENS.glass,
  backdropFilter: "blur(30px)", // Increased blur for more "glossy" depth
  boxShadow: DESIGN_TOKENS.shadow,
  transition:
    "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
  "&:hover": {
    boxShadow: "0 20px 42px -24px rgba(15, 23, 42, 0.2)",
    borderColor: DESIGN_TOKENS.borderStrong,
  },
};

export const DASHBOARD_ROW_HEIGHT = 56;
