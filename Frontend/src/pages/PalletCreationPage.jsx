import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Print } from "@mui/icons-material";
import backgroundomena from "../assets/backgroundomena.jpg";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";

function CreatePalletPage() {
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [error, setError] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const handleCreate = async () => {
    if (!location.trim()) {
      setSnackbarMsg("Please enter a pallet location");
      setError(true);
      return;
    }

    try {
      const res = await api.post("/pallets", { location, capacity });

      const { pallet_id } = res.data;
      if (pallet_id) {
        const img = await generateSmallPngQRCode("PALLET_" + pallet_id);
        setQrImage(img);
        setQrDialogOpen(true);
        setSnackbarMsg("Pallet created successfully");
        setLocation("");
        setCapacity(8);
        setError(false);
      } else {
        throw new Error("Missing pallet_id in response");
      }
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg("Failed to create pallet. Check the server.");
    }
  };

  const handlePrint = () => {
    if (qrImage) {
      const popup = window.open("", "_blank");
      popup.document.write(`
        <html><head><title>Print QR Code</title></head><body style="text-align:center;padding:20px;">
        <img src="${qrImage}" style="width:200px;" />
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = () => window.close();
          }
        </script>
        </body></html>
      `);
      popup.document.close();
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `url(${backgroundomena})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          padding: 4,
          borderRadius: 3,
          backgroundColor: "#efe3c6",
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
        }}
      >
        <Typography variant="h4" gutterBottom>
          Create New Pallet
        </Typography>

        <TextField
          label="Pallet Location"
          variant="outlined"
          fullWidth
          margin="normal"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          error={error && !location.trim()}
          helperText={error && !location.trim() ? "Location is required" : ""}
          sx={{ backgroundColor: "white", borderRadius: 1 }}
        />

        <TextField
          label="Capacity"
          type="number"
          variant="outlined"
          fullWidth
          margin="normal"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          sx={{ backgroundColor: "white", borderRadius: 1 }}
        />

        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleCreate}
          sx={{ marginTop: 2 }}
        >
          Generate Pallet
        </Button>
      </Paper>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>Pallet QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center">
            <img src={qrImage} alt="QR Code" style={{ width: 200 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button onClick={handlePrint} variant="contained" startIcon={<Print />}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </Box>
  );
}

export default CreatePalletPage;
