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
  Divider
} from "@mui/material";
import { useState } from "react";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";

function PickupPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearch(q);
    setSelected(null);
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

  const confirmPickup = async () => {
    if (!selected) return;
    try {
      await api.post(`/orders/${selected.order_id}/pickup`);
      setSnackbarMsg(`Order for ${selected.name} marked as picked up.`);
      setResults((prev) => prev.filter((r) => r.order_id !== selected.order_id));
      setSelected(null);
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
              mb: 2,
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
              {results.map((res) => (
                <ListItem
                  key={res.order_id}
                  button
                  selected={selected?.order_id === res.order_id}
                  onClick={() => setSelected(res)}
                  sx={{
                    mt: 1,
                    backgroundColor: selected?.order_id === res.order_id ? "#b2dfdb" : "#fff",
                    borderRadius: 1,
                  }}
                >
                  <ListItemText
                    primary={`${res.name} (${res.phone})`}
                    secondary={[
                      `Status: ${res.status}`,
                      `City: ${res.city}`,
                      `Boxes: ${res.box_count}`,
                      res.shelf_location ? `Shelf: ${res.shelf_location}` : null,
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  />
                </ListItem>
              ))}
            </List>

            {selected && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ px: 1 }}>
                  <Typography variant="subtitle1">Order ID:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {selected.order_id}
                  </Typography>

                  <Typography variant="subtitle1">Status:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {selected.status}
                  </Typography>

                  <Typography variant="subtitle1">City:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {selected.city}
                  </Typography>

                  <Typography variant="subtitle1">Boxes:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {selected.box_count}
                  </Typography>

                  {selected.shelf_location && (
                    <>
                      <Typography variant="subtitle1">Shelf Location:</Typography>
                      <Typography
                        variant="body2"
                        gutterBottom
                        sx={{ fontWeight: "bold", color: "green" }}
                      >
                        {selected.shelf_location}
                      </Typography>
                    </>
                  )}

                  {selected.status === "Ready for pickup" && (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={confirmPickup}
                    >
                      Mark as Picked Up
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Paper>
        </Paper>
      </Box>

      <Snackbar open={!!snackbarMsg} autoHideDuration={4000} onClose={() => setSnackbarMsg("")}>
        <Alert severity="info" sx={{ width: "100%" }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </>
  );
}

export default PickupPage;
