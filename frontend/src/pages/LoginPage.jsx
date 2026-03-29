import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock } from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { login as loginApi } from "../api/authApi";

const LineIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 48 48"
    fill="white"
    style={{ display: "block" }}
  >
    <path d="M24 4C12.95 4 4 11.85 4 21.5c0 5.55 2.95 10.5 7.6 13.75L9.8 41.3a1 1 0 0 0 1.4 1.2l7.1-3.5c1.85.45 3.75.7 5.7.7 11.05 0 20-7.85 20-17.5S35.05 4 24 4z" />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ userId: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await loginApi(form);
      login(res.data.data.token, res.data.data.user);
      navigate("/main");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleLineLogin = () => {
    const channelId = import.meta.env.VITE_LINE_CHANNEL_ID;
    if (!channelId) {
      setError("LINE Channel ID ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ");
      return;
    }
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/auth/line/callback`
    );
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("line_oauth_state", state);
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=profile`;
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ backgroundColor: "background.default" }}
    >
      <Card sx={{ width: 400, p: 2, boxShadow: 4 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Lock color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h5" fontWeight="bold">
              eTPL
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign In
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            display="flex"
            flexDirection="column"
            gap={2}
          >
            <TextField
              label="User ID"
              name="userId"
              value={form.userId}
              onChange={handleChange}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              หรือ
            </Typography>
          </Divider>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleLineLogin}
            startIcon={<LineIcon />}
            sx={{
              backgroundColor: "#06C755",
              "&:hover": { backgroundColor: "#05a847" },
              color: "white",
            }}
          >
            เข้าสู่ระบบด้วย LINE
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
