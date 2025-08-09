import { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Snackbar,
  Paper,
  Grow,
} from "@mui/material";
import QRScanner from "../components/qrcamscanner";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";

function BoxToPalletLoadingPage() {
  const [scanResult, setScanResult] = useState(null);
  const [scannedBoxes, setScannedBoxes] = useState([]);       // stores full scanned codes (with prefix)
  const [palletId, setPalletId] = useState(null);             // stores id WITHOUT prefix
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const handleScan = (raw) => {
    if (!raw) return;
    const code = String(raw).trim();

    // Pallet
    if (code.startsWith("PALLET_")) {
      const id = code.replace("PALLET_", "");
      setPalletId(id);
      setSnackbarMsg("Pallet scanned.");
      setScanResult(null);
      return;
    }

    // Box (support both BOX_ and CRATE_ prefixes)
    if (code.startsWith("BOX_") || code.startsWith("CRATE_")) {
      if (scannedBoxes.includes(code)) {
        setSnackbarMsg("Box already scanned.");
      } else {
        setScannedBoxes((prev) => [...prev, code]);
        setSnackbarMsg("Box scanned.");
      }
      setScanResult(null);
      return;
    }

    setSnackbarMsg("Unsupported QR code.");
    setScanResult(null);
  };

  const handleSubmit = async () => {
    if (!palletId || scannedBoxes.length === 0) {
      setSnackbarMsg("Scan a pallet and at least one box first.");
      return;
    }

    // Normalize boxes for API: strip prefix -> ORDERID_INDEX
    const boxesPayload = scannedBoxes.map((c) => c.replace(/^BOX_|^CRATE_/, ""));

    try {
      const res = await api.post(`/pallets/${encodeURIComponent(palletId)}/load-boxes`, {
        boxes: boxesPayload,
      });
      setSnackbarMsg(res?.data?.message || "Boxes loaded successfully.");
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
            width: "min(900px, 95%)",
            p: 3,
            backgroundColor: "#ffffff",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", mb: 2 }}
          >
            Load Boxes onto Pallet
          </Typography>

          <Stack spacing={3} alignItems="center" mt={2}>
            <Box
              sx={{
                border: "3px dashed",
                borderRadius: 2,
                p: 2,
                backgroundColor: "rgba(255,255,255,0.9)",
                width: "fit-content",
              }}
            >
              <Typography variant="h6" mb={1}>
                Scan {palletId ? "Box" : "Pallet"} QR Code
              </Typography>
              <QRScanner onResult={handleScan} />
            </Box>

            <Grow in={scannedBoxes.length > 0 || Boolean(palletId)}>
              <Paper elevation={2} sx={{ p: 3, maxWidth: 500, minWidth: 300 }}>
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
                    maxHeight: 220,
                    overflowY: "auto",
                    border: "1px solid #eee",
                    borderRadius: 1,
                    p: 1,
                    textAlign: "left",
                  }}
                >
                  {scannedBoxes.map((id, idx) => (
                    <Paper
                      key={id}
                      elevation={0}
                      sx={{ p: 1, mb: 1, backgroundColor: "#f7f7f7" }}
                    >
                      <Typography variant="body2">
                        Box {idx + 1}: {id}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            </Grow>

            <Stack direction="row" spacing={2} mt={1}>
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
        </Paper>
      </Box>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </>
  );
}

export default BoxToPalletLoadingPage;
