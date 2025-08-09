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
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";

function PalletCreationPage() {
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [error, setError] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const handleCreate = async () => {
    const trimmed = location.trim();
    if (!trimmed || Number(capacity) <= 0) {
      setSnackbarMsg(!trimmed ? "Please enter a pallet location" : "Capacity must be at least 1");
      setError(true);
      return;
    }

    try {
      const res = await api.post("/pallets", { location: trimmed, capacity: Number(capacity) });

      // Be tolerant to either shape: { pallet_id } or { result: { pallet_id } }
      const pallet_id = res?.data?.pallet_id ?? res?.data?.result?.pallet_id;
      if (!pallet_id) throw new Error("Missing pallet_id in response");

      const img = await generateSmallPngQRCode(`PALLET_${pallet_id}`);
      setQrImage(img);
      setQrDialogOpen(true);
      setSnackbarMsg("Pallet created successfully");
      setLocation("");
      setCapacity(8);
      setError(false);
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg("Failed to create pallet. Check the server.");
    }
  };

  const handlePrint = () => {
    if (!qrImage) return;
    const popup = window.open("", "_blank");
    popup.document.write(`
      <html><head><title>Print QR Code</title></head>
      <body style="text-align:center;padding:20px;">
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
  };

  return (
    <>
      <DrawerComponent />

      <Box
        sx={{
          backgroundColor: "#ffffff",
          minHeight: "90vh",
          py: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "min(90%, 600px)",
            p: 4,
            backgroundColor: "#ffffff",
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Create New Pallet
          </Typography>

          <TextField
            label="Pallet Location"
            variant="filled"
            fullWidth
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            error={error && !location.trim()}
            helperText={error && !location.trim() ? "Location is required" : ""}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Capacity"
            type="number"
            variant="filled"
            fullWidth
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            error={error && Number(capacity) <= 0}
            helperText={error && Number(capacity) <= 0 ? "Capacity must be at least 1" : ""}
            sx={{ mb: 3 }}
          />

          <Button fullWidth variant="contained" onClick={handleCreate}>
            Generate Pallet
          </Button>
        </Paper>
      </Box>

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
    </>
  );
}

export default PalletCreationPage;
