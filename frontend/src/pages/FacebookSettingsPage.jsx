import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
} from "@mui/material";
import {
  Facebook,
  Refresh,
  Settings,
  VpnKey,
  CheckCircle,
  Error as ErrorIcon,
  HelpOutline,
} from "@mui/icons-material";
import { getFacebookSettings, getFacebookAppConfig, updateFacebookToken, testFacebookPost } from "../api/facebookApi";

const FacebookSettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [appConfig, setAppConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settRes, configRes] = await Promise.all([
        getFacebookSettings(),
        getFacebookAppConfig(),
      ]);
      setSettings(settRes.data.data);
      setAppConfig(configRes.data.data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load Facebook settings";
      setError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Load FB SDK
    if (!window.FB && (appConfig?.appId || appConfig?.AppId)) {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId      : appConfig?.appId || appConfig?.AppId,
          cookie     : true,
          xfbml      : true,
          version    : 'v20.0'
        });
      };

      (function(d, s, id){
         var js, fjs = d.getElementsByTagName(s)[0];
         if (d.getElementById(id)) {return;}
         js = d.createElement(s); js.id = id;
         js.src = "https://connect.facebook.net/en_US/sdk.js";
         fjs.parentNode.insertBefore(js, fjs);
       }(document, 'script', 'facebook-jssdk'));
    }
  }, [appConfig?.appId]);

  const handleConnect = () => {
    if (!window.FB) {
        setError("Facebook SDK not loaded yet. Please refresh.");
        return;
    }

    setActionLoading(true);
    setError(null);

    window.FB.login((response) => {
      if (response.authResponse) {
        const userToken = response.authResponse.accessToken;
        submitToken(userToken);
      } else {
        setActionLoading(false);
        setError("User cancelled login or did not fully authorize.");
      }
    }, { 
        scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,public_profile' 
    });
  };

  const submitToken = async (userToken) => {
    try {
      await updateFacebookToken({
        userAccessToken: userToken,
        pageId: settings?.pageId || settings?.PageId // Use existing PageId if not changing
      });
      setSuccess("Facebook Token updated and saved successfully!");
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update token");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestPost = async () => {
    setActionLoading(true);
    try {
      await testFacebookPost("System Health Check: Connection to eTPL Dashboard verified. ✅");
      setSuccess("Test post sent successfully! Check your Facebook Page.");
    } catch (err) {
      setError("Test post failed. Check token permissions.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <Settings color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">Facebook Automation Settings</Typography>
          <Typography variant="body2" color="text.secondary">MANAGE TOKENS & CONNECTIVITY</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Stack spacing={3}>
        {/* Status Card */}
        <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }} elevation={0}>
          <Box sx={{ bgcolor: 'primary.main', p: 2, color: 'white' }}>
            <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1}>
              <Facebook /> Connection Status
            </Typography>
          </Box>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>CONNECTED PAGE</Typography>
                <Typography variant="h6" fontWeight={700}>{(settings?.pageId || settings?.PageId) || "Not Configured"}</Typography>
                <Typography variant="caption" color="text.secondary">
                    Status: {(settings?.hasToken || settings?.HasToken) ? 
                        <Chip label="ACTIVE" color="success" size="small" icon={<CheckCircle />} sx={{ ml: 1 }} /> : 
                        <Chip label="DISCONNECTED" color="error" size="small" icon={<ErrorIcon />} sx={{ ml: 1 }} />
                    }
                </Typography>
              </Box>

              <Box sx={{ textAlign: { md: 'right' } }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>LAST TOKEN REFRESH</Typography>
                <Typography variant="body1" fontWeight={600}>
                    {(settings?.lastUpdate || settings?.LastUpdate) ? new Date(settings?.lastUpdate || settings?.LastUpdate).toLocaleString() : "Never"}
                </Typography>
                <Typography variant="caption" color="text.secondary">Tokens usually last for 60+ days</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Paper sx={{ p: 4, borderRadius: 4, border: '1px dashed', borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.02)' }} elevation={0}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Update Connectivity</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Click the button below to sign in with Facebook. This will automatically refresh the 
            Page Access Token and save it to the secure database for automated posting.
          </Typography>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : <Facebook />}
              onClick={handleConnect}
              disabled={actionLoading || !(appConfig?.appId || appConfig?.AppId)}
              sx={{ borderRadius: 3, textTransform: 'none', px: 4, fontWeight: 700 }}
            >
              Connect to Facebook
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<Refresh />}
              onClick={handleTestPost}
              disabled={actionLoading || !(settings?.hasToken || settings?.HasToken)}
              sx={{ borderRadius: 3, textTransform: 'none', px: 4 }}
            >
              Test Connection
            </Button>
          </Stack>

          {!(appConfig?.appId || appConfig?.AppId) && (
            <Typography variant="caption" color="error" display="block" mt={2}>
                * AppId is missing in appsettings.json. Please configure it first.
            </Typography>
          )}
        </Paper>

        {/* Documentation/Guide */}
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} display="flex" alignItems="center" gap={1} mb={1}>
                <HelpOutline fontSize="small" /> How it works?
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
                1. <strong>Authorize</strong>: We use the Facebook Login SDK to get a short-lived user token.<br />
                2. <strong>Exchange</strong>: Our backend exchanges it for a 60-day long-lived user token.<br />
                3. <strong>Acquire</strong>: We finally request a Permanent Page Access Token for your specific Page ID.<br />
                4. <strong>Persist</strong>: The token is encrypted and saved in the system settings table for use by background services.
            </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default FacebookSettingsPage;
