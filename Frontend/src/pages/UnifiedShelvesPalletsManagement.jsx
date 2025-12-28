import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Snackbar,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Tabs, Tab, Chip
} from "@mui/material";
import { QrCode, Print, Delete, Visibility, Add } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from '../services/send_to_printer'

function UnifiedShelvesPalletsManagement() {
  const [tabValue, setTabValue] = useState(0);

  // Shelves Management states
  const [shelves, setShelves] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [palletContent, setPalletContent] = useState(null);
  const [boxesOnShelf, setBoxesOnShelf] = useState([]);

  const [qrShelfName, setQrShelfName] = useState("");
  const [shelfDetails, setShelfDetails] = useState(null);

  // Pallets Management states
  const [pallets, setPallets] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");

  const [newCity, setNewCity] = useState("");

  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [boxList, setBoxList] = useState([]);
  const [selectedPalletId, setSelectedPalletId] = useState(null);

  const [searchText, setSearchText] = useState("");

  // Create Shelf states
  const [shelfLocation, setShelfLocation] = useState("");
  const [shelfName, setShelfName] = useState("");
  const [createdShelfName, setCreatedShelfName] = useState("");

  // Create Pallet states
  const [palletLocation, setPalletLocation] = useState("");
  const [palletName, setPalletName] = useState("");
  const [createdPalletName, setCreatedPalletName] = useState("");
  const [palletIds, setPalletIds] = useState();

  // Common states
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [error, setError] = useState(false);

  const fetchLocations = useCallback(async () => {
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
  }, []);

  const fetchShelves = useCallback(async () => {
    try {
      const res = await api.get(`/api/shelves/${encodeURIComponent(selectedLocation)}`);
      setShelves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch shelves", err);
      setSnackbarMsg("Failed to load shelves");
    }
  }, [selectedLocation]);

  const fetchCities = useCallback(async () => {
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
  }, [selectedCity]);

  const fetchPallets = useCallback(async () => {
    try {
      const res = await api.get(`/pallets?location=${encodeURIComponent(selectedCity)}`);
      const arr = Array.isArray(res.data) ? res.data : [];
      setPallets(arr);
      if (!arr.length) setSnackbarMsg("No pallets found in this city");
    } catch (err) {
      console.error("Failed to fetch pallets", err);
      setSnackbarMsg("Failed to load pallets");
    }
  }, [selectedCity]);

  // Effects for Shelves
  useEffect(() => {
    if (tabValue === 0 || tabValue === 2) fetchLocations();
  }, [tabValue, fetchLocations]);

  useEffect(() => {
    if (tabValue === 0 && selectedLocation) fetchShelves();
  }, [selectedLocation, tabValue, fetchShelves]);

  // Effects for Pallets
  useEffect(() => {
    if (tabValue === 1 || tabValue === 3) fetchCities();
  }, [tabValue, fetchCities]);

  useEffect(() => {
    if (tabValue === 1 && selectedCity) fetchPallets();
  }, [selectedCity, tabValue, fetchPallets]);

  // Shelves functions
  const handleShowQR = async (shelf) => {
    const img = await generateSmallPngQRCode(`SHELF_${shelf.shelf_id}`);
    setQrImage(img);
    setQrShelfName(shelf.shelf_name || "");
    setQrDialogOpen(true);
    setPalletContent(shelf.pallet);
    setSelectedLocation(shelf.location);
  };

  const handlePrintShelf = (name, city) => {
    printImage(qrImage, `${name || qrShelfName} ${city ? `(${city})` : ""}`.trim())
  };

  const handleDeleteShelf = async (shelf_id) => {
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
    setShelfDetails(null);
    setPalletContent(null);
    setBoxesOnShelf([]);
  
    try {
      const res = await api.get(`/shelves/${shelf_id}/contents`);
      if (res?.data?.ok) {
        setShelfDetails(res.data.shelf ?? null);
        setPalletContent(null);
        setBoxesOnShelf(Array.isArray(res.data.boxes) ? res.data.boxes : []);
        setContentDialogOpen(true);
        return;
      }
    } catch {
    }
  
    try {
      const res = await api.get(`/shelves/${shelf_id}/contents`);
      setShelfDetails(null);
      setPalletContent(res.data?.pallet ?? null);
      setBoxesOnShelf(Array.isArray(res.data?.boxes) ? res.data.boxes : []);
      setContentDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch shelf contents", err);
      setShelfDetails(null);
      setPalletContent(null);
      setBoxesOnShelf([]);
      setContentDialogOpen(true);
      setSnackbarMsg("No pallet or boxes found for this shelf");
    }
  };

  // Pallets functions
  const handleCreatePallet = async () => {
    try {
      await api.post("/pallets", { location: selectedCity });
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

  const handleShowQRPallet = async (pallet_id) => {
    const img = await generateSmallPngQRCode(`PALLET_${pallet_id}`);
    setQrImage(img);
    setSelectedPalletId(pallet_id);
    setQrDialogOpen(true);
  };

  const handlePrintPallet = (id) => {
    printImage(qrImage, id)
  };

  const handleDeletePallet = async (pallet_id) => {
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

  const filteredPallets = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return pallets;
    return pallets.filter((p) => {
      const id = String(p.pallet_id || "").toLowerCase();
      const name = String(p.pallet_name || "").toLowerCase();
      const status = String(p.status || "").toLowerCase();
      const loc = String(p.location || "").toLowerCase();
      return id.includes(q) || name.includes(q) || status.includes(q) || loc.includes(q);
    });
  }, [pallets, searchText]);

  // Create Shelf functions
  const handleCreateShelf = async () => {
    const loc = selectedLocation.trim();
    if (!loc) {
      setError(true);
      setSnackbarMsg("Please enter a shelf location");
      return;
    }

    try {
      const res = await api.post("/api/shelves", {
        location: loc,
        shelf_name: shelfName?.trim() || null,
      });

      const shelf_id = res?.data?.shelf_id ?? res?.data?.result?.shelf_id;
      const returned_name = res?.data?.shelf_name ?? res?.data?.result?.shelf_name;
      if (!shelf_id) throw new Error("Missing shelf_id in server response");

      const qrData = `SHELF_${shelf_id}`;
      const img = await generateSmallPngQRCode(qrData);

      setQrImage(img);
      setCreatedShelfName(returned_name || shelfName || "");
      setQrDialogOpen(true);
      setSnackbarMsg("Shelf created successfully!");
      setShelfName("");
      setError(false);
      
      // Refresh the shelves table to show the new shelf
      fetchShelves();
    } catch (err) {
      console.error("Failed to create shelf:", err);
      setSnackbarMsg("Failed to create shelf. Check server.");
      setError(true);
    }
  };

  const handlePrintCreatedShelf = (name, city) => {
    printImage(qrImage, `${name || createdShelfName} ${city ? `(${city})` : ""}`.trim())
  };

  // Create Pallet functions
  const handleCreateNewPallet = async () => {
    const trimmed = palletLocation.trim();
    if (!trimmed) {
      setSnackbarMsg("Please enter a pallet location");
      setError(true);
      return;
    }

    try {
      const res = await api.post("/pallets", { location: trimmed, pallet_name: palletName?.trim() || null });

      const pallet_id = res?.data?.pallet_id ?? res?.data?.result?.pallet_id;
      if (!pallet_id) throw new Error("Missing pallet_id in response");
      setPalletIds(pallet_id)

      const returned_name = res?.data?.pallet_name ?? res?.data?.result?.pallet_name;
      setCreatedPalletName(returned_name || palletName || "");

      const img = await generateSmallPngQRCode(`PALLET_${pallet_id}`);
      setQrImage(img);
      setQrDialogOpen(true);
      setSnackbarMsg("Pallet created successfully");
      setPalletLocation("");
      setPalletName("");
      setError(false);
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg("Failed to create pallet. Check the server.");
    }
  };

  const handlePrintCreatedPallet = (qrImage, id) => {
    printImage(qrImage, palletIds)
  };

  // Columns
  const shelvesColumns = [
    { field: "shelf_id", headerName: "Shelf ID", flex: 1.5 },
    { field: "shelf_name", headerName: "Shelf Name", flex: 1 },
    { field: "location", headerName: "Location", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "holding", headerName: "Holding", flex: 0.8 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.4,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleShowQR(params.row)}>
            <QrCode />
          </IconButton>
          <IconButton color="info" onClick={() => handleViewContents(params.row.shelf_id)}>
            <Visibility />
          </IconButton>
          <IconButton color="error" onClick={() => handleDeleteShelf(params.row.shelf_id)}>
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  const palletsColumns = [
    { field: "pallet_id", headerName: "Pallet ID", flex: 1.5 },
    { field: "pallet_name", headerName: "Pallet Name", flex: 1.2 },
    { field: "location", headerName: "City", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "holding", headerName: "Holding", flex: 0.8 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.2,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleShowQRPallet(params.row.pallet_id)}>
            <QrCode />
          </IconButton>
          <IconButton color="info" onClick={() => handleViewBoxes(params.row.pallet_id)}>
            <Visibility />
          </IconButton>
          <IconButton color="error" onClick={() => handleDeletePallet(params.row.pallet_id)}>
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
            Unified Shelves and Pallets Management
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label="Shelves Management" />
            <Tab label="Pallets Management" />
            <Tab label="Create Shelf" />
            <Tab label="Create Pallet" />
          </Tabs>

          {tabValue === 0 && (
            <>
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

                  <Grid item xs={12} sm={4} md={3}>
                    <Button fullWidth variant="contained" onClick={handleCreateShelf}>
                      Quick Create Shelf
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ backgroundColor: "white", borderRadius: 2 }}>
                <DataGrid
                  rows={shelves.map((s, i) => ({ ...s, id: i }))}
                  columns={shelvesColumns}
                  autoHeight
                  pageSizeOptions={[10, 20, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3 }}
                />
              </Box>
            </>
          )}

          {tabValue === 1 && (
            <>
              <Box component={Paper} elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center" justifyContent="center">

                  <Grid item xs={12} sm={6} md={5}>
                    <TextField
                      label="Search pallets (id)"
                      fullWidth
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </Grid>

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

                  <Grid item xs={6} sm={3} md={2}>

                    <Button fullWidth variant="contained" onClick={handleCreatePallet}>
                      Quick Create Pallet
                    </Button>
                  </Grid>

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

                  
                </Grid>
              </Box>

              <Box sx={{ backgroundColor: "white", borderRadius: 2 }}>
                <DataGrid
                  rows={filteredPallets.map((p, i) => ({ ...p, id: i }))}
                  columns={palletsColumns}
                  autoHeight
                  pageSizeOptions={[10, 20, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3 }}
                />
              </Box>
            </>
          )}

          {tabValue === 2 && (
            <Box sx={{ p: 2 }}>
              <TextField
                select
                label="Shelf Location"
                variant="filled"
                fullWidth
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                error={error && !shelfLocation}
                helperText={error && !shelfLocation ? "Location is required" : ""}
                sx={{ mb: 2 }}
              >
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Shelf Name (optional)"
                variant="filled"
                fullWidth
                value={shelfName}
                onChange={(e) => setShelfName(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Button fullWidth variant="contained" onClick={handleCreateShelf}>
                Generate Shelf
              </Button>
            </Box>
          )}

          {tabValue === 3 && (
            <Box sx={{ p: 2 }}>
              <TextField
                select
                label="Pallet Location"
                variant="filled"
                fullWidth
                value={palletLocation}
                onChange={(e) => setPalletLocation(e.target.value)}
                error={error && !palletLocation}
                helperText={error && !palletLocation ? "Location is required" : ""}
                sx={{ mb: 2 }}
              >
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </TextField>

              {/* NEW: optional pallet name input */}
              <TextField
                label="Pallet Name (optional)"
                variant="filled"
                fullWidth
                value={palletName}
                onChange={(e) => setPalletName(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Button fullWidth variant="contained" onClick={handleCreateNewPallet}>
                Generate Pallet
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mt={1}>
            <img src={qrImage} alt="QR Code" style={{ width: 200 }} />
            {qrShelfName && tabValue !== 3 && (
              <Typography variant="h6" sx={{ mt: 1, fontWeight: "bold" }}>
                {qrShelfName}
              </Typography>
            )}
            {tabValue === 3 && createdPalletName && (
              <Typography variant="h6" sx={{ mt: 1, fontWeight: "bold" }}>
                {createdPalletName}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button 
            onClick={() => {
              if (tabValue === 0) handlePrintShelf(qrShelfName, selectedLocation);
              else if (tabValue === 1) handlePrintPallet(selectedPalletId);
              else if (tabValue === 2) handlePrintCreatedShelf(createdShelfName, shelfLocation);
              else if (tabValue === 3) handlePrintCreatedPallet(qrImage, palletIds);
            }} 
            variant="contained" 
            startIcon={<Print />}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pallet and Box Contents Dialog */}
      <Dialog open={contentDialogOpen} onClose={() => setContentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contents on Shelf</DialogTitle>
        <DialogContent dividers>
          {(palletContent || shelfDetails) ? (
            <>
              {palletContent ? (
                <>
                  <Typography variant="subtitle1"><strong>Pallet ID:</strong> {palletContent.pallet_id}</Typography>
                  <Typography variant="subtitle1"><strong>Status:</strong> {palletContent.status}</Typography>
                  <Typography variant="subtitle1">
                    <strong>Holding:</strong> {palletContent.holding} / {palletContent.capacity}
                  </Typography>
                </>
              ) : null}

              {shelfDetails ? (
                <>
                  <Typography variant="subtitle1">
                    <strong>Shelf:</strong> {shelfDetails.shelf_name || shelfDetails.shelf_id}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Location:</strong> {shelfDetails.location}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Status:</strong> {shelfDetails.status}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>Holding:</strong> {shelfDetails.holding} / {shelfDetails.capacity}
                  </Typography>
                </>
              ) : null}

              <Typography variant="h6" sx={{ mt: 2 }}>Boxes:</Typography>
              {boxesOnShelf.length === 0 ? (
                <Typography>No boxes on this shelf.</Typography>
              ) : (
                <List dense>
                  {boxesOnShelf.map((box, i) => {
                    const customerLabel =
                      (box.customer || box.customer_name)
                        ? `Customer: ${box.customer || box.customer_name}`
                        : (box.customer_id ? `Customer ID: ${box.customer_id}` : null);

                    const cityLabel = box.city ? `City: ${box.city}` : null;
                    const pouches = box.pouch_count ? `Pouches: ${box.pouch_count}` : null;
                    const created = box.created_at ? `Created: ${new Date(box.created_at).toLocaleDateString()}` : null;

                    const secondary = [customerLabel, cityLabel, pouches, created].filter(Boolean).join("  •  ");

                    return (
                      <ListItem key={i} disableGutters>
                        <ListItemText
                          primary={box.box_id || `BOX_${i + 1}`}
                          secondary={secondary}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </>
          ) : (
            <Typography>No pallet or shelf details found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContentDialogOpen(false)}>Close</Button>
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

export default UnifiedShelvesPalletsManagement;