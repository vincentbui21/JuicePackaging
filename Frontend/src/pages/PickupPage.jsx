import {
  Box,
  Typography,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";

function PickupPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // selected order + dialog open
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [snackbarMsg, setSnackbarMsg] = useState("");

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearch(q);
    setSelected(null);
    setDetailsOpen(false);

    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/orders/pickup?query=${encodeURIComponent(q)}`);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (order) => {
    setSelected(order);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelected(null);
  };

  const confirmPickup = async () => {
    if (!selected) return;
    try {
      await api.post(`/orders/${selected.order_id}/pickup`);
      setSnackbarMsg(`Order for ${selected.name} marked as picked up.`);
      setResults((prev) => prev.filter((r) => r.order_id !== selected.order_id));
      closeDetails();
    } catch (err) {
      console.error("Failed to confirm pickup", err);
      setSnackbarMsg("Failed to confirm pickup");
    }
  };

  return (
    <>
      <DrawerComponent />

      <Box
        sx={{
          backgroundColor: "#ffffff",
          minHeight: "90vh",
          py: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "min(90%, 800px)",
            p: 4,
            backgroundColor: "#ffffff",
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Pickup Confirmation
          </Typography>

          <Paper
            elevation={1}
            sx={{
              p: 2,
              backgroundColor: "#fcfcfc",
              borderRadius: 2,
              width: "min(600px, 95%)",
              mx: "auto",
            }}
          >
            <TextField
              label="Search by Name or Phone"
              value={search}
              onChange={handleSearch}
              fullWidth
              sx={{ backgroundColor: "white", borderRadius: 1 }}
            />

            {loading && (
              <Box mt={2} textAlign="center">
                <CircularProgress />
              </Box>
            )}

            <List>
              {results.map((res) => {
                const shelfDisplay = res.shelf_name
                  ? `${res.shelf_name}${
                      res.shelf_location || res.city ? ` (${res.shelf_location || res.city})` : ""
                    }`
                  : res.shelf_location || "";

                return (
                  <ListItem
                    key={res.order_id}
                    button
                    onClick={() => openDetails(res)}
                    sx={{
                      mt: 1,
                      backgroundColor: "#fff",
                      borderRadius: 1,
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    <ListItemText
                      primary={`${res.name} (${res.phone})`}
                      secondary={[
                        `Status: ${res.status}`,
                        `City: ${res.city}`,
                        `Boxes: ${res.box_count}`,
                        shelfDisplay ? `Shelf: ${shelfDisplay}` : null,
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Paper>
      </Box>

      {/* Details dialog (popup) */}
      <Dialog open={detailsOpen} onClose={closeDetails} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Pickup Details
          <IconButton
            aria-label="close"
            onClick={closeDetails}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {!selected ? (
            <Typography>Select an order from the list.</Typography>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selected.name} ({selected.phone})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selected.city}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2">Order ID</Typography>
              <Typography variant="body2" gutterBottom>
                {selected.order_id}
              </Typography>

              <Typography variant="subtitle2">Status</Typography>
              <Typography variant="body2" gutterBottom>
                {selected.status}
              </Typography>

              <Typography variant="subtitle2">Boxes</Typography>
              <Typography variant="body2" gutterBottom>
                {selected.box_count}
              </Typography>

              {(selected.shelf_name || selected.shelf_location) && (
                <>
                  <Typography variant="subtitle2">Shelf</Typography>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: "bold", color: "green" }}>
                    {selected.shelf_name
                      ? `${selected.shelf_name}${
                          selected.shelf_location || selected.city
                            ? ` (${selected.shelf_location || selected.city})`
                            : ""
                        }`
                      : selected.shelf_location}
                  </Typography>
                </>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetails}>Close</Button>
          {selected?.status === "Ready for pickup" && (
            <Button variant="contained" color="success" onClick={confirmPickup}>
              Mark as Picked Up
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbarMsg} autoHideDuration={4000} onClose={() => setSnackbarMsg("")}>
        <Alert severity="info" sx={{ width: "100%" }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </>
  );
}

export default PickupPage;
