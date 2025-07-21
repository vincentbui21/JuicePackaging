import { useEffect, useState } from "react";
import {
  Box, Button, Typography, Snackbar, Alert, Stack, Paper
} from "@mui/material";
import QRScanner from "../components/qrscanner";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";

function LoadingHandlePage() {
  const [scanResult, setScanResult] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [expectedBoxIDs, setExpectedBoxIDs] = useState([]);
  const [scannedBoxIDs, setScannedBoxIDs] = useState([]);
  const [palletId, setPalletId] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [scanMode, setScanMode] = useState("box");

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    return () => {
      document.body.style = "";
    };
  }, []);

  useEffect(() => {
    const processScan = async () => {
      console.log("Scanned QR code:", scanResult);
      if (!scanResult) return;
     

      if (scanMode === "box" && scanResult.startsWith("BOX_")) {
        const parts = scanResult.split("_");
        const scannedOrderId = parts[1];
        const boxId = scanResult;

        if (!orderId) {
          try {
            const res = await api.get(`/orders/${scannedOrderId}`);
            const order = res.data;
            const weight = order.weight_kg;
            const pouchCount = Math.floor((weight * 0.65) / 3);
            const totalBoxes = Math.ceil(pouchCount / 8);

            const boxList = Array.from({ length: totalBoxes }, (_, i) =>
              `CRATE_${scannedOrderId}_${i + 1}`
            );

            setOrderId(scannedOrderId);
            setCustomerName(order.name);
            setExpectedBoxIDs(boxList);
            setScannedBoxIDs([boxId]);
          } catch (err) {
            setSnackbarMsg("Invalid box QR or order not found.");
          }
        } else {
          const isExpected = expectedBoxIDs.includes(boxId);
          const isScanned = scannedBoxIDs.includes(boxId);

          if (isExpected && !isScanned) {
            setScannedBoxIDs(prev => [...prev, boxId]);
          } else {
            setSnackbarMsg("Box already scanned or invalid.");
          }
        }
      }

      if (scanMode === "pallet" && scanResult.startsWith("PALLET_")) {
        setPalletId(scanResult.replace("PALLET_", ""));
        setSnackbarMsg("Pallet scanned successfully.");
      }

      setScanResult(null); // reset after handling
    };

    processScan();
  }, [scanResult]);

  useEffect(() => {
    console.log("Current scan mode:", scanMode);
  }, [scanMode]);
  
  useEffect(() => {
    if (orderId && expectedBoxIDs.length > 0 && scannedBoxIDs.length === expectedBoxIDs.length) {
      setScanMode("pallet");
      setSnackbarMsg("All boxes scanned. Now scan the pallet.");
    } 
  }, [scannedBoxIDs]);

  const handleSubmit = async () => {
    try {
      await api.post(`/loading/complete`, {
        order_id: orderId,
        pallet_id: palletId,
        boxes: scannedBoxIDs
      });

      await api.post(`/orders/${orderId}/ready`);

      setSnackbarMsg(`Order for ${customerName} is ready for pickup!`);

      // Reset
      setScanResult(null);
      setOrderId(null);
      setCustomerName("");
      setExpectedBoxIDs([]);
      setScannedBoxIDs([]);
      setPalletId(null);
      setScanMode("box");
    } catch (err) {
      console.error(err);
      setSnackbarMsg("Failed to complete loading.");
    }
  };

  const handleCancel = () => {
    setScanResult(null);
    setOrderId(null);
    setCustomerName("");
    setExpectedBoxIDs([]);
    setScannedBoxIDs([]);
    setPalletId(null);
    setScanMode("box");
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
          mx: "auto"
        }}
      >
        Loading Station
      </Typography>

      <Stack spacing={3} alignItems="center" mt={4}>
        <QRScanner onResult={setScanResult} />

        {customerName && (
          <Typography variant="h6">Customer: {customerName}</Typography>
        )}

        <Typography variant="body1">
          Scanned Boxes: {scannedBoxIDs.length} / {expectedBoxIDs.length}
        </Typography>

        <Stack spacing={1}>
          {scannedBoxIDs.map((id, idx) => (
            <Paper key={id} elevation={2} sx={{ p: 1, width: 250 }}>
              <Typography variant="body2">Box {idx + 1}: {id}</Typography>
            </Paper>
          ))}
        </Stack>

        {palletId && (
          <Typography variant="subtitle1" mt={2}>Pallet ID: {palletId}</Typography>
        )}

        <Stack direction="row" spacing={2} mt={2}>
          {scannedBoxIDs.length > 0 && (
            <Button variant="outlined" color="error" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {scannedBoxIDs.length === expectedBoxIDs.length && palletId && (
            <Button variant="contained" color="success" onClick={handleSubmit}>
              Submit
            </Button>
          )}
        </Stack>
      </Stack>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg("")}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LoadingHandlePage;
