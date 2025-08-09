import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Stack,
  Paper,
  Grow,
} from "@mui/material";
import QRScanner from "../components/qrcamscanner";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";

function PalletToShelfHandlePage() {
  const [scanResult, setScanResult] = useState(null);
  const [expectedPalletIDs, setExpectedPalletIDs] = useState([]);
  const [scannedPalletIDs, setScannedPalletIDs] = useState([]);
  const [shelfId, setShelfId] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [scanMode, setScanMode] = useState("pallet"); // "pallet" | "shelf"

  // Handle an incoming scan result
  useEffect(() => {
    if (!scanResult) return;

    const raw = String(scanResult).trim();

    if (scanMode === "pallet") {
      if (!raw.startsWith("PALLET_")) {
        setSnackbarMsg("Invalid QR: please scan a Pallet (PALLET_...)");
      } else {
        const palletId = raw; // keep the full "PALLET_xxx"
        if (!expectedPalletIDs.includes(palletId)) {
          setScannedPalletIDs((prev) => [...prev, palletId]);
          setExpectedPalletIDs((prev) => [...prev, palletId]);
        }
        setScanMode("shelf");
        setSnackbarMsg("Pallet scanned. Now scan the shelf.");
      }
    } else if (scanMode === "shelf") {
      if (!raw.startsWith("SHELF_")) {
        setSnackbarMsg("Invalid QR: please scan a Shelf (SHELF_...)");
      } else {
        const shelf_id = raw.replace("SHELF_", "");
        setShelfId(shelf_id);
        setSnackbarMsg("Shelf scanned. Ready to assign.");
      }
    }

    setScanResult(null);
  }, [scanResult, scanMode, expectedPalletIDs]);

  const handleSubmit = async () => {
    if (!shelfId || scannedPalletIDs.length === 0) {
      setSnackbarMsg("Scan a pallet and a shelf first.");
      return;
    }

    try {
      await api.post(`/pallets/assign-shelf`, {
        shelfId,
        palletId: scannedPalletIDs[0].replace("PALLET_", ""), // assign first scanned
      });

      setSnackbarMsg(`Pallet assigned to shelf successfully.`);
      handleCancel(); // reset
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
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
            Pallet → Shelf Loading Station
          </Typography>

          <Stack spacing={3} alignItems="center" mt={2}>
            {/* STRICTLY positioning changes start */}
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  border: "3px solid",
                  borderColor:
                    scanMode === "pallet" ? "primary.main" : "success.main",
                  borderRadius: 2,
                  p: 2,
                  width: "100%",
                  maxWidth: 520,
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  mx: "auto",
                }}
              >
                <Typography variant="h6" mb={1} textAlign="center">
                  {scanMode === "pallet"
                    ? "Scan Pallet QR Code"
                    : "Scan Shelf QR Code"}
                </Typography>

                {/* This wrapper centers whatever the QRScanner renders (video/canvas/div) */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    "& video, & canvas, & > *": {
                      display: "block",
                      margin: "0 auto",
                    },
                  }}
                >
                  <QRScanner onResult={setScanResult} />
                </Box>
              </Box>
            </Box>
            {/* STRICTLY positioning changes end */}

            <Grow in={!!(scannedPalletIDs.length || shelfId)}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  maxWidth: 500,
                  backgroundColor: "rgba(255,255,255,0.95)",
                }}
              >
                <Typography variant="body1">
                  Scanned Pallets: {scannedPalletIDs.length}
                </Typography>

                <Stack spacing={1} mt={2}>
                  {scannedPalletIDs.map((id, idx) => (
                    <Paper
                      key={id}
                      elevation={0}
                      sx={{ p: 1, border: "1px solid #eee" }}
                    >
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

            <Stack direction="row" spacing={2} mt={1}>
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

export default PalletToShelfHandlePage;
