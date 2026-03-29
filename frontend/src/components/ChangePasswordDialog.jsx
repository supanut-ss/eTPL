import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { changePassword } from "../api/authApi";

const ChangePasswordDialog = ({ open, onClose }) => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setLoading(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
            {success}
          </Alert>
        )}
        <TextField
          label="รหัสผ่านปัจจุบัน"
          name="currentPassword"
          type={showCurrent ? "text" : "password"}
          value={form.currentPassword}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowCurrent(!showCurrent)}
                  edge="end"
                >
                  {showCurrent ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="รหัสผ่านใหม่"
          name="newPassword"
          type={showNew ? "text" : "password"}
          value={form.newPassword}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNew(!showNew)} edge="end">
                  {showNew ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="ยืนยันรหัสผ่านใหม่"
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          value={form.confirmPassword}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm(!showConfirm)}
                  edge="end"
                >
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !!success}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : "บันทึก"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
