import { Box, Typography, TextField, Button, Paper } from "@mui/material";
import { useState, useEffect } from "react";
import backgroundomena from "../assets/backgroundomena.jpg";
import company_logo from "../assets/company_logo.png";

function PickupPage() {
  const [search, setSearch] = useState("");

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
      <Typography variant="h4" sx={{ background: "#a9987d", p: 2, borderRadius: 2, color: "white" }}>Customer Pickup</Typography>

      <Paper sx={{ mt: 3, p: 3, width: "min(700px, 90%)", bgcolor: "#d6d0b1" }}>
        <TextField fullWidth label="Search by Name or Phone" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} />

        <Typography variant="body1" sx={{ my: 2 }}>Results shown here...</Typography>

        <Button variant="contained" fullWidth>Confirm Pickup</Button>
      </Paper>
    </Box>
  );
}

export default PickupPage;
