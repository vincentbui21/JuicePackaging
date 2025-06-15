import { Box, Typography, Button, Paper } from "@mui/material";
import backgroundomena from "../assets/backgroundomena.jpg";
import { useEffect } from "react";

function JuiceHandlePage() {
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
      <Typography variant="h4" sx={{ background: "#a9987d", p: 2, borderRadius: 2, color: "white" }}>Juice Handling Station</Typography>

      <Paper sx={{ mt: 3, p: 2, width: "min(1000px, 90%)", bgcolor: "#d6d0b1" }}>
        <Typography variant="h6">Queue will be displayed here</Typography>

        <Box mt={2} display="flex" justifyContent="space-between">
          <Button variant="contained">Send to Pouch Printer</Button>
          <Button variant="contained" color="success">Confirm Handling Done</Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default JuiceHandlePage;
