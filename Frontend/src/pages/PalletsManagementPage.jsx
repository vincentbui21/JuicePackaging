import { useEffect, useState, useMemo } from "react";
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
  List,
  ListItem,
  ListItemText,
  Chip, // <-- added
} from "@mui/material";
import { QrCode, Print, Delete, Visibility, Add } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from '../services/send_to_printer'

function PalletsManagementPage() {
  const [pallets, setPallets] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");

  const [capacity, setCapacity] = useState(8);
  const [newCity, setNewCity] = useState("");

  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [boxList, setBoxList] = useState([]);
  const [selectedPalletId, setSelectedPalletId] = useState(null);

  const [snackbarMsg, setSnackbarMsg] = useState("");

  // NEW: lightweight client-side search for pallets (by id/status/location)
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity) fetchPallets();
  }, [selectedCity]);

  const fetchCities = async () => {
    try {
      const res = await api.get("/cities");
      const list = Array.isArray(res.data)
        ? res.data.map((c) => (typeof c === "string" ? c : c.location)).filter(Boolean)
        : [];
      setCities(list);
      if (list.length && !selectedCity) setSelectedCity(list[0]);
    } catch (err) {
      console.error("Failed to fetch cities", err);
      setSnackbarMsg("Failed to load cities");
    }
  };

  const fetchPallets = async () => {
    try {
      const res = await api.get(`/pallets?location=${encodeURIComponent(selectedCity)}`);
      const arr = Array.isArray(res.data) ? res.data : [];
      setPallets(arr);
      if (!arr.length) setSnackbarMsg("No pallets found in this city");
    } catch (err) {
      console.error("Failed to fetch pallets", err);
      setSnackbarMsg("Failed to load pallets");
    }
  };

  const handleCreatePallet = async () => {
    try {
      await api.post("/pallets", { location: selectedCity, capacity: Number(capacity) || 8 });
      setSnackbarMsg("Pallet created");
      fetchPallets();
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg("Creation failed");
    }
  };

  const handleAddCity = async () => {
    const name = newCity.trim();
    if (!name) return setSnackbarMsg("City name is required");
    if (cities.includes(name)) return setSnackbarMsg("City already exists");
    try {
      await api.post("/cities", { name });
      setCities((prev) => [...prev, name].sort());
      setNewCity("");
      setSelectedCity(name);
      setSnackbarMsg("City added");
    } catch (err) {
      console.error("Failed to add city", err);
      setSnackbarMsg("Failed to add city");
    }
  };

  const handleShowQR = async (pallet_id) => {
    const img = await generateSmallPngQRCode(`PALLET_${pallet_id}`);
    setQrImage(img);
    setSelectedPalletId(pallet_id); // <-- ADD THIS
    setQrDialogOpen(true);
  };

  const handlePrint = (id) => {
    // if (!qrImage) return;
    // const popup = window.open("", "_blank");
    // popup.document.write(`
    //   <html><head><title>Print QR Code</title></head><body style="text-align:center;">
    //   <img src="${qrImage}" style="width: 120px; height: 120px; object-fit: contain;" />
    //   <script>window.onload = function() { window.print(); window.onafterprint = () => window.close(); }</script>
    //   </body></html>
    // `);
    // popup.document.close();

    printImage(qrImage, id)
  };

  const handleDelete = async (pallet_id) => {
    try {
      await api.delete(`/pallets/${pallet_id}`);
      setSnackbarMsg("Pallet deleted");
      fetchPallets();
    } catch (err) {
      console.error("Failed to delete pallet", err);
      setSnackbarMsg("Failed to delete pallet");
    }
  };

  const handleViewBoxes = async (pallet_id) => {
    try {
      const res = await api.get(`/pallets/${pallet_id}/boxes`);
      setBoxList(Array.isArray(res.data) ? res.data : []);
      setSelectedPalletId(pallet_id);
      setBoxDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch boxes for pallet", err);
      setSnackbarMsg("Failed to load boxes");
    }
  };

  // NEW: filtered pallets (client-side)
  const filteredPallets = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return pallets;
    return pallets.filter((p) => {
      const id = String(p.pallet_id || "").toLowerCase();
      const status = String(p.status || "").toLowerCase();
      const loc = String(p.location || "").toLowerCase();
      return id.includes(q) || status.includes(q) || loc.includes(q);
    });
  }, [pallets, searchText]);

  const columns = [
    { field: "pallet_id", headerName: "Pallet ID", flex: 1.5 },
    { field: "location", headerName: "City", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "capacity", headerName: "Capacity", flex: 0.8 },
    { field: "holding", headerName: "Holding", flex: 0.8 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.2,
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
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Pallet Management
          </Typography>

          {/* Toolbar */}
          <Box component={Paper} elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center" justifyContent="center">
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  select
                  label="Select City"
                  fullWidth
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  {cities.map((city) => (
                    <MenuItem key={city} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* <Grid item xs={6} sm={3} md={2}>
                <TextField
                  label="Capacity"
                  fullWidth
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </Grid> */}

              {/* <Grid item xs={6} sm={3} md={2}>
                <Button fullWidth variant="contained" onClick={handleCreatePallet}>
                  Create Pallet
                </Button>
              </Grid> */}

              {/* <Grid item xs={12} sm={6} md={5}>
                <TextField
                  label="Add New City"
                  fullWidth
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={handleAddCity} edge="end" aria-label="add city">
                        <Add />
                      </IconButton>
                    ),
                  }}
                />
              </Grid> */}

              {/* NEW: search input (purely client-side) */}
              {/* <Grid item xs={12} sm={6} md={5}>
                <TextField
                  label="Search pallets (id / status / city)"
                  fullWidth
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Grid> */}
            </Grid>
          </Box>

          {/* Table */}
          <Box sx={{ backgroundColor: "white", borderRadius: 2 }}>
            <DataGrid
              rows={filteredPallets.map((p, i) => ({ ...p, id: i }))}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 20, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3 }}
            />
          </Box>
        </Paper>
      </Box>

      {/* QR dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center">
          <img src={qrImage} alt="QR Code" style={{ width: 100 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button onClick={()=> {handlePrint(selectedPalletId)}} variant="contained" startIcon={<Print />}>
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boxes on pallet */}
      <Dialog open={boxDialogOpen} onClose={() => setBoxDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Boxes on Pallet {selectedPalletId}</DialogTitle>
        <DialogContent dividers>
          {boxList.length === 0 ? (
            <Typography>No boxes on this pallet.</Typography>
          ) : (
            <>
              {/* NEW: customer summary chips */}
              {boxList.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  {Object.entries(
                    boxList.reduce((acc, b) => {
                      const key = b.customer_name || b.customer_id || "Unknown";
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([label, count]) => (
                    <Chip key={label} label={`${label}: ${count}`} sx={{ mr: 1, mb: 1 }} />
                  ))}
                </Box>
              )}

              <List dense>
                {boxList.map((b, idx) => (
                  <ListItem key={idx} disableGutters>
                    <ListItemText
                      primary={b.box_id || b.id || `BOX_${idx + 1}`}
                      secondary={
                        [
                          b.customer_name ? `Customer: ${b.customer_name}` : null,
                          b.order_id ? `Order: ${b.order_id}` : null,
                          b.created_at ? `Created: ${new Date(b.created_at).toLocaleString()}` : null,
                        ]
                          .filter(Boolean)
                          .join("  •  ")
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
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
    </>
  );
}

export default PalletsManagementPage;
