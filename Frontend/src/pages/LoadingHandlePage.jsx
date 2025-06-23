import { Box, Typography, Card, CardContent, Stack, Button, Snackbar } from "@mui/material";
import backgroundomena from "../assets/backgroundomena.jpg";
import { useEffect, useState } from "react";
import QrScanner from "../components/QrScanner";
import axios from "axios";

function LoadingHandlePage() {
  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.height = "100vh";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundPosition = "";
      document.body.style.height = "";
      document.body.style.margin = "";
      document.body.style.overflow = "";
    };
  }, []);

  const [crateIds, setCrateIds] = useState([]);
  const [palletId, setPalletId] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const handleScan = (data) => {
    if (!data) return;

    if (data.startsWith("QR_PALLET_") && !palletId) {
      setPalletId(data);
      console.log("Pallet scanned:", data);
    } else if (data.startsWith("QR_CRATE_") && !crateIds.includes(data)) {
      setCrateIds((prev) => [...prev, data]);
      console.log("Crate scanned:", data);
    } else {
      console.warn("Unrecognized or duplicate QR:", data);
    }
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post("http://localhost:3001/api/assign-pallet", {
        pallet_id: palletId,
        crate_ids: crateIds,
      });
      setSnackbarMsg("Crates assigned to pallet successfully!");
      setCrateIds([]);
      setPalletId(null);
    } catch (err) {
      console.error(err);
      setSnackbarMsg("Failed to assign pallet");
    } finally {
      setSnackbarOpen(true);
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <Typography
        variant="h4"
        sx={{ background: "#a9987d", p: 2, borderRadius: 2, color: "white" }}
      >
        Box Loading Station
      </Typography>

      <Box sx={{ mt: 3, width: "100%", maxWidth: 500 }}>
        <QrScanner onScan={handleScan} onError={handleError} />

        <Typography variant="h6" sx={{ mt: 3, color: "white" }}>
          Pallet:
        </Typography>
        {palletId ? (
          <Card sx={{ backgroundColor: "#fff" }}>
            <CardContent>
              <Typography>Pallet QR: {palletId}</Typography>
            </CardContent>
          </Card>
        ) : (
          <Typography sx={{ color: "#fff" }}>No pallet scanned</Typography>
        )}

        <Typography variant="h6" sx={{ mt: 3, color: "white" }}>
          Crates:
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {crateIds.map((code, index) => (
            <Card key={index} sx={{ backgroundColor: "#fff" }}>
              <CardContent>
                <Typography>Crate QR: {code}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Button
          variant="contained"
          sx={{ mt: 3, bgcolor: "#5a8f61" }}
          disabled={!palletId || crateIds.length === 0}
          onClick={handleSubmit}
        >
          Submit to Backend
        </Button>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMsg}
        />
      </Box>
    </Box>
  );
}

export default LoadingHandlePage;
