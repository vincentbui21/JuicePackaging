import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Snackbar,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from "@mui/material";
import { QrCode, Print, Delete, Visibility } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import backgroundomena from "../assets/backgroundomena.jpg";

function ShelvesManagementPage() {
  const [shelves, setShelves] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [palletContent, setPalletContent] = useState(null);
  const [boxesOnShelf, setBoxesOnShelf] = useState([]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchShelves();
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const res = await api.get("/locations");
      setLocations(res.data || []);
      if (res.data.length > 0) {
        setSelectedLocation(res.data[0].location);
      }
    } catch (err) {
      console.error("Failed to fetch shelf locations", err);
    }
  };

  const fetchShelves = async () => {
    try {
      const res = await api.get(`/api/shelves/${selectedLocation}`);
      setShelves(res.data || []);
    } catch (err) {
      console.error("Failed to fetch shelves", err);
      setSnackbarMsg("Failed to load shelves");
    }
  };

  const handleShowQR = async (shelf_id) => {
    const img = await generateSmallPngQRCode("SHELF_" + shelf_id);
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

  const handleDelete = async (shelf_id) => {
    try {
      await api.delete(`/shelves/${shelf_id}`);
      setSnackbarMsg("Shelf deleted");
      fetchShelves();
    } catch (err) {
      console.error("Failed to delete shelf", err);
      setSnackbarMsg("Failed to delete shelf");
    }
  };

  const handleViewContents = async (shelf_id) => {
    try {
      const res = await api.get(`/shelves/${shelf_id}/contents`);
      setPalletContent(res.data.pallet);
      setBoxesOnShelf(res.data.boxes || []);
      setContentDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch shelf contents", err);
      setSnackbarMsg("No pallet or boxes found for this shelf");
    }
  };

  const columns = [
    { field: "shelf_id", headerName: "Shelf ID", flex: 2 },
    { field: "location", headerName: "Location", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "capacity", headerName: "Capacity", flex: 1 },
    { field: "holding", headerName: "Holding", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 2,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleShowQR(params.row.shelf_id)}>
            <QrCode />
          </IconButton>
          <IconButton color="info" onClick={() => handleViewContents(params.row.shelf_id)}>
            <Visibility />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.shelf_id)}>
            <Delete />
          </IconButton>
        </>
      )
    }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: `url(${backgroundomena})`,
      backgroundSize: "cover",
      backgroundPosition: "fixed",
      backgroundRepeat: "no-repeat",
    }}>
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
          Shelves Management
        </Typography>
      </Box>

      <Box component={Paper} elevation={3} sx={{
        p: 2, mb: 2, mx: 'auto', backgroundColor: '#dcd2ae',
        borderRadius: 2, width: 'min(1200px, 95%)'
      }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Select Location"
              fullWidth
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              sx={{ backgroundColor: "white", borderRadius: 1 }}
            >
              {locations.map((locObj) => (
                <MenuItem key={locObj.location} value={locObj.location}>
                  {locObj.location}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mx: 'auto', width: 'min(1200px, 95%)', backgroundColor: "white", borderRadius: 2 }}>
        <DataGrid
          rows={shelves.map((s, i) => ({ ...s, id: i }))}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3 }}
        />
      </Box>

      {/* QR Dialog */}
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

      {/* Pallet and Box Contents Dialog */}
      <Dialog open={contentDialogOpen} onClose={() => setContentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pallet & Boxes on Shelf</DialogTitle>
        <DialogContent dividers>
          {palletContent ? (
            <>
              <Typography variant="subtitle1"><strong>Pallet ID:</strong> {palletContent.pallet_id}</Typography>
              <Typography variant="subtitle1"><strong>Status:</strong> {palletContent.status}</Typography>
              <Typography variant="subtitle1"><strong>Holding:</strong> {palletContent.holding} / {palletContent.capacity}</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>Boxes:</Typography>
              {boxesOnShelf.length === 0 ? (
                <Typography>No boxes on this pallet.</Typography>
              ) : (
                boxesOnShelf.map((box, i) => (
                  <Box key={i} sx={{ mb: 2, p: 1, border: "1px solid #ccc", borderRadius: 1 }}>
                    <Typography><strong>Box ID:</strong> {box.box_id}</Typography>
                    <Typography><strong>Customer:</strong> {box.customer_id}</Typography>
                    <Typography><strong>Pouch Count:</strong> {box.pouch_count}</Typography>
                    <Typography><strong>Created:</strong> {new Date(box.created_at).toLocaleDateString()}</Typography>
                  </Box>
                ))
              )}
            </>
          ) : (
            <Typography>No pallet assigned to this shelf.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContentDialogOpen(false)}>Close</Button>
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

export default ShelvesManagementPage;
