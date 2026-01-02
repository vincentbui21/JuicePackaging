import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  const [palletDetails, setPalletDetails] = useState(null);

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
  const [isAdmin, setIsAdmin] = useState(false);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null, name: "" });

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get("/cities");
      const list = Array.isArray(res.data)
        ? res.data.map((v) => (typeof v === "string" ? v : v.location)).filter(Boolean)
        : [];
      setLocations(list);
      if (list.length && !selectedLocation) {
        setSelectedLocation(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch shelf locations", err);
      setSnackbarMsg(t('unified_management.failed_load_locations'));
    }
  }, [selectedLocation]);

  const fetchShelves = useCallback(async () => {
    try {
      const res = await api.get(`/api/shelves/${encodeURIComponent(selectedLocation)}`);
      setShelves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch shelves", err);
      setSnackbarMsg(t('unified_management.failed_load_shelves'));
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
      setSnackbarMsg(t('unified_management.failed_load_cities'));
    }
  }, [selectedCity]);

  const fetchPallets = useCallback(async () => {
    try {
      const res = await api.get(`/pallets?location=${encodeURIComponent(selectedCity)}`);
      const arr = Array.isArray(res.data) ? res.data : [];
      setPallets(arr);
      if (!arr.length) setSnackbarMsg(t('unified_management.no_pallets_found'));
    } catch (err) {
      console.error("Failed to fetch pallets", err);
      setSnackbarMsg(t('unified_management.failed_load_pallets'));
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

  // Load admin permission on mount
  useEffect(() => {
    try {
      const permissionsStr = localStorage.getItem('userPermissions');
      if (permissionsStr) {
        const permissions = JSON.parse(permissionsStr);
        setIsAdmin(permissions.role === 'admin');
      }
    } catch (err) {
      console.error('Failed to parse user permissions:', err);
    }
  }, []);

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

  const handleDeleteShelf = async (shelf_id, shelf_name) => {
    setDeleteDialog({ open: true, type: 'shelf', id: shelf_id, name: shelf_name || shelf_id });
  };

  const confirmDeleteShelf = async () => {
    try {
      await api.delete(`/shelves/${deleteDialog.id}`);
      setSnackbarMsg(t('unified_management.shelf_deleted'));
      fetchShelves();
    } catch (err) {
      console.error("Failed to delete shelf", err);
      setSnackbarMsg(t('unified_management.failed_delete_shelf'));
    } finally {
      setDeleteDialog({ open: false, type: null, id: null, name: "" });
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
      setSnackbarMsg(t('unified_management.no_pallet_boxes'));
    }
  };

  // Pallets functions
  const handleCreatePallet = async () => {
    try {
      await api.post("/pallets", { location: selectedCity });
      setSnackbarMsg(t('unified_management.pallet_created'));
      fetchPallets();
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg(t('unified_management.creation_failed'));
    }
  };

  const handleAddCity = async () => {
    const name = newCity.trim();
    if (!name) return setSnackbarMsg(t('unified_management.city_name_required'));
    if (cities.includes(name)) return setSnackbarMsg(t('unified_management.city_exists'));
    try {
      await api.post("/cities", { name });
      setCities((prev) => [...prev, name].sort());
      setNewCity("");
      setSelectedCity(name);
      setSnackbarMsg(t('unified_management.city_added'));
    } catch (err) {
      console.error("Failed to add city", err);
      setSnackbarMsg(t('unified_management.failed_add_city'));
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

  const handleDeletePallet = async (pallet_id, pallet_name) => {
    setDeleteDialog({ open: true, type: 'pallet', id: pallet_id, name: pallet_name || pallet_id });
  };

  const confirmDeletePallet = async () => {
    try {
      await api.delete(`/pallets/${deleteDialog.id}`);
      setSnackbarMsg(t('unified_management.pallet_deleted'));
      fetchPallets();
    } catch (err) {
      console.error("Failed to delete pallet", err);
      setSnackbarMsg(t('unified_management.failed_delete_pallet'));
    } finally {
      setDeleteDialog({ open: false, type: null, id: null, name: "" });
    }
  };

  const handleViewBoxes = async (pallet_id) => {
    try {
      // Get the pallet details from the current pallets list
      const pallet = pallets.find(p => p.pallet_id === pallet_id);
      setPalletDetails(pallet || null);
      
      const res = await api.get(`/pallets/${pallet_id}/boxes`);
      setBoxList(Array.isArray(res.data) ? res.data : []);
      setSelectedPalletId(pallet_id);
      setBoxDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch boxes for pallet", err);
      setSnackbarMsg(t('unified_management.failed_load_boxes'));
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
  const handleCreateShelf = async (locationToUse, shelfNameFromInput = null) => {
    const loc = locationToUse.trim();
    if (!loc) {
      setError(true);
      setSnackbarMsg(t('unified_management.choose_location'));
      return;
    }

    try {
      const res = await api.post("/api/shelves", {
        location: loc,
        shelf_name: shelfNameFromInput?.trim() || null,
      });

      const shelf_id = res?.data?.shelf_id ?? res?.data?.result?.shelf_id;
      const returned_name = res?.data?.shelf_name ?? res?.data?.result?.shelf_name;
      if (!shelf_id) throw new Error("Missing shelf_id in server response");

      const qrData = `SHELF_${shelf_id}`;
      const img = await generateSmallPngQRCode(qrData);

      setQrImage(img);
      setCreatedShelfName(returned_name || shelfNameFromInput || "");
      setQrDialogOpen(true);
      setSnackbarMsg(t('unified_management.shelf_created_successfully'));
      setShelfName("");
      setError(false);
      
      // Refresh the shelves table to show the new shelf
      fetchShelves();
    } catch (err) {
      console.error("Failed to create shelf:", err);
      setSnackbarMsg(t('unified_management.failed_create_shelf'));
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
      setSnackbarMsg(t('unified_management.enter_pallet_location'));
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
      setSnackbarMsg(t('unified_management.pallet_created_successfully'));
      setPalletLocation("");
      setPalletName("");
      setError(false);
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg(t('unified_management.failed_create_pallet'));
    }
  };

  const handlePrintCreatedPallet = (qrImage, id) => {
    printImage(qrImage, palletIds)
  };

  // Columns
  const shelvesColumns = [
    { field: "shelf_id", headerName: t('unified_management.shelf_id'), flex: 1.5 },
    { field: "shelf_name", headerName: t('unified_management.shelf_name'), flex: 1 },
    { field: "location", headerName: t('unified_management.location'), flex: 1 },
    // { field: "status", headerName: "Status", flex: 1 },
    { field: "holding", headerName: t('unified_management.holding'), flex: 0.8 },
    {
      field: "actions",
      headerName: t('unified_management.actions'),
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
          <IconButton 
            color="error" 
            onClick={() => handleDeleteShelf(params.row.shelf_id, params.row.shelf_name)}
            disabled={!isAdmin}
            title={!isAdmin ? t('unified_management.admin_only') : t('unified_management.delete_shelf')}
          >
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  const palletsColumns = [
    { field: "pallet_id", headerName: t('unified_management.pallet_id'), flex: 1.5 },
    { field: "pallet_name", headerName: t('unified_management.pallet_name'), flex: 1.2 },
    { field: "location", headerName: t('unified_management.city'), flex: 1 },
    { field: "status", headerName: t('unified_management.status'), flex: 1 },
    { field: "holding", headerName: t('unified_management.holding'), flex: 0.8 },
    {
      field: "actions",
      headerName: t('unified_management.actions'),
      flex: 1.2,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleShowQRPallet(params.row.pallet_name)}>
            <QrCode />
          </IconButton>
          <IconButton color="info" onClick={() => handleViewBoxes(params.row.pallet_id)}>
            <Visibility />
          </IconButton>
          <IconButton 
            color="error" 
            onClick={() => handleDeletePallet(params.row.pallet_id, params.row.pallet_name)}
            disabled={!isAdmin}
            title={!isAdmin ? t('unified_management.admin_only') : t('unified_management.delete_pallet')}
          >
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
          backgroundColor: "background.default",
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
            {t('unified_management.title')}
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab label={t('unified_management.shelves_management')} />
            <Tab label={t('unified_management.pallets_management')} />
            <Tab label={t('unified_management.create_shelf')} />
            <Tab label={t('unified_management.create_pallet')} />
          </Tabs>

          {tabValue === 0 && (
            <>
              <Box component={Paper} elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center" justifyContent="center">
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      label={t('unified_management.select_location')}
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
                    <Button fullWidth variant="contained" onClick={() => handleCreateShelf(selectedLocation)}>
                      {t('unified_management.quick_create_shelf')}
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ borderRadius: 2 }}>
                <DataGrid
                  rows={shelves.map((s, i) => ({ ...s, id: i }))}
                  columns={shelvesColumns}
                  autoHeight
                  pageSizeOptions={[10, 20, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  sx={{ borderRadius: 2, boxShadow: 3 }}
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
                      label={t('unified_management.search_pallets')}
                      fullWidth
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4} md={3}>
                    <TextField
                      select
                      label={t('unified_management.select_city')}
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
                      {t('unified_management.quick_create_pallet')}
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

              <Box sx={{ borderRadius: 2 }}>
                <DataGrid
                  rows={filteredPallets.map((p, i) => ({ ...p, id: i }))}
                  columns={palletsColumns}
                  autoHeight
                  pageSizeOptions={[10, 20, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  sx={{ borderRadius: 2, boxShadow: 3 }}
                />
              </Box>
            </>
          )}

          {tabValue === 2 && (
            <Box sx={{ p: 2 }}>
              <TextField
                select
                label={t('unified_management.shelf_location')}
                variant="filled"
                fullWidth
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                error={error && !shelfLocation}
                helperText={error && !shelfLocation ? t('unified_management.location_required') : ""}
                sx={{ mb: 2 }}
              >
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label={t('unified_management.shelf_name_optional')}
                variant="filled"
                fullWidth
                value={shelfName}
                onChange={(e) => setShelfName(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Button fullWidth variant="contained" onClick={() => handleCreateShelf(shelfLocation, shelfName)}>
                {t('unified_management.generate_shelf')}
              </Button>
            </Box>
          )}

          {tabValue === 3 && (
            <Box sx={{ p: 2 }}>
              <TextField
                select
                label={t('unified_management.pallet_location')}
                variant="filled"
                fullWidth
                value={palletLocation}
                onChange={(e) => setPalletLocation(e.target.value)}
                error={error && !palletLocation}
                helperText={error && !palletLocation ? t('unified_management.location_required') : ""}
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
                label={t('unified_management.pallet_name_optional')}
                variant="filled"
                fullWidth
                value={palletName}
                onChange={(e) => setPalletName(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Button fullWidth variant="contained" onClick={handleCreateNewPallet}>
                {t('unified_management.generate_pallet')}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>{t('unified_management.qr_code')}</DialogTitle>
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
          <Button onClick={() => setQrDialogOpen(false)}>{t('unified_management.close')}</Button>
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
            {t('unified_management.print')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pallet and Box Contents Dialog */}
      <Dialog open={contentDialogOpen} onClose={() => setContentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('unified_management.contents_on_shelf')}</DialogTitle>
        <DialogContent dividers>
          {(palletContent || shelfDetails) ? (
            <>
              {palletContent ? (
                <>
                  <Typography variant="subtitle1"><strong>{t('unified_management.pallet_id_label')}</strong> {palletContent.pallet_id}</Typography>
                  <Typography variant="subtitle1"><strong>{t('unified_management.status_label')}</strong> {palletContent.status}</Typography>
                  <Typography variant="subtitle1">
                    <strong>{t('unified_management.holding_label')}</strong> {palletContent.holding} / {palletContent.capacity}
                  </Typography>
                </>
              ) : null}

              {shelfDetails ? (
                <>
                  <Typography variant="subtitle1">
                    <strong>{t('unified_management.shelf_label')}</strong> {shelfDetails.shelf_name || shelfDetails.shelf_id}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>{t('unified_management.location_label')}</strong> {shelfDetails.location}
                  </Typography>
                  <Typography variant="subtitle1">
                    <strong>{t('unified_management.holding_label')}</strong> {boxesOnShelf.length}
                  </Typography>
                </>
              ) : null}

              <Typography variant="h6" sx={{ mt: 2 }}>{t('unified_management.boxes_label')}</Typography>
              {boxesOnShelf.length === 0 ? (
                <Typography>{t('unified_management.no_boxes_shelf')}</Typography>
              ) : (
                <List dense>
                  {(() => {
                    // Group boxes by customer
                    const grouped = boxesOnShelf.reduce((acc, box) => {
                      const key = box.customer_id || 'unknown';
                      if (!acc[key]) {
                        acc[key] = {
                          customer_name: box.customer_name || box.customer,
                          customer_id: box.customer_id,
                          order_id: box.order_id,
                          boxes_count: box.boxes_count,
                          actual_pouches: box.actual_pouches || box.pouches_count || box.pouch_count,
                          city: box.city,
                          created_at: box.created_at,
                          boxIds: []
                        };
                      }
                      acc[key].boxIds.push(box.box_id);
                      return acc;
                    }, {});

                    return Object.values(grouped).map((group, i) => {
                      const customerLabel = group.customer_name
                        ? `${t('unified_management.customer_label')} ${group.customer_name}`
                        : (group.customer_id ? `${t('unified_management.customer_id_label')} ${group.customer_id}` : t('unified_management.unknown_customer'));

                      const orderLabel = group.order_id ? `${t('unified_management.order_label')} ${group.order_id}` : null;
                      const boxCountLabel = `${group.boxIds.length} ${group.boxIds.length !== 1 ? t('unified_management.boxes') : t('unified_management.box')}`;
                      const totalBoxesLabel = group.boxes_count ? `${t('unified_management.total_label')} ${group.boxes_count}` : null;
                      const pouchesLabel = group.actual_pouches ? `${t('unified_management.pouches_label')} ${group.actual_pouches}` : null;
                      const cityLabel = group.city ? `${t('unified_management.city_label')} ${group.city}` : null;
                      const created = group.created_at ? `${t('unified_management.created_label')} ${new Date(group.created_at).toLocaleDateString()}` : null;

                      const secondary = [orderLabel, boxCountLabel, totalBoxesLabel, pouchesLabel, cityLabel, created].filter(Boolean).join("  •  ");

                      return (
                        <ListItem key={i} disableGutters>
                          <ListItemText
                            primary={customerLabel}
                            secondary={secondary}
                          />
                        </ListItem>
                      );
                    });
                  })()}
                </List>
              )}
            </>
          ) : (
            <Typography>{t('unified_management.no_details_found')}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContentDialogOpen(false)}>{t('unified_management.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Boxes on pallet */}
      <Dialog open={boxDialogOpen} onClose={() => setBoxDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('unified_management.contents_on_pallet')}</DialogTitle>
        <DialogContent dividers>
          {palletDetails && (
            <>
              <Typography variant="subtitle1">
                <strong>{t('unified_management.pallet_label')}</strong> {palletDetails.pallet_name || palletDetails.pallet_id}
              </Typography>
              <Typography variant="subtitle1">
                <strong>{t('unified_management.location_label')}</strong> {palletDetails.location || 'N/A'}
              </Typography>
              <Typography variant="subtitle1">
                <strong>{t('unified_management.holding_label')}</strong> {boxList.length}
              </Typography>
            </>
          )}

          <Typography variant="h6" sx={{ mt: 2 }}>{t('unified_management.boxes_label')}</Typography>
          {boxList.length === 0 ? (
            <Typography>{t('unified_management.no_boxes_pallet')}</Typography>
          ) : (
            <>
              <List dense>
                {(() => {
                  // Group boxes by customer
                  const grouped = boxList.reduce((acc, box) => {
                    const key = box.customer_id || box.customer_name || 'unknown';
                    if (!acc[key]) {
                      acc[key] = {
                        customer_name: box.customer_name,
                        customer_id: box.customer_id,
                        order_id: box.order_id,
                        created_at: box.created_at,
                        boxIds: []
                      };
                    }
                    acc[key].boxIds.push(box.box_id || box.id);
                    return acc;
                  }, {});

                  return Object.values(grouped).map((group, i) => {
                    const customerLabel = group.customer_name
                      ? `${t('unified_management.customer_label')} ${group.customer_name}`
                      : (group.customer_id ? `${t('unified_management.customer_id_label')} ${group.customer_id}` : t('unified_management.unknown_customer'));

                    const orderLabel = group.order_id ? `${t('unified_management.order_label')} ${group.order_id}` : null;
                    const boxCountLabel = `${group.boxIds.length} ${group.boxIds.length !== 1 ? t('unified_management.boxes') : t('unified_management.box')}`;
                    const created = group.created_at ? `${t('unified_management.created_label')} ${new Date(group.created_at).toLocaleDateString()}` : null;

                    const secondary = [orderLabel, boxCountLabel, created].filter(Boolean).join("  •  ");

                    return (
                      <ListItem key={i} disableGutters>
                        <ListItemText
                          primary={customerLabel}
                          secondary={secondary}
                        />
                      </ListItem>
                    );
                  });
                })()}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBoxDialogOpen(false)}>{t('unified_management.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: null, id: null, name: "" })}>
        <DialogTitle>{t('unified_management.confirm_delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteDialog.type === 'shelf' 
              ? t('unified_management.confirm_delete_shelf', { name: deleteDialog.name })
              : t('unified_management.confirm_delete_pallet', { name: deleteDialog.name })}
          </Typography>
          <Typography color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
            {t('unified_management.cannot_be_undone')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, type: null, id: null, name: "" })}>
            {t('unified_management.cancel')}
          </Button>
          <Button 
            onClick={deleteDialog.type === 'shelf' ? confirmDeleteShelf : confirmDeletePallet} 
            color="error" 
            variant="contained"
          >
            {t('unified_management.delete')}
          </Button>
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