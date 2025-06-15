import { Box, Typography, TextField, Button, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import backgroundomena from "../assets/backgroundomena.jpg";
import company_logo from "../assets/company_logo.png";

function LoadingHandlePage() {
  const [crateQR, setCrateQR] = useState("");
  const [palletQR, setPalletQR] = useState("");

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.height = "100vh";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundPosition = "";
      document.body.style.height = "";
      document.body.style.margin = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <img src={company_logo} alt="company logo" width={120} style={{ marginBottom: "10px" }} />
      <Typography variant="h4" sx={{ background: "#a9987d", p: 2, borderRadius: 2, color: "white" }}>Loading Section</Typography>

      <Paper sx={{ mt: 3, p: 3, width: "min(700px, 90%)", bgcolor: "#d6d0b1" }}>
        <TextField fullWidth label="Scan Crate QR" value={crateQR} onChange={(e) => setCrateQR(e.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth label="Scan Pallet QR" value={palletQR} onChange={(e) => setPalletQR(e.target.value)} sx={{ mb: 2 }} />

        <Button variant="contained" fullWidth>Confirm & Notify Customer</Button>
      </Paper>
    </Box>
  );
}

export default LoadingHandlePage;