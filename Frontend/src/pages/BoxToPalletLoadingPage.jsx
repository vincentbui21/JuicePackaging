import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Snackbar,
  Paper,
  Grow,
} from "@mui/material";
import QRScanner from "../components/qrscanner";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";

function BoxToPalletLoadingPage() {
  const [scanResult, setScanResult] = useState(null);
  const [scannedBoxes, setScannedBoxes] = useState([]);
  const [palletId, setPalletId] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    return () => {
      document.body.style = "";
    };
  }, []);

  useEffect(() => {
    if (!scanResult) return;

    const trimmed = scanResult.trim();

    if (trimmed.startsWith("BOX_")) {
      if (!scannedBoxes.includes(trimmed)) {
        setScannedBoxes((prev) => [...prev, trimmed]);
        setSnackbarMsg("Box scanned.");
      } else {
        setSnackbarMsg("Box already scanned.");
      }
    }

    if (trimmed.startsWith("PALLET_")) {
      const id = trimmed.replace("PALLET_", "");
      setPalletId(id);
      setSnackbarMsg("Pallet scanned.");
    }

    setScanResult(null);
  }, [scanResult]);

  const handleSubmit = async () => {
    if (!palletId || scannedBoxes.length === 0) {
      setSnackbarMsg("Missing pallet or boxes.");
      return;
    }

    try {
      const res = await api.post(`/pallets/${palletId}/load-boxes`, {
        boxes: scannedBoxes,
      });
      setSnackbarMsg(res.data.message || "Boxes loaded successfully");

      // Reset
      setPalletId(null);
      setScannedBoxes([]);
    } catch (err) {
      console.error(err);
      setSnackbarMsg("Failed to load boxes.");
    }
  };

  const handleCancel = () => {
    setPalletId(null);
    setScannedBoxes([]);
    setScanResult(null);
    setSnackbarMsg("Reset complete.");
  };

  return (
    <Box p={3} textAlign="center">
      <Typography
        variant="h4"
        sx={{
          background: "#8d7b65",
          color: "white",
          p: 2,
          borderRadius: 2,
          width: "fit-content",
          mx: "auto",
        }}
      >
        Load Boxes onto Pallet
      </Typography>

      <Stack spacing={3} alignItems="center" mt={4}>
        <Box
          sx={{
            border: "3px dashed",
            borderRadius: 2,
            p: 2,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        >
          <Typography variant="h6">
            Scan {palletId ? "Box" : "Pallet"} QR Code
          </Typography>
          <QRScanner onResult={setScanResult} />
        </Box>

        <Grow in={scannedBoxes.length > 0 || palletId}>
          <Paper elevation={4} sx={{ p: 3, maxWidth: 500, minWidth: 300 }}>
            {palletId && (
              <Typography variant="subtitle1" mb={1}>
                Pallet ID: {palletId}
              </Typography>
            )}

            <Typography variant="body1" gutterBottom>
              Scanned Boxes: {scannedBoxes.length}
            </Typography>

            <Box
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                border: "1px solid #ccc",
                borderRadius: 1,
                p: 1,
              }}
            >
              {scannedBoxes.map((id, idx) => (
                <Paper
                  key={id}
                  elevation={1}
                  sx={{
                    p: 1,
                    mb: 1,
                    backgroundColor: "#f3f3f3",
                    textAlign: "left",
                  }}
                >
                  <Typography variant="body2">
                    Box {idx + 1}: {id}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Paper>
        </Grow>

        <Stack direction="row" spacing={2} mt={3}>
          {scannedBoxes.length > 0 && (
            <Button variant="outlined" color="error" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {palletId && scannedBoxes.length > 0 && (
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              Load to Pallet
            </Button>
          )}
        </Stack>
      </Stack>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </Box>
  );
}

export default BoxToPalletLoadingPage;
