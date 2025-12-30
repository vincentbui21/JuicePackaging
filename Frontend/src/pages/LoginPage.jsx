import { Box, Paper, Typography, TextField, Button, Snackbar, Alert, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import company_logo from "../assets/company_logo.png";
import api from "../services/axios";
import "../css/LoginPage.css"; // Import the CSS file

function LoginPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!userId || !password) {
      setError("Please enter both ID and password");
      return;
    }
    try {
      const res = await api.post("/auth/login", { id: userId, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", userId);
      
      // Fetch user permissions
      try {
        const userRes = await api.get(`/accounts/me/${userId}`);
        if (userRes.data.ok && userRes.data.account) {
          localStorage.setItem("userPermissions", JSON.stringify(userRes.data.account));
        }
      } catch (permErr) {
        console.error("Failed to fetch user permissions:", permErr);
      }
      
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 403) {
        setError("Inactive account, please contact admin");
      } else {
        setError("Invalid credentials");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Box sx={{ height: "98vh", display: "flex", justifyContent: "center", alignItems: "center", px: 2 }}>
      <Paper
        elevation={24}
        className="login-paper-animation" // Apply the animation class
        sx={{
          width: "min(500px, 90%)",
          minHeight: 420,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 3,
          borderRadius: 3,
          border: 2,
          borderColor: "#c2c2c2",
          p: 4,
          transform: "translateY(0)", // Ensure base transform for animation
          opacity: 1, // Ensure base opacity for animation
        }}
      >
        <img src={company_logo} alt="company logo" width={150} />

        <Typography variant="h5" sx={{ fontWeight: "bold", mt: 1 }}>Login</Typography>

        <TextField
          label="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ width: "60%" }}
          autoFocus
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          sx={{ width: "60%" }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
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
          variant="contained"
          onClick={handleLogin}
          sx={{
            "&:hover": {
              transform: "scale(1.05)", // Subtle hover effect
              transition: "transform 0.2s ease-in-out",
            },
          }}
        >
          Login
        </Button>

        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError("")}>
          <Alert severity="error">{error}</Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

export default LoginPage;
