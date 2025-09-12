import { Box, Paper, Typography, TextField, Button, Snackbar, Alert } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import company_logo from "../assets/company_logo.png";
import api from "../services/axios";

function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      // Always use role "1" (Dashboard) in the backend
      const res = await api.post("/auth/login", { id: "employee", password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard"); // always go to dashboard
    } catch (err) {
      setError("Invalid password");
    }
  };

  return (
    <Box sx={{ height: "98vh", display: "flex", justifyContent: "center", alignItems: "center", px: 2 }}>
      <Paper
        elevation={24}
        sx={{ width: "min(500px, 90%)", minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 3, borderRadius: 3, border: 2, borderColor: "#c2c2c2", p: 4 }}
      >
        <img src={company_logo} alt="company logo" width={150} />

        <Typography variant="h5" sx={{ fontWeight: "bold", mt: 1 }}>Login</Typography>

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ width: "60%" }}
        />

        <Button variant="contained" onClick={handleLogin}>Login</Button>

        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError("")}>
          <Alert severity="error">{error}</Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}

export default LoginPage;
