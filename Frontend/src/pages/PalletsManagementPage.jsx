import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import { QrCode, Print, Delete, Visibility } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import backgroundomena from "../assets/backgroundomena.jpg";

function PalletsManagementPage() {
  const [pallets, setPallets] = useState([]);
  const [cities, setCities] = useState(["Lahti", "Kuopio"]);
  const [selectedCity, setSelectedCity] = useState("Lahti");
  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [boxList, setBoxList] = useState([]);
  const [selectedPalletId, setSelectedPalletId] = useState(null);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchPallets();
  }, [selectedCity]);

  const fetchCities = async () => {
    try {
      const res = await api.get("/cities");
      setCities(res.data || []);
    } catch (err) {
      console.error("Failed to fetch cities", err);
    }
  };

  const fetchPallets = async () => {
    try {
      const res = await api.get(`/pallets?location=${selectedCity}`);
      setPallets(Array.isArray(res.data) ? res.data : []);
    if (!res.data || res.data.length === 0) {
  setSnackbarMsg("No pallets found in this city");
}

    } catch (err) {
      console.error("Failed to fetch pallets", err);
    }
  };

  const handleShowQR = async (pallet_id) => {
    const img = await generateSmallPngQRCode("PALLET_" + pallet_id);
    setQrImage(img);
    setQrDialogOpen(true);
  };

  const handlePrint = () => {
    if (qrImage) {
      const popup = window.open("", "_blank");
      popup.document.write(`
        <html><head><title>Print QR Code</title></head><body style="text-align:center;padding:20px;">
        <img src="${qrImage}" style="width:200px;" />
        <script>window.onload = function() { window.print(); window.onafterprint = () => window.close(); }</script>
        </body></html>
      `);
      popup.document.close();
    }
  };

  const handleDelete = async (pallet_id) => {
    try {
      await api.delete(`/pallets/${pallet_id}`);
      fetchPallets();
      setSnackbarMsg("Pallet deleted");
    } catch (err) {
      console.error("Failed to delete pallet", err);
      setSnackbarMsg("Failed to delete pallet");
    }
  };

  const handleViewBoxes = async (pallet_id) => {
    try {
      const res = await api.get(`/pallets/${pallet_id}/boxes`);
      setBoxList(res.data || []);
      setSelectedPalletId(pallet_id);
      setBoxDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch boxes for pallet", err);
      setSnackbarMsg("Failed to load boxes");
    }
  };

  const columns = [
    { field: "pallet_id", headerName: "Pallet ID", flex: 2 },
    { field: "location", headerName: "City", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "capacity", headerName: "Capacity", flex: 1 },
    { field: "holding", headerName: "Holding", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.5,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleShowQR(params.row.pallet_id)}>
            <QrCode />
          </IconButton>
          <IconButton color="info" onClick={() => handleViewBoxes(params.row.pallet_id)}>
            <Visibility />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.pallet_id)}>
            <Delete />
          </IconButton>
        </>
      )
    }
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${backgroundomena})`,
        backgroundSize: "cover",
        backgroundPosition: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
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
          Pallets Management
        </Typography>
      </Box>

      <Box component={Paper} elevation={3} sx={{ p: 2, mb: 2, mx: 'auto', backgroundColor: '#dcd2ae', borderRadius: 2, width: 'min(1200px, 95%)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Select City"
              fullWidth
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              sx={{ backgroundColor: "white", borderRadius: 1 }}
            >
              {cities.map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mx: 'auto', width: 'min(1200px, 95%)', backgroundColor: "white", borderRadius: 2 }}>
        <DataGrid
          rows={pallets.map((p, i) => ({ ...p, id: i }))}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3 }}
        />
      </Box>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center">
            <img src={qrImage} alt="QR Code" style={{ width: 200 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button onClick={handlePrint} variant="contained" startIcon={<Print />}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Box Viewer Dialog */}
      <Dialog open={boxDialogOpen} onClose={() => setBoxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Boxes on Pallet {selectedPalletId}</DialogTitle>
        <DialogContent dividers>
          {boxList.length === 0 ? (
            <Typography>No boxes assigned to this pallet.</Typography>
          ) : (
            boxList.map((box, index) => (
              <Box key={index} sx={{ mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1 }}>
                <Typography><strong>Customer ID:</strong> {box.customer_id}</Typography>
                <Typography><strong>Customer ID:</strong> {box.city}</Typography>
                <Typography><strong>Pouch Count:</strong> {box.pouch_count}</Typography>
                <Typography><strong>Created At:</strong> {new Date(box.created_at).toLocaleDateString()}</Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoxDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </div>
  );
}

export default PalletsManagementPage;
