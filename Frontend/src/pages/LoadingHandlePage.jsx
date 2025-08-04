import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import QRScanner from "../components/qrcamscanner";
import backgroundomena from "../assets/backgroundomena.jpg";
import api from "../services/axios";

const LOCATIONS = ["Kuopio", "Mikkeli", "Varkaus", "Lapinlahti", "Joensuu", "Lahti"];

function LoadingHandlePage() {
  const [location, setLocation] = useState("");
  const [scannerMode, setScannerMode] = useState("box");
  const [scannedBoxes, setScannedBoxes] = useState([]);
  const [expectedBoxes, setExpectedBoxes] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    return () => (document.body.style = "");
  }, []);

  const handleScan = async (data) => {
    if (!data || !location) return;

    if (scannerMode === "box") {
      if (!data.startsWith("CRATE_")) {
        setSnackbarMsg("Invalid box QR code");
        return;
      }
      const parts = data.split("_");
      const scannedOrderId = parts[1];
      const boxNumber = parts[2];

      if (!orderId) {
        try {
          const res = await api.get(`/orders/${scannedOrderId}`);
          const pouches = Math.floor((res.data.weight_kg * 0.65) / 3);
          const totalBoxes = Math.ceil(pouches / 8);
          setOrderId(scannedOrderId);
          setCustomer(res.data.name);
          setExpectedBoxes(totalBoxes);
        } catch (err) {
          setSnackbarMsg("Failed to load order details");
          return;
        }
      }

      const boxKey = `${scannedOrderId}_${boxNumber}`;
      if (!scannedBoxes.includes(boxKey)) {
        setScannedBoxes((prev) => [...prev, boxKey]);
      }

      if (scannedBoxes.length + 1 === expectedBoxes) {
        setScannerMode("pallet");
        setSnackbarMsg("All boxes scanned! Now scan the pallet.");
      }
    }

    if (scannerMode === "pallet") {
      if (!data.startsWith("PALLET_")) {
        setSnackbarMsg("Invalid pallet QR code");
        return;
      }

      const palletId = data.replace("PALLET_", "");
      try {
        await api.post(`/loading/complete`, {
          order_id: orderId,
          location,
          pallet_id: palletId,
          boxes: scannedBoxes,
        });
        setSnackbarMsg("Order loaded and ready for pickup!");
        resetState();
      } catch (err) {
        console.error(err);
        setSnackbarMsg("Failed to complete loading");
      }
    }
  };

  const resetState = () => {
    setOrderId(null);
    setCustomer(null);
    setScannedBoxes([]);
    setExpectedBoxes(0);
    setScannerMode("box");
  };

  return (
    <Box textAlign="center" p={3}>
      <Typography
        variant="h4"
        sx={{
          background: "#b6a284",
          color: "white",
          p: 2,
          borderRadius: 2,
          width: "fit-content",
          margin: "auto",
        }}
      >
        Loading Station
      </Typography>

      <Box mt={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Location</InputLabel>
          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            label="Select Location"
          >
            {LOCATIONS.map((city) => (
              <MenuItem key={city} value={city}>
                {city}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box mt={4}>
        <Typography variant="h6">Camera</Typography>
        <Box
          sx={{
            width: 300,
            height: 200,
            margin: "auto",
            backgroundColor: "#dcd2ae",
            borderRadius: 2,
          }}
        >
          <QRScanner onScan={handleScan} continuous={true} />
        </Box>
        <Typography mt={1}>
          {scannerMode === "box"
            ? "Please scan each box QR code"
            : "Scan the assigned pallet QR code"}
        </Typography>
      </Box>

      <Box mt={2}>
        <Typography>
          Scanned Boxes: {scannedBoxes.length}/{expectedBoxes}
        </Typography>
        {customer && <Typography>Customer: {customer}</Typography>}
      </Box>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </Box>
  );
}

export default LoadingHandlePage;
