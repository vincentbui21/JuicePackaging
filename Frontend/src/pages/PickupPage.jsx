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
} from "@mui/material";
import { useEffect, useState } from "react";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";

function PickupPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    return () => {
      document.body.style = "";
    };
  }, []);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearch(q);
    setSelected(null);
    if (!q) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/orders/pickup?query=${encodeURIComponent(q)}`);
      setResults(res.data);
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
      setSnackbarMsg(" Pickup confirmed!");
      setResults((prev) => prev.filter(r => r.order_id !== selected.order_id));
      setSelected(null);
    } catch (err) {
      console.error("Failed to confirm pickup", err);
      setSnackbarMsg("Failed to confirm pickup");
    }
  };

  return (
    <Box p={2}>
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
          Pickup Confirmation
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 2, mb: 2, backgroundColor: '#dcd2ae', borderRadius: 2, width: 'min(600px, 95%)', mx: 'auto' }}>
        <TextField
          label="Search by Name or Phone"
          value={search}
          onChange={handleSearch}
          fullWidth
          sx={{ backgroundColor: "white", borderRadius: 1 }}
        />

        {loading && <Box mt={2} textAlign="center"><CircularProgress /></Box>}

        <List>
          {results.map((res) => (
            <ListItem
              key={res.order_id}
              button
              selected={selected?.order_id === res.order_id}
              onClick={() => setSelected(res)}
              sx={{ mt: 1, backgroundColor: selected?.order_id === res.order_id ? '#b2dfdb' : '#fff', borderRadius: 1 }}
            >
              <ListItemText
                primary={`${res.name} (${res.phone})`}
                secondary={`City: ${res.city} | Order ID: ${res.order_id} | Boxes: ${res.box_count}`}
              />
            </ListItem>
          ))}
        </List>

        {selected && (
          <Button
            variant="contained"
            color="success"
            fullWidth
            sx={{ mt: 2 }}
            onClick={confirmPickup}
          >
            Confirm Pickup
          </Button>
        )}
      </Paper>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg("")}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PickupPage;