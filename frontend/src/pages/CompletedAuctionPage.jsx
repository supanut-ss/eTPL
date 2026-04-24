import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Paper,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Container,
  Divider,
  Avatar,
  Fade,
  Grow,
  keyframes,
  TextField,
  InputAdornment,
 
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { EmojiEvents, Groups, SportsSoccer, AccountBalanceWallet, History, TrendingUp, InfoOutlined, Search, SearchOff, MilitaryTech ,HotelClass } from "@mui/icons-material";
import auctionService from "../services/auctionService";
import { getPlayerCardUrl, getPlayerFaceUrl } from "../utils/imageUtils";

// --- Animations from Elite Section ---
const dealCard = keyframes`
  0% { transform: translateY(80px) rotate(15deg) scale(0.5); opacity: 0; filter: blur(10px); }
  60% { transform: translateY(-10px) rotate(-3deg) scale(1.02); opacity: 1; filter: blur(0); }
  100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
`;

const shine = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const goldGlow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4)); }
  50% { filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.7)); }
  100% { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.4)); }
`;

const CompletedAuctionPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [completedAuctions, setCompletedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [visibleCount, setVisibleCount] = useState(35);
  const [searchTerm, setSearchTerm] = useState("");
  const observer = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [auctionsRes, quotasRes] = await Promise.all([
          auctionService.getCompletedAuctions(),
          auctionService.getQuotas(),
        ]);
        
        // Sorting: TP (CurrentPrice) Desc, then OVR (PlayerOvr) Desc
        const sorted = (auctionsRes.data || []).sort((a, b) => {
          if (b.CurrentPrice !== a.CurrentPrice) {
            return b.CurrentPrice - a.CurrentPrice;
          }
          return b.PlayerOvr - a.PlayerOvr;
        });

        setCompletedAuctions(sorted);
        setGrades(quotasRes.data || []);
      } catch (err) {
        console.error("Failed to fetch completed auctions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const lastAuctionElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < completedAuctions.length) {
        setVisibleCount(prev => prev + 35);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, completedAuctions.length, visibleCount]);

  const filteredAuctions = completedAuctions
    .filter(a => a.playerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
  const displayedAuctions = filteredAuctions.slice(0, visibleCount);

  const topThree = completedAuctions.slice(0, 3);
  const remainingAuctions = searchTerm 
    ? displayedAuctions 
    : displayedAuctions.filter(a => !topThree.some(t => t.auctionId === a.auctionId));

  const getGradeStyle = (ovr) => {
    const grade = grades.find((g) => ovr >= g.minOVR && ovr <= g.maxOVR);
    if (!grade) return { label: "?", color: "#8E8E93", gradient: "linear-gradient(135deg, #8E8E93 0%, #707070 100%)" };
    
    const styles = {
      S: { color: "#ffb300", gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)" },
      A: { color: "#f4511e", gradient: "linear-gradient(135deg, #FF4500 0%, #D84315 100%)" },
      B: { color: "#8e24aa", gradient: "linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)" },
      C: { color: "#1e88e5", gradient: "linear-gradient(135deg, #2196F3 0%, #1565C0 100%)" },
      D: { color: "#43a047", gradient: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)" },
      E: { color: "#757575", gradient: "linear-gradient(135deg, #9E9E9E 0%, #424242 100%)" },
    };
    
    return { 
      label: grade.gradeName, 
      ...(styles[grade.gradeName] || { color: "#8E8E93", gradient: "linear-gradient(135deg, #8E8E93 0%, #707070 100%)" }) 
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress thickness={2} size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
        position: 'relative', 
        minHeight: '100vh', 
        bgcolor: '#fcfcfd',
        overflow: 'hidden',
        py: { xs: 1 }
    }}>
      {/* Mesh Gradient Background Elements */}
      <Box sx={{ 
          position: 'absolute', 
          top: -200, 
          right: -100, 
          width: 600, 
          height: 600, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(25, 118, 210, 0.05) 0%, rgba(255,255,255,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
      }} />
      <Box sx={{ 
          position: 'absolute', 
          bottom: -200, 
          left: -100, 
          width: 500, 
          height: 500, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(217, 119, 6, 0.03) 0%, rgba(255,255,255,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
      }} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
      {/* Header Section */}
      <Fade in={true} timeout={800}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          px: { xs: 1, sm: 0 }
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <HotelClass color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">Auction Board</Typography>
              <Typography variant="body2" color="text.secondary">
                AUCTION RANKING HISTORY
              </Typography>
            </Box>
          </Box>


          <TextField
              placeholder="Search historical players..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                  width: { xs: '100%', sm: 300 },
                  bgcolor: 'white',
                  '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      '& fieldset': { borderColor: alpha(theme.palette.divider, 0.8) },
                  }
              }}
          />
        </Box>
      </Fade>

      {/* Premium Sub-Header Stats Bar */}
      <Fade in={!loading} timeout={1000}>
        <Box 
          sx={{ 
            mb: 4, 
            p: 0.5, 
            borderRadius: '20px', 
            background: 'linear-gradient(90deg, rgba(25, 118, 210, 0.05), rgba(255, 255, 255, 0), rgba(25, 118, 210, 0.05))',
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.5),
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ px: 3, py: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 1, opacity: 0.7 }}>
              TOTAL SETTLED
            </Typography>
            <Typography variant="h6" fontWeight="950" color="primary.main">
              {completedAuctions.length} <Typography component="span" variant="caption" fontWeight="900">UNITS</Typography>
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ my: 2, borderStyle: 'dashed' }} />

          <Box sx={{ px: 3, py: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 1, opacity: 0.7 }}>
              RECORD PRICE 
            </Typography>
            <Typography variant="h6" fontWeight="950" sx={{ color: '#d97706' }}>
              {(completedAuctions.length > 0 ? Math.max(...completedAuctions.map(a => a.currentPrice || 0)) : 0).toLocaleString()} <Typography component="span" variant="caption" fontWeight="900">TP</Typography>
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ my: 2, borderStyle: 'dashed' }} />

          <Box sx={{ px: 3, py: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 1, opacity: 0.7 }}>
              MARKET VOLUME
            </Typography>
            <Typography variant="h6" fontWeight="950" color="success.main">
              {completedAuctions.reduce((sum, a) => sum + (a.currentPrice || 0), 0).toLocaleString()} <Typography component="span" variant="caption" fontWeight="900">TP</Typography>
            </Typography>
          </Box>
        </Box>
      </Fade>

      {/* spotlight section */}
      {!searchTerm && topThree.length > 0 && (
          <Box sx={{ mb: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <MilitaryTech sx={{ color: '#d97706' }} />
                  <Typography variant="h6" fontWeight="950" sx={{ letterSpacing: -0.5 }}>TOP TRANSFERS</Typography>
              </Box>
              <Grid container spacing={4} justifyContent="center">
                  {topThree.map((auction, index) => {
                      const grade = getGradeStyle(auction.playerOvr);
                      const pId = auction.playerId;
                      const price = auction.currentPrice || 0;
                      const owner = auction.highestBidderName || "Unknown";
                      
                      return (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={`top-${auction.auctionId}`}>
                             <Box sx={{ 
                                 position: 'relative',
                                 height: '100%',
                                 animation: `${dealCard} 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                                 animationDelay: `${index * 0.1}s`,
                                 opacity: 0
                             }}>
                                {index === 0 && (
                                    <Box sx={{ zIndex: 10 }} />
                                )}
                                <Card sx={{ 
                                    borderRadius: '24px',
                                    border: '1px solid',
                                    borderColor: '#fbbf24',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #fefce8 50%, #ffffff 100%)',
                                    boxShadow: '0 15px 45px rgba(251, 191, 36, 0.15)',
                                    overflow: 'visible',
                                    position: 'relative',
                                    height: '100%',
                                    transition: 'all 0.3s',
                                    '&:hover': {
                                      transform: 'translateY(-10px)',
                                      boxShadow: '0 25px 70px rgba(251, 191, 36, 0.25)',
                                      borderColor: '#fbbf24',
                                      '& .player-image': { transform: 'scale(1.05)' }
                                    },
                                    minWidth: '190px'
                                }}>
                                    {/* Ranking Number (#1, #2, #3) */}
                                    <Typography 
                                      sx={{ 
                                         position: "absolute", 
                                         top: 12, 
                                         left: 12, 
                                         fontSize: 22, 
                                         fontWeight: 900, 
                                         color: alpha(grade.color, 0.15),
                                         lineHeight: 1,
                                         zIndex: 2,
                                         pointerEvents: 'none',
                                         fontFamily: 'monospace'
                                      }}
                                    >
                                      #{index + 1}
                                    </Typography>

                                    {/* Image Area */}
                                    <Box sx={{ position: 'relative', pt: 4, pb: 2, display: 'flex', justifyContent: 'center' }}>
                                        <Box 
                                            component="a" 
                                            href={`https://pesdb.net/efootball/player.php?id=${pId}`} 
                                            target="_blank"
                                            sx={{ textDecoration: 'none' }}
                                        >
                                            <CardMedia
                                                component="img"
                                                image={getPlayerCardUrl(pId)}
                                                sx={{ height: 150, width: 'auto', animation: index === 0 ? `${goldGlow} 3s infinite` : 'none' }}
                                            />
                                        </Box>
                                        
                                        {/* Circular Grade Badge */}
                                        <Box sx={{ 
                                            position: "absolute", 
                                            top: 12, 
                                            right: '11%', 
                                            zIndex: 10,
                                            background: grade.gradient,
                                            color: grade.label === 'E' ? '#333' : 'white',
                                            width: 32,
                                            height: 32,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '50%',
                                            fontWeight: 950,
                                            fontSize: '0.9rem',
                                            boxShadow: `0 4px 12px ${alpha(grade.color, 0.6)}`,
                                            border: '2px solid white',
                                        }}>
                                            {grade.label}
                                        </Box>
                                    </Box>

                                    <CardContent sx={{ textAlign: 'center', pb: 4, p: 2, pt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        {/* TP Badge */}
                                        <Box 
                                          sx={{ 
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            mb: 1.5,
                                            background: "linear-gradient(90deg, #fbbf24, #fff, #fbbf24)",
                                            backgroundSize: "200% auto",
                                            animation: `${shine} 3s linear infinite`,
                                            color: "#0f172a",
                                            px: 1,
                                            py: 0.2,
                                            borderRadius: 1,
                                            fontSize: '0.65rem',
                                            fontWeight: 950,
                                            boxShadow: "0 2px 8px rgba(217, 119, 6, 0.2)",
                                            border: "1px solid rgba(255,255,255,0.5)",
                                            pointerEvents: "none"
                                          }}
                                        >
                                          {price.toLocaleString()} TP
                                        </Box>

                                        <Typography 
                                          variant="body1" 
                                          fontWeight="950" 
                                          component="a"
                                          href={`https://pesdb.net/efootball/player.php?id=${pId}`}
                                          target="_blank"
                                          sx={{ 
                                            fontSize: '0.95rem',
                                            lineHeight: 1.2, 
                                            color: '#1e293b',
                                            letterSpacing: '-0.3px',
                                            whiteSpace: 'nowrap',
                                            textDecoration: 'none',
                                            '&:hover': { color: 'primary.main', textDecoration: 'underline' }
                                          }}
                                        >
                                            {auction.playerName}
                                        </Typography>
                                        
                                        <Typography variant="caption" fontWeight="800" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                                           {owner}
                                        </Typography>
                                    </CardContent>
                                </Card>
                             </Box>
                          </Grid>
                      );
                  })}
              </Grid>
          </Box>
      )}

      {remainingAuctions.length === 0 && searchTerm ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <SearchOff sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
          <Typography variant="h6" color="text.disabled">No players found matching "{searchTerm}"</Typography>
        </Box>
      ) : completedAuctions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <History sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.2, mb: 2 }} />
          <Typography variant="h6" color="text.disabled">No completed auctions found</Typography>
        </Box>
      ) : (
        <>
            {searchTerm && <Typography variant="h6" fontWeight="900" sx={{ mb: 3 }}>SEARCH RESULTS</Typography>}
            {!searchTerm && <Typography variant="h6" fontWeight="900" sx={{ mb: 3 }}>RECENT TRANSACTIONS</Typography>}
            <Grid container spacing={3}>
            {remainingAuctions.map((auction, index) => {
                const grade = getGradeStyle(auction.playerOvr);
                const pId = auction.playerId;
                const price = auction.currentPrice || 0;
                const owner = auction.highestBidderName || "Unknown";
                const isLastElement = index === remainingAuctions.length - 1;

                return (
                <Grid 
                    item 
                    xs={12} 
                    sm={6} 
                    md={4} 
                    lg={3} 
                    key={auction.auctionId}
                    ref={isLastElement ? lastAuctionElementRef : null}
                >
                <Box
                  sx={{
                    position: "relative",
                    animation: `${dealCard} 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                    height: '100%'
                  }}
                >
                  <Card sx={{ 
                    borderRadius: '24px',
                    overflow: 'visible', // To allow TP badge to overflow
                    boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-10px)',
                      boxShadow: '0 25px 70px rgba(0,0,0,0.12)',
                      borderColor: grade.color,
                      '& .player-image': { transform: 'scale(1.05)' }
                    },
                    minWidth: '190px', // Further reduced as requested
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    bgcolor: 'white'
                  }}>
                    {/* No absolute badge at top of box anymore */}

                    {/* Ranking Number (Top Left) */}
                    <Typography 
                      sx={{ 
                         position: "absolute", 
                         top: 12, 
                         left: 12, 
                         fontSize: 22, 
                         fontWeight: 900, 
                         color: alpha(grade.color, 0.15),
                         lineHeight: 1,
                         zIndex: 2,
                         pointerEvents: 'none',
                         fontFamily: 'monospace'
                      }}
                    >
                      #{searchTerm ? (completedAuctions.findIndex(a => a.auctionId === auction.auctionId) + 1) : (index + 4)}
                    </Typography>

                    {/* No absolute chips anymore */}

                    {/* Image Area */}
                    <Box sx={{ 
                        pt: 4, 
                        pb: 1, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        position: 'relative',
                        zIndex: 1
                    }}>
                      <Box 
                        component="a"
                        href={`https://pesdb.net/efootball/player.php?id=${pId}`}
                        target="_blank"
                        sx={{ display: 'flex', justifyContent: 'center', width: '100%', textDecoration: 'none' }}
                      >
                        <CardMedia
                          component="img"
                          className="player-image"
                          image={getPlayerCardUrl(pId)}
                          alt={auction.playerName}
                          sx={{ 
                            width: 'auto', 
                            height: 150, 
                            objectFit: 'contain',
                            animation: `${goldGlow} 4s ease-in-out infinite`,
                            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))'
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getPlayerFaceUrl(pId);
                          }}
                        />
                      </Box>
                      
                      {/* Grade Badge (Top Right Corner) */}
                      <Box 
                        sx={{ 
                          position: "absolute", 
                          top: 12, // Move up to align with the corner
                          right: '11%', // Move to the right edge
                          zIndex: 10,
                          background: grade.gradient,
                          color: grade.label === 'E' ? '#333' : 'white',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          fontWeight: 950,
                          fontSize: '0.9rem',
                          boxShadow: `0 4px 12px ${alpha(grade.color, 0.6)}`,
                          border: '2px solid white',
                        }}
                      >
                        {grade.label}
                      </Box>
                    </Box>

                    {/* Content Area */}
                    <CardContent sx={{ p: 2, pt: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, position: 'relative', zIndex: 2 }}>
                       <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          
                          {/* TP Badge */}
                          <Box 
                            sx={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              mb: 0.5,
                              background: "linear-gradient(90deg, #fbbf24, #fff, #fbbf24)",
                              backgroundSize: "200% auto",
                              animation: `${shine} 3s linear infinite`,
                              color: "#0f172a",
                              px: 1,
                              py: 0.2,
                              borderRadius: 1,
                              fontSize: '0.65rem',
                              fontWeight: 950,
                              boxShadow: "0 2px 8px rgba(217, 119, 6, 0.2)",
                              border: "1px solid rgba(255,255,255,0.5)",
                              pointerEvents: "none"
                            }}
                          >
                            {price.toLocaleString()} TP
                          </Box>

                          <Typography 
                            variant="body1" 
                            fontWeight="950" 
                            component="a"
                            href={`https://pesdb.net/efootball/player.php?id=${pId}`}
                            target="_blank"
                            sx={{ 
                              fontSize: '0.95rem',
                              lineHeight: 1.2, 
                              color: '#1e293b',
                              letterSpacing: '-0.3px',
                              whiteSpace: 'nowrap',
                              textDecoration: 'none',
                              '&:hover': { color: 'primary.main', textDecoration: 'underline' }
                            }}
                          >
                              {auction.playerName}
                          </Typography>
                          
                          <Typography variant="caption" fontWeight="800" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                             {owner}
                          </Typography>
                       </Box>

                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            );
          })}
          </Grid>
        </>
      )}
      
      {visibleCount < filteredAuctions.length && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, py: 4 }}>
              <CircularProgress size={24} />
          </Box>
      )}
      </Container>
    </Box>
  );
};

export default CompletedAuctionPage;
