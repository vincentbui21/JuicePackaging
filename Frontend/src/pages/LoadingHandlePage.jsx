// LoadingHandlePage.jsx – polished loading workflow with validation, animations, and tracking
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Fade,
} from "@mui/material";
import QrScanner from "../components/qrscanner";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";

function LoadingHandlePage() {
  const [scanning, setScanning] = useState(false);
  const [city, setCity] = useState("");
  const [expectedBoxes, setExpectedBoxes] = useState(0);
  const [scannedBoxes, setScannedBoxes] = useState([]);
  const [scannedOrder, setScannedOrder] = useState(null);
  const [palletScanned, setPalletScanned] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mode, setMode] = useState("box");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    return () => {
      document.body.style = "";
    };
  }, []);

  const handleScan = async (data) => {
    if (!data || data === "No QR code found.") return;
    if (loading) return;
    setError("");

    if (mode === "box") {
      setLoading(true);
      try {
        const response = await api.get(`/box/${data}`);
        const box = response.data;

        if (!scannedOrder) {
          setScannedOrder({
            order_id: box.order_id,
            customer_name: box.customer_name,
          });
          const countRes = await api.get(`/boxes/count/${box.order_id}`);
          setExpectedBoxes(countRes.data.count);
        }

        const alreadyScanned = scannedBoxes.some(b => b.box_id === box.box_id);
        if (!alreadyScanned) {
          setScannedBoxes(prev => [...prev, box]);
        } else {
          setError("Box already scanned.");
        }
      } catch (err) {
        console.error(err);
        setError("Invalid or unregistered box.");
      } finally {
        setLoading(false);
      }
    } else if (mode === "pallet") {
      setPalletScanned(true);
      setNotificationOpen(true);
    }
  };

  const handleStartScan = () => {
    if (!city) {
      setError("Please select a city to continue.");
      return;
    }
    setScanning(true);
    setMode("box");
  };

  const handleScanPallet = () => {
    setMode("pallet");
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="center">
        <Typography
          variant="h6"
          sx={{
            fontSize: "clamp(20px, 5vw, 40px)",
            textAlign: "center",
            paddingTop: "10px",
            paddingBottom: "10px",
            marginBottom: "10px",
            color: "black",
            background: "#a9987d",
            width: "min(1200px, 90%)",
            borderRadius: "10px",
          }}
        >
          Loading Handle Page
        </Typography>
      </Box>

      {!scanning ? (
        <Box component={Paper} elevation={3} sx={{ p: 2, mb: 2, mx: 'auto', backgroundColor: '#dcd2ae', borderRadius: 2, width: 'min(600px, 95%)' }}>
          <FormControl fullWidth>
            <InputLabel id="city-label">Select City</InputLabel>
            <Select
              labelId="city-label"
              value={city}
              label="Select City"
              onChange={(e) => setCity(e.target.value)}
              sx={{ backgroundColor: "white", borderRadius: 1 }}
            >
              <MenuItem value="Kuopio">Kuopio</MenuItem>
              <MenuItem value="Mikkeli">Mikkeli</MenuItem>
              <MenuItem value="Varkaus">Varkaus</MenuItem>
              <MenuItem value="Lapinlahti">Lapinlahti</MenuItem>
              <MenuItem value="Joensuu">Joensuu</MenuItem>
              <MenuItem value="Lahti">Lahti</MenuItem>
            </Select>
          </FormControl>
          <Button onClick={handleStartScan} variant="contained" fullWidth sx={{ mt: 2 }}>
            Start Scan
          </Button>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      ) : (
        <>
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <Box sx={{ maxWidth: 400, width: '100%' }}>
              <QrScanner onScan={handleScan} />
            </Box>
            <Fade in={true} timeout={800}>
              <Typography mt={2} sx={{ fontWeight: 'bold', color: 'white', textShadow: '1px 1px 3px black' }}>
                {mode === "box" ? "Scan all boxes before pallet..." : "Now scan the pallet."}
              </Typography>
            </Fade>
            {loading && <CircularProgress size={32} sx={{ mt: 2 }} />}
          </Box>

          <Paper sx={{ mt: 2, p: 2, backgroundColor: '#dcd2ae', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Scanned Boxes ({scannedBoxes.length}/{expectedBoxes})
            </Typography>
            <List>
              {scannedBoxes.map((box, idx) => (
                <ListItem key={idx}>
                  <ListItemText
                    primary={`Box ${box.box_number}`}
                    secondary={`Order: ${box.order_id} | Customer: ${box.customer_name}`}
                  />
                </ListItem>
              ))}
            </List>
            {scannedBoxes.length === expectedBoxes && !palletScanned && (
              <Button onClick={handleScanPallet} fullWidth variant="contained" color="success">
                Scan Pallet
              </Button>
            )}
            {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
          </Paper>
        </>
      )}

      <Snackbar
        open={notificationOpen}
        autoHideDuration={5000}
        onClose={() => setNotificationOpen(false)}
      >
        <Alert onClose={() => setNotificationOpen(false)} severity="success" sx={{ width: '100%' }}>
          ✅ Order is ready for pickup!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default LoadingHandlePage;
