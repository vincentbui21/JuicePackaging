import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Snackbar,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText
} from "@mui/material";
import { QrCode, Print, Delete, Visibility } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from '../services/send_to_printer'


function ShelvesManagementPage() {
  const [shelves, setShelves] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [palletContent, setPalletContent] = useState(null);
  const [boxesOnShelf, setBoxesOnShelf] = useState([]);

  const [snackbarMsg, setSnackbarMsg] = useState("");

  // NEW: keep the readable name for the QR dialog/print
  const [qrShelfName, setQrShelfName] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) fetchShelves();
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const res = await api.get("/locations");
      const list = Array.isArray(res.data)
        ? res.data.map((v) => (typeof v === "string" ? v : v.location)).filter(Boolean)
        : [];
      setLocations(list);
      if (list.length) setSelectedLocation(list[0]);
    } catch (err) {
      console.error("Failed to fetch shelf locations", err);
      setSnackbarMsg("Failed to load locations");
    }
  };

  const fetchShelves = async () => {
    try {
      const res = await api.get(`/api/shelves/${encodeURIComponent(selectedLocation)}`);
      setShelves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch shelves", err);
      setSnackbarMsg("Failed to load shelves");
    }
  };

  // UPDATED: accept entire row so we can grab shelf_name for the dialog/print
  const handleShowQR = async (shelf) => {
    const img = await generateSmallPngQRCode(`SHELF_${shelf.shelf_id}`);
    setQrImage(img);
    setQrShelfName(shelf.shelf_name || ""); // NEW
    setQrDialogOpen(true);

    setPalletContent(shelf.pallet); // if pallet info is part of the row API
    setSelectedLocation(shelf.location); // city/location
  };

  const handlePrint = (name, city) => {
    // if (!qrImage) return;
    // const popup = window.open("", "_blank");
    // popup.document.write(`
    //   <html><head><title>Print QR Code</title></head>
    //   <body style="text-align:center;padding:20px;font-family:Arial, Helvetica, sans-serif;">
    //     <img src="${qrImage}" style="width:200px;" />
    //     ${qrShelfName ? `<div style="margin-top:12px;font-size:18px;font-weight:bold;">${qrShelfName}</div>` : ""}
    //     <script>
    //       window.onload = function() {
    //         window.print();
    //         window.onafterprint = () => window.close();
    //       }
    //     </script>
    //   </body></html>
    // `);
    // popup.document.close();

    printImage(qrImage, `${name || qrShelfName} ${city ? `(${city})` : ""}`.trim())
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
      setPalletContent(res.data?.pallet ?? null);
      setBoxesOnShelf(Array.isArray(res.data?.boxes) ? res.data.boxes : []);
      setContentDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch shelf contents", err);
      setPalletContent(null);
      setBoxesOnShelf([]);
      setContentDialogOpen(true);
      setSnackbarMsg("No pallet or boxes found for this shelf");
    }
  };

  const columns = [
    { field: "shelf_id", headerName: "Shelf ID", flex: 1.5 },
    // NEW: show the human-readable shelf name
    { field: "shelf_name", headerName: "Shelf Name", flex: 1 },
    { field: "location", headerName: "Location", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "capacity", headerName: "Capacity", flex: 0.8 },
    { field: "holding", headerName: "Holding", flex: 0.8 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.4,
      sortable: false,
      renderCell: (params) => (
        <>
          {/* UPDATED: pass the whole row so we can read shelf_name */}
          <IconButton color="primary" onClick={() => handleShowQR(params.row)}>
            <QrCode />
          </IconButton>
          <IconButton color="info" onClick={() => handleViewContents(params.row.shelf_id)}>
            <Visibility />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.shelf_id)}>
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <DrawerComponent />

      <Box
        sx={{
          backgroundColor: "#ffffff",
          minHeight: "90vh",
          pt: 4,
          pb: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "min(1200px, 95%)",
            p: 3,
            backgroundColor: "#ffffff",
            borderRadius: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: "center",
              mb: 3,
              fontWeight: "bold",
            }}
          >
            Shelves Management
          </Typography>

          <Box component={Paper} elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center" justifyContent="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  label="Select Location"
                  fullWidth
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ backgroundColor: "white", borderRadius: 2 }}>
            <DataGrid
              rows={shelves.map((s, i) => ({ ...s, id: i }))}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 20, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3 }}
            />
          </Box>
        </Paper>
      </Box>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mt={1}>
            <img src={qrImage} alt="QR Code" style={{ width: 200 }} />
            {/* NEW: human-readable shelf name under the QR */}
            {qrShelfName ? (
              <Typography variant="h6" sx={{ mt: 1, fontWeight: "bold" }}>
                {qrShelfName}
              </Typography>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button 
          onClick={() => handlePrint(palletContent?.pallet_id, selectedLocation)} 
          variant="contained" 
          startIcon={<Print />}
        >
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
                <List dense>
                  {boxesOnShelf.map((box, i) => (
                    <ListItem key={i} disableGutters>
                      <ListItemText
                        primary={box.box_id || `BOX_${i + 1}`}
                        secondary={
                          [
                            box.customer_id ? `Customer: ${box.customer_id}` : null,
                            box.pouch_count ? `Pouches: ${box.pouch_count}` : null,
                            box.created_at ? `Created: ${new Date(box.created_at).toLocaleDateString()}` : null,
                          ].filter(Boolean).join("  •  ")
                        }
                      />
                    </ListItem>
                  ))}
                </List>
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
    </>
  );
}

export default ShelvesManagementPage;
