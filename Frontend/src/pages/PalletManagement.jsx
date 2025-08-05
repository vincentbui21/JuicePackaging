import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  MenuItem,
} from "@mui/material";
import { QrCode, Print, Delete, Add } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import sendToPrinter from "../services/send_to_printer";
import DrawerComponent from "../components/drawer";

function PalletManagement() {
  const [pallets, setPallets] = useState([]);
  const [selectedCity, setSelectedCity] = useState("Lahti");
  const [cities, setCities] = useState([
    "Kuopio", "Mikkeli", "Varkaus", "Lapinlahti", "Joensuu", "Lahti",
  ]);
  const [newCity, setNewCity] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [qrImage, setQrImage] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  // Load saved cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get("/cities");
        setCities(res.data);
      } catch (err) {
        console.error("Failed to fetch cities", err);
      }
    };
    fetchCities();
  }, []);
  

  // Initial + re-fetch when selectedCity changes
  useEffect(() => {
    fetchPallets();
  }, [selectedCity]);

  const fetchPallets = async () => {
    try {
      const res = await api.get(`/pallets?location=${selectedCity}`);
      setPallets(res.data || []);
    } catch (err) {
      console.error("Failed to fetch pallets", err);
    }
  };

  const handleCreatePallet = async () => {
    try {
      await api.post("/pallets", { location: selectedCity, capacity });
      fetchPallets();
      setSnackbarMsg("Pallet created");
    } catch (err) {
      console.error("Failed to create pallet", err);
      setSnackbarMsg("Creation failed");
    }
  };

  const handleDelete = async (pallet_id) => {
    try {
      await api.delete(`/pallets/${pallet_id}`);
      fetchPallets();
      setSnackbarMsg("Pallet deleted");
    } catch (err) {
      console.error("Failed to delete pallet", err);
      setSnackbarMsg("Delete failed");
    }
  };

  const handleShowQR = async (id) => {
    const img = await generateSmallPngQRCode(id);
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
  

  const handleAddCity = async () => {
    if (newCity && !cities.includes(newCity)) {
      try {
        await api.post("/cities", { name: newCity });
        const updated = [...cities, newCity].sort();
        setCities(updated);
        setNewCity("");
        setSnackbarMsg("City added");
      } catch (err) {
        console.error("Failed to add city", err);
        setSnackbarMsg("Failed to add city");
      }
    } else {
      setSnackbarMsg("City already exists or is empty");
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
      flex: 1.2,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton color="primary" onClick={() => handleShowQR(params.row.pallet_id)}>
            <QrCode />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.pallet_id)}>
            <Delete />
          </IconButton>
        </>
      )
    }
  ];

  return (
    <>

      <DrawerComponent></DrawerComponent>

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
                    variant="h4"
                    sx={{
                      textAlign: "center",
                      paddingTop: "40px",
                      paddingBottom: "10px",
                      marginBottom: "10px",
                      color: "black",
                      borderRadius: "10px",
                      fontWeight: 'bold',
                    }}
                  >
                    Pallet Management
                  </Typography>

                  <Box component={Paper} elevation={3} sx={{ p: 2, mb: 2, mx: 'auto', borderRadius: 2, width: 'min(1200px, 95%)' }}>
                    <Grid container spacing={2} alignItems="center" justifyContent="center">
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
                      <Grid item xs={6} sm={2}>
                        <TextField
                          label="Capacity"
                          fullWidth
                          type="number"
                          value={capacity}
                          onChange={(e) => setCapacity(Number(e.target.value))}
                          sx={{ backgroundColor: "white", borderRadius: 1 }}
                        />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Button fullWidth variant="contained" onClick={handleCreatePallet}>
                          Create Pallet
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Add New City"
                          fullWidth
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          sx={{ backgroundColor: "white", borderRadius: 1 }}
                          InputProps={{
                            endAdornment: (
                              <IconButton onClick={handleAddCity}>
                                <Add />
                              </IconButton>
                            ),
                          }}
                        />
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

                  <Snackbar
                    open={!!snackbarMsg}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarMsg("")}
                    message={snackbarMsg}
                  />
                </Paper>
              </Box>


  </>
  );
}

export default PalletManagement;
