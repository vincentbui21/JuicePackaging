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

function ShelveCreationPage() {
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [error, setError] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // NEW: optional shelf name input + display name after create
  const [shelfName, setShelfName] = useState("");
  const [createdShelfName, setCreatedShelfName] = useState("");

  const handleCreate = async () => {
    const loc = location.trim();
    const cap = Number(capacity);
    if (!loc || cap <= 0) {
      setError(true);
      setSnackbarMsg(!loc ? "Please enter a shelf location" : "Capacity must be at least 1");
      return;
    }

    try {
      // Send optional shelf_name (backend will auto-name if empty)
      const res = await api.post("/api/shelves", {
        location: loc,
        capacity: cap,
        shelf_name: shelfName?.trim() || null, // NEW
      });

      // Support both shapes: { shelf_id, shelf_name } or { result: { shelf_id, shelf_name } }
      const shelf_id = res?.data?.shelf_id ?? res?.data?.result?.shelf_id;
      const returned_name = res?.data?.shelf_name ?? res?.data?.result?.shelf_name; // NEW
      if (!shelf_id) throw new Error("Missing shelf_id in server response");

      const qrData = `SHELF_${shelf_id}`;
      const img = await generateSmallPngQRCode(qrData);

      setQrImage(img);
      setCreatedShelfName(returned_name || shelfName || ""); // NEW
      setQrDialogOpen(true);
      setSnackbarMsg("Shelf created successfully!");
      setLocation("");
      setCapacity(8);
      setShelfName(""); // NEW
      setError(false);
    } catch (err) {
      console.error("Failed to create shelf:", err);
      setSnackbarMsg("Failed to create shelf. Check server.");
      setError(true);
    }
  };

  const handlePrint = () => {
    if (!qrImage) return;
    const popup = window.open("", "_blank");
    popup.document.write(`
      <html><head><title>Print QR Code</title></head>
      <body style="text-align:center;padding:20px;font-family:Arial, Helvetica, sans-serif;">
        <img src="${qrImage}" style="width:100px;" />
        ${
          createdShelfName
            ? `<div style="margin-top:12px;font-size:18px;font-weight:bold;">${createdShelfName}</div>`
            : ""
        }
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
            Create New Shelf
          </Typography>

          <TextField
            label="Shelf Location"
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
            sx={{ mb: 2 }}
          />

          {/* NEW: optional name input */}
          <TextField
            label="Shelf Name (optional)"
            variant="filled"
            fullWidth
            value={shelfName}
            onChange={(e) => setShelfName(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button fullWidth variant="contained" onClick={handleCreate}>
            Generate Shelf
          </Button>
        </Paper>
      </Box>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>Shelf QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mt={1}>
            <img src={qrImage} alt="QR Code" style={{ width: 100 }} />
            {/* NEW: show readable name beneath QR */}
            {createdShelfName ? (
              <Typography variant="h6" sx={{ mt: 1, fontWeight: "bold" }}>
                {createdShelfName}
              </Typography>
            ) : null}
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

export default ShelveCreationPage;
