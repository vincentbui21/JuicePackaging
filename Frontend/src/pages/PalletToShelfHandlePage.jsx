import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  Stack,
  Paper,
  Grow,
} from "@mui/material";
import QRScanner from "../components/qrscanner";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";

function PalletToShelfHandlePage() {
  const [scanResult, setScanResult] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [expectedPalletIDs, setExpectedPalletIDs] = useState([]);
  const [scannedPalletIDs, setScannedPalletIDs] = useState([]);
  const [shelfId, setShelfId] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [scanMode, setScanMode] = useState("pallet");

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";

    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulseBorder {
        0% {
          box-shadow: 0 0 0 0 rgba(182, 162, 132, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(182, 162, 132, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(182, 162, 132, 0);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.style = "";
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const processScan = async () => {
      if (!scanResult) return;
      console.log("Scanned QR code:", scanResult);

      if (scanMode === "pallet" && scanResult.startsWith("PALLET_")) {
        const palletId = scanResult;
        if (!expectedPalletIDs.includes(palletId)) {
          setScannedPalletIDs((prev) => [...prev, palletId]);
          setExpectedPalletIDs((prev) => [...prev, palletId]);
        }
        setScanMode("shelf");
        setSnackbarMsg("Pallet scanned. Now scan the shelf.");
      } else if (scanMode === "shelf" && scanResult.startsWith("SHELF_")) {
        const shelf_id = scanResult.replace("SHELF_", "");
        setShelfId(shelf_id);
        setSnackbarMsg("Shelf scanned. Ready to assign.");
      }      

      setScanResult(null);
    };

    processScan();
  }, [scanResult]);

  const handleSubmit = async () => {
    try {
      await api.post(`/pallets/assign-shelf`, {
        shelfId: shelfId,
        palletId: scannedPalletIDs[0].replace("PALLET_", ""),  
      });
      

      setSnackbarMsg(`Pallets assigned to shelf successfully.`);

      setScanResult(null);
      setExpectedPalletIDs([]);
      setScannedPalletIDs([]);
      setShelfId(null);
      setScanMode("pallet");
    } catch (err) {
      console.error(err);
      setSnackbarMsg("Failed to complete shelf assignment.");
    }
  };

  const handleCancel = () => {
    setScanResult(null);
    setExpectedPalletIDs([]);
    setScannedPalletIDs([]);
    setShelfId(null);
    setScanMode("pallet");
  };

  return (
    <Box p={3} textAlign="center">
      <Typography
        variant="h4"
        sx={{
          background: "#b6a284",
          color: "white",
          p: 2,
          borderRadius: 2,
          width: "fit-content",
          mx: "auto",
        }}
      >
        Pallet to Shelf Loading Station
      </Typography>

      <Stack spacing={3} alignItems="center" mt={4}>
        <Box
          sx={{
            border: "3px solid",
            borderColor: scanMode === "pallet" ? "primary.main" : "success.main",
            borderRadius: 2,
            p: 2,
            animation: "pulseBorder 2s infinite",
            width: "fit-content",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <Typography variant="h6" mb={1}>
            {scanMode === "pallet" ? "Scan Pallet QR Code" : "Scan Shelf QR Code"}
          </Typography>
          <QRScanner onResult={setScanResult} />
        </Box>

        <Grow in={!!(scannedPalletIDs.length || shelfId)}>
          <Paper
            elevation={4}
            sx={{
              p: 3,
              maxWidth: 400,
              backgroundColor: "rgba(255,255,255,0.9)",
            }}
          >
            <Typography variant="body1">
              Scanned Pallets: {scannedPalletIDs.length}
            </Typography>

            <Stack spacing={1} mt={2}>
              {scannedPalletIDs.map((id, idx) => (
                <Paper key={id} elevation={1} sx={{ p: 1 }}>
                  <Typography variant="body2">
                    Pallet {idx + 1}: {id}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            {shelfId && (
              <Typography variant="subtitle1" mt={2}>
                Shelf ID: {shelfId}
              </Typography>
            )}
          </Paper>
        </Grow>

        <Stack direction="row" spacing={2} mt={3}>
          {scannedPalletIDs.length > 0 && (
            <Button variant="outlined" color="error" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {scannedPalletIDs.length > 0 && shelfId && (
            <Button variant="contained" color="success" onClick={handleSubmit}>
              Submit
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

export default PalletToShelfHandlePage;
