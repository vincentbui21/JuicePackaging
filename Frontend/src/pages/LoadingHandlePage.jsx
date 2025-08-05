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
  Paper
} from "@mui/material";
import QRScanner from "../components/qrcamscanner";
import backgroundomena from "../assets/backgroundomena.jpg";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";

const LOCATIONS = ["Kuopio", "Mikkeli", "Varkaus", "Lapinlahti", "Joensuu", "Lahti"];

function LoadingHandlePage() {
  const [location, setLocation] = useState("");
  const [scannerMode, setScannerMode] = useState("box");
  const [scannedBoxes, setScannedBoxes] = useState([]);
  const [expectedBoxes, setExpectedBoxes] = useState(0);
  const [orderId, setOrderId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");

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
    <>
      <DrawerComponent> </DrawerComponent>

      <Box
      sx={
          {
              backgroundColor: "#fffff",
              minHeight: "90vh",
              paddingTop: 4,
              paddingBottom: 4,
              display: "flex",
              justifyContent: "center"
          }
      }>
          <Paper elevation={3} sx={{
              width: "min(90%, 800px)",
              padding: 4,
              backgroundColor: "#ffffff",
              borderRadius: 2
          }}>

            <Typography
              variant="h4" sx={{ textAlign: "center", fontWeight: 'bold' }}
            >
              Loading Station
            </Typography>

            <Box textAlign="center" p={3}>
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

              <Box mt={4} sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center", 
                justifyContent: "center"
              }}>
                {/* <Typography variant="h6">Camera</Typography> */}

                <QRScanner onScan={handleScan} continuous={true} />

                <Typography mt={1} variant="subtitle1"   
                  sx={{
                    fontStyle: 'italic',
                    color: 'text.secondary',
                    textAlign: 'center'
                  }}>
                  {scannerMode === "box"
                    ? "Please scan each box QR code"
                    : "Scan the assigned pallet QR code"}
                </Typography>
              </Box>

              <Box mt={2}>
                <Typography>
                  <b>Scanned Boxes:</b> {scannedBoxes.length}/{expectedBoxes}
                </Typography>
                {customer && <Typography><b>Customer:</b> {customer}</Typography>}
              </Box>

              <Snackbar
                open={!!snackbarMsg}
                autoHideDuration={3000}
                onClose={() => setSnackbarMsg("")}
                message={snackbarMsg}
              />
            </Box>
          </Paper>
      </Box>

    </>
  );
}

export default LoadingHandlePage;
