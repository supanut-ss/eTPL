import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  alpha,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Divider,
  Fade,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  WorkspacePremium as MedalIcon,
  AutoAwesome,
  Search,
  MilitaryTech,
  History,
  Stars,
} from "@mui/icons-material";
import { getLogoUrl } from "../utils/imageUtils";

// Extended Mock Data for better grouping demonstration
const MOCK_HALL_OF_FAME = [
  {
    id: "league-d1",
    title: "League Champions",
    subtitle: "D1 Division · Top Tier",
    icon: <TrophyIcon sx={{ fontSize: 24, color: "#FFD700" }} />,
    color: "#fbbf24",
    winners: [
      { season: "Season 5", winner: "RREEF", team: "AZ ALKMAAR", runnerUp: "Viper" },
      { season: "Season 4", winner: "Alice", team: "FC Porto", runnerUp: "Bob" },
      { season: "Season 3", winner: "Zlatan", team: "Milan", runnerUp: "Rooney" },
      { season: "Season 2", winner: "Messi", team: "Barcelona", runnerUp: "CR7" },
      { season: "Season 1", winner: "RREEF", team: "Santos", runnerUp: "Pele" },
    ],
  },
  {
    id: "cup-tpl",
    title: "eTPL Cup",
    subtitle: "Major Domestic Cup",
    icon: <MedalIcon sx={{ fontSize: 24, color: "#6366f1" }} />,
    color: "#6366f1",
    winners: [
      { season: "Season 5", winner: "Viper", team: "Man City", runnerUp: "RREEF" },
      { season: "Season 4", winner: "Charlie", team: "Inter", runnerUp: "Alice" },
      { season: "Season 3", winner: "Rooney", team: "Man Utd", runnerUp: "Zlatan" },
      { season: "Season 2", winner: "TPL_HZ1", team: "Bayern", runnerUp: "RREEF" },
      { season: "Season 1", winner: "RREEF", team: "Palmeiras", runnerUp: "Viper" },
    ],
  },
  {
    id: "euro-elite",
    title: "Elite Champions",
    subtitle: "Cross-platform Tournament",
    icon: <AutoAwesome sx={{ fontSize: 24, color: "#818cf8" }} />,
    color: "#818cf8",
    winners: [
      { season: "Season 5", winner: "RREEF", team: "AZ ALKMAAR", runnerUp: "Alice" },
      { season: "Season 4", winner: "Zlatan", team: "Milan", runnerUp: "Viper" },
    ],
  },
];
const LegendCard = ({ legend }) => {
  const theme = useTheme();
  
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: 6,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        // Royal Indigo Frost Gradient (Rich but not dark)
        background: `linear-gradient(165deg, #fff 0%, #f1f5f9 40%, #e2e8f0 100%)`, 
        border: "1.5px solid #d4af37", // Solid Champagne Gold Border
        transition: "all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "&::before": { // Golden Shimmer Ray (เงาวิ่งสีทอง)
            content: '""',
            position: "absolute",
            top: 0,
            left: "-150%",
            width: "50%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)",
            transform: "skewX(-25deg)",
            animation: "shimmerRay 6s infinite linear",
            zIndex: 1,
        },
        "@keyframes shimmerRay": {
            "0%": { left: "-150%" },
            "30%": { left: "-150%" },
            "100%": { left: "150%" }
        },
        "&:hover": {
          transform: "translateY(-12px)",
          boxShadow: `0 35px 70px -15px ${alpha("#0f172a", 0.2)}, 0 0 30px ${alpha("#d4af37", 0.15)}`,
          borderColor: "#b45309",
          "& .halo-ring": { transform: "rotate(180deg)", opacity: 1, borderColor: "#b45309" },
          "& .total-badge": { transform: "translateY(-6px) scale(1.1)", background: "linear-gradient(135deg, #d4af37 0%, #b45309 100%)", color: "#fff" }
        },
      }}
    >
      {/* Trophy Count Badge (Elevated Gold) */}
      <Box
        className="total-badge"
        sx={{
          position: "absolute",
          top: 15,
          right: 15,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#d4af37",
          px: 1.8,
          py: 0.7,
          borderRadius: "10px",
          fontSize: 12,
          fontWeight: 950,
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          border: "1px solid #d4af37",
          transition: "all 0.4s ease"
        }}
      >
        <TrophyIcon sx={{ fontSize: 16, color: "inherit" }} />
        {legend.totalTitles}
      </Box>

      <CardContent sx={{ p: 2.5, pt: 4, flexGrow: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
        {/* Avatar Section */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", mb: 2.5 }}>
          <Box sx={{ position: "relative", mb: 1.5 }}>
            <Box 
              className="halo-ring"
              sx={{ 
                position: "absolute", 
                top: -10, 
                left: -10, 
                right: -10, 
                bottom: -10, 
                borderRadius: "50%", 
                border: "2px dashed", 
                borderColor: alpha("#d4af37", 0.4),
                opacity: 0.25,
                transition: "all 1s ease",
              }} 
            />
            <Avatar
              src={getLogoUrl(legend.latestTeam)}
              sx={{
                width: 80,
                height: 80,
                bgcolor: "white",
                p: 1.2,
                border: "3px solid #d4af37",
                boxShadow: "0 15px 30px rgba(0,0,0,0.1)",
                position: "relative",
                zIndex: 2,
              }}
            />
            {legend.totalTitles >= 3 && (
              <Box 
                sx={{ 
                  position: "absolute", 
                  bottom: -2, 
                  right: -2, 
                  bgcolor: "#d4af37", 
                  borderRadius: "50%", 
                  p: 0.7,
                  display: "flex",
                  boxShadow: "0 8px 16px rgba(212, 175, 55, 0.4)",
                  zIndex: 3,
                  animation: "bounce 2s infinite"
                }}
              >
                <Stars sx={{ fontSize: 20, color: "white" }} />
              </Box>
            )}
          </Box>
          
          <Typography variant="h6" fontWeight={1000} sx={{ letterSpacing: -0.8, color: "#1e293b", lineHeight: 1.1, mb: 0.5 }}>
            {legend.name}
          </Typography>
          <Typography variant="caption" sx={{ letterSpacing: 2, color: "#b45309", fontWeight: 1000, textTransform: "uppercase", fontSize: 10 }}>
             Royal Legend
          </Typography>
        </Box>

        <Divider sx={{ mb: 2.5, borderColor: alpha("#000", 0.05) }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {Object.entries(legend.groups).map(([type, data], idx) => (
            <Box 
              key={idx}
              sx={{ 
                p: 1.8,
                borderRadius: 4,
                background: `linear-gradient(135deg, #ffffff 0%, ${alpha(data.color, 0.03)} 100%)`,
                border: "1px solid",
                borderColor: alpha("#000", 0.04),
                position: "relative",
                transition: "all 0.4s ease",
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                "&:hover": {
                    transform: "translateY(-3px)",
                    borderColor: alpha(data.color, 0.2),
                    boxShadow: `0 12px 24px ${alpha(data.color, 0.08)}`,
                    "& .medallion": { transform: "scale(1.1) rotate(5deg)", bgcolor: "#1e293b", color: data.color }
                }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.2 }}>
                {/* Medallion Icon */}
                <Box 
                  className="medallion"
                  sx={{ 
                    width: 34,
                    height: 34,
                    borderRadius: "10px", 
                    bgcolor: alpha(data.color, 0.1), 
                    color: data.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.4s ease",
                    border: `1px solid ${alpha(data.color, 0.2)}`
                  }}
                >
                  {type.includes("League") ? <TrophyIcon sx={{ fontSize: 18 }} /> : <MedalIcon sx={{ fontSize: 18 }} />}
                </Box>
                <Typography variant="caption" fontWeight={950} color="text.primary" sx={{ fontSize: 12.5, letterSpacing: 0.2, color: "#1e293b" }}>
                  {type}
                </Typography>
              </Box>
              
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                {data.seasons.map((season) => (
                  <Chip
                    key={season}
                    label={season}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: 10,
                      fontWeight: 900,
                      bgcolor: "white",
                      border: "1px solid",
                      borderColor: alpha("#000", 0.06),
                      color: "#1e293b",
                      borderRadius: "6px",
                      "& .MuiChip-label": { px: 1.5 },
                      "&:hover": { borderColor: data.color, color: data.color }
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};


const HallOfFamePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchTerm, setSearchTerm] = useState("");

  // Statistics calculation for Stats Bar
  const stats = useMemo(() => {
    let totalWinners = 0;
    let totalSeasons = 0;
    const uniqueChampions = new Set();
    
    MOCK_HALL_OF_FAME.forEach(cat => {
      totalWinners += cat.winners.length;
      totalSeasons = Math.max(totalSeasons, cat.winners.length);
      cat.winners.forEach(w => uniqueChampions.add(w.winner));
    });

    return {
      totalSeasons,
      totalTitles: totalWinners,
      uniqueLegends: uniqueChampions.size
    };
  }, []);

  // Pivot Data to Legend-centric (Manager view)
  const legendsData = useMemo(() => {
    const legends = {};
    
    MOCK_HALL_OF_FAME.forEach(cat => {
      cat.winners.forEach(w => {
        if (!legends[w.winner]) {
          legends[w.winner] = { 
            name: w.winner, 
            latestTeam: w.team, 
            totalTitles: 0,
            groups: {} 
          };
        }
        
        const legend = legends[w.winner];
        legend.totalTitles += 1;
        
        if (!legend.groups[cat.title]) {
          legend.groups[cat.title] = {
            color: cat.color,
            seasons: []
          };
        }
        legend.groups[cat.title].seasons.push(w.season);
      });
    });

    // Convert to array and sort by total titles
    const sortedLegends = Object.values(legends).sort((a, b) => b.totalTitles - a.totalTitles);
    
    if (!searchTerm) return sortedLegends;

    return sortedLegends.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.keys(l.groups).some(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm]);

  return (
    <Box sx={{ 
      position: 'relative', 
      minHeight: '100vh', 
      bgcolor: '#fcfcfd',
      overflow: 'hidden',
      pb: 10 
    }}>
      {/* Mesh Gradient Background Elements */}
      <Box sx={{ 
          position: 'absolute', 
          top: -150, 
          right: -50, 
          width: 500, 
          height: 500, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(255,255,255,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
      }} />
      <Box sx={{ 
          position: 'absolute', 
          bottom: 100, 
          left: -100, 
          width: 400, 
          height: 400, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.03) 0%, rgba(255,255,255,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
      }} />

      <Fade in={true} timeout={600}>
        <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 1, md: 2 } }}>
          {/* Top Header Section */}
          <Box sx={{ 
            display: "flex", 
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between", 
            alignItems: isMobile ? "flex-start" : "center", 
            gap: 2,
            mb: 3
          }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <MilitaryTech color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h5" fontWeight="950" sx={{ letterSpacing: -0.5 }}>Hall of Fame</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>
                  PERSON-CENTRIC LEGEND BOARD
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Luxury Prestige Sub-Header (Theme Based) */}
          <Fade in={true} timeout={1200}>
            <Box 
              sx={{ 
                mb: 5, 
                position: 'relative',
                p: { xs: 2.5, md: 3.5 },
                borderRadius: '32px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
                boxShadow: '0 30px 100px rgba(15, 23, 42, 0.4)',
                border: '2px solid',
                borderColor: '#fbbf24', // Strong Gold Border
                overflow: 'hidden',
                textAlign: 'center',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-150%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.15), transparent)',
                  transform: 'skewX(-20deg)',
                  animation: 'shimmerGold 6s infinite linear',
                },
                '@keyframes shimmerGold': {
                  '0%': { left: '-150%' },
                  '100%': { left: '150%' }
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#fbbf24', 
                    fontWeight: 900, 
                    letterSpacing: 8, 
                    textTransform: 'uppercase',
                    display: 'block',
                    mb: 2,
                    fontSize: { xs: 10, md: 12 },
                    textShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
                  }}
                >
                  PRESTIGE COLLECTIVE
                </Typography>
                
                <Typography 
                  variant={isMobile ? "h5" : "h4"} 
                  fontWeight={950} 
                  sx={{ 
                    color: '#fff',
                    letterSpacing: -1,
                    mb: 2.5,
                    lineHeight: 1.1,
                    '& span': { color: '#fbbf24' }
                  }}
                >
                  The Golden Legacy <br/>
                  <Box component="span">of eTPL Champions</Box>
                </Typography>

                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    flexWrap: 'wrap', 
                    gap: { xs: 3, md: 8 },
                    mt: 2
                  }}
                >
                  <Box>
                    <Typography variant="h3" fontWeight={950} color="#fbbf24" sx={{ mb: 0.5 }}>{stats.totalSeasons}</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.5)" fontWeight={800} sx={{ letterSpacing: 2 }}>YEARS OF GLORY</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(251, 191, 36, 0.2)', borderStyle: 'solid', display: { xs: 'none', md: 'block' } }} />
                  <Box>
                    <Typography variant="h3" fontWeight={950} sx={{ color: 'white', mb: 0.5 }}>{stats.totalTitles}</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.5)" fontWeight={800} sx={{ letterSpacing: 2 }}>TITLES WON</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(251, 191, 36, 0.2)', borderStyle: 'solid', display: { xs: 'none', md: 'block' } }} />
                  <Box>
                    <Typography variant="h3" fontWeight={950} sx={{ color: 'white', mb: 0.5 }}>{stats.uniqueLegends}</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.5)" fontWeight={800} sx={{ letterSpacing: 2 }}>ETERNAL LEGENDS</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Fade>

          {/* Legends Grid */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Stars sx={{ color: '#fbbf24' }} />
            <Typography variant="h6" fontWeight="950" sx={{ letterSpacing: -0.5 }}>ACTIVE LEGENDS</Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: { xs: 2.5, md: 3 },
            }}
          >
            {legendsData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10, gridColumn: "1 / -1" }}>
                <History sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
                <Typography variant="h6" color="text.disabled">No managers found matching "{searchTerm}"</Typography>
              </Box>
            ) : (
              legendsData.map((legend, idx) => (
                <LegendCard 
                  key={legend.name} 
                  legend={legend} 
                />
              ))
            )}
          </Box>
        </Box>
      </Fade>
    </Box>
  );
};

export default HallOfFamePage;
