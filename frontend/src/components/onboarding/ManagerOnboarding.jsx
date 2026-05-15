import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Avatar,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  KeyboardArrowUp,
  KeyboardArrowDown,
  Psychology,
  EmojiEvents,
  Groups,
  AccountCircle,
  ChevronRight,
  Close,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const ONBOARDING_KEY = 'etpl_onboarding_progress';

const ManagerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState({
    profile: false,
    auction: false,
    squad: false,
    rules: false,
  });

  // Track completion based on navigation
  useEffect(() => {
    const saved = localStorage.getItem(ONBOARDING_KEY);
    let current = saved ? JSON.parse(saved) : progress;

    if (location.pathname === '/profile') current.profile = true;
    if (location.pathname === '/auction') current.auction = true;
    if (location.pathname === '/my-squad') current.squad = true;
    if (location.pathname === '/user-manual') current.rules = true;

    setProgress(current);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(current));
    
    // Auto open for new users who haven't finished
    const isFinished = Object.values(current).every(v => v === true);
    if (!saved && !isFinished) {
      setTimeout(() => setIsOpen(true), 2000);
    }
  }, [location.pathname]);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalCount = Object.keys(progress).length;
  const percentage = (completedCount / totalCount) * 100;

  if (!user) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 30,
        right: 30,
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      {/* Miyu-chan Chat Bubble / Panel */}
      <Fade in={isOpen}>
        <Paper
          elevation={12}
          sx={{
            width: 320,
            mb: 2,
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}
        >
          {/* Header */}
          <Box sx={{ p: 2, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar 
                  src="/miyu-avatar.png" 
                  sx={{ width: 32, height: 32, border: '2px solid white' }}
                />
                <Typography variant="subtitle2" fontWeight={700}>มิยุจัง (AI Guide)</Typography>
              </Box>
              <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1.2, display: 'block' }}>
              ยินดีต้อนรับคุณ {user.lineName || user.userId}! ผมจะช่วยคุณเริ่มต้นเส้นทางผู้จัดการทีมมือโปรครับ
            </Typography>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">ความคืบหน้าการฝึกฝน</Typography>
              <Typography variant="caption" fontWeight={700} color="primary">{completedCount}/{totalCount}</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={percentage} 
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: 'rgba(79, 70, 229, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                }
              }} 
            />
          </Box>

          {/* Mission List */}
          <List sx={{ p: 1 }}>
            <OnboardingItem 
              icon={<AccountCircle />} 
              title="ตั้งค่าตัวตนผู้จัดการ" 
              subtitle="กำหนดชื่อทีมและตรวจสอบข้อมูลโปรไฟล์"
              done={progress.profile}
              onClick={() => navigate('/profile')}
            />
            <OnboardingItem 
              icon={<Psychology />} 
              title="สำรวจตลาดซื้อขาย" 
              subtitle="ดูนักเตะในตลาดประมูลปัจจุบัน"
              done={progress.auction}
              onClick={() => navigate('/auction')}
            />
            <OnboardingItem 
              icon={<Groups />} 
              title="วางแผนขุมกำลัง" 
              subtitle="ตรวจสอบนักเตะในทีมของคุณ"
              done={progress.squad}
              onClick={() => navigate('/my-squad')}
            />
            <OnboardingItem 
              icon={<EmojiEvents />} 
              title="ศึกษากฎเหล็ก eTPL" 
              subtitle="อ่านคู่มือการเล่นพื้นฐาน"
              done={progress.rules}
              onClick={() => navigate('/user-manual')}
            />
          </List>

          {/* Footer Call to Action */}
          {percentage === 100 && (
            <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, mb: 1, display: 'block' }}>
                🎉 ฝึกฝนเสร็จสิ้น! คุณพร้อมลงสนามแล้ว
              </Typography>
              <Button 
                variant="contained" 
                fullWidth 
                size="small"
                onClick={() => setIsOpen(false)}
                sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#4f46e5' }}
              >
                ลุยเลย!
              </Button>
            </Box>
          )}
        </Paper>
      </Fade>

      {/* Floating Toggle Button */}
      <Tooltip title="ผู้ช่วยผู้จัดการทีม" placement="left">
        <IconButton
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            width: 56,
            height: 56,
            background: isOpen ? '#1e293b' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(79, 70, 229, 0.4)',
            '&:hover': {
              background: isOpen ? '#0f172a' : 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {isOpen ? <KeyboardArrowDown /> : <Avatar src="/miyu-avatar.png" sx={{ width: 40, height: 40 }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const OnboardingItem = ({ icon, title, subtitle, done, onClick }) => (
  <ListItem 
    button 
    onClick={onClick}
    sx={{ 
      borderRadius: 2, 
      mb: 0.5,
      transition: '0.2s',
      '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.05)' },
      opacity: done ? 0.6 : 1,
    }}
  >
    <ListItemIcon sx={{ minWidth: 40, color: done ? 'success.main' : 'primary.main' }}>
      {done ? <CheckCircle fontSize="small" /> : icon}
    </ListItemIcon>
    <ListItemText 
      primary={<Typography variant="caption" fontWeight={700}>{title}</Typography>}
      secondary={<Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{subtitle}</Typography>}
    />
    {!done && <ChevronRight fontSize="small" sx={{ color: 'text.disabled' }} />}
  </ListItem>
);

export default ManagerOnboarding;
