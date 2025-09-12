import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Box,
  Snackbar,
  TextField,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import api from "../services/axios";
import { io } from "socket.io-client";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from "../services/send_to_printer";

// Build socket URL from same base as axios
const WS_URL = (import.meta.env.VITE_API_BASE_URL || "https://api.mehustaja.fi/").replace(/\/+$/, "");
const socket = io(WS_URL);

function JuiceHandlePage() {
  // data
  const [orders, setOrders] = useState([]);

  // QR dialog
  const [qrCodes, setQrCodes] = useState({}); // { [orderId]: [{index, url}] }
  const [qrDialog, setQrDialog] = useState({ open: false, order: null });

  // comments for "mark as done"
  const [comments, setComments] = useState({});

  // notifications
  const [snackbarMsg, setSnackbarMsg] = useState("");

  // EDIT dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editedFields, setEditedFields] = useState({
    name: "",
    status: "",
    weight_kg: "",
    estimated_pouches: "",
    estimated_boxes: "",
  });

  // ---------- helpers (override-aware) ----------
  const computePouches = (order) => {
    // Prefer manual override
    const manual =
      order?.estimated_pouches ??
      order?.pouches_count;
    const manualNum = Number(manual);
    if (!Number.isNaN(manualNum) && manualNum > 0) return manualNum;

    // fallback to computation
    const weight = Number(order?.weight_kg || 0);
    return Math.floor((weight * 0.65) / 3); // 0.65 yield, 3L pouch
  };

  const computeBoxes = (order) => {
    // Prefer manual override
    const manual =
      order?.estimated_boxes ??
      order?.boxes_count;
    const manualNum = Number(manual);
    if (!Number.isNaN(manualNum) && manualNum > 0) return manualNum;

    // fallback to computed from (possibly overridden) pouches
    const p = computePouches(order);
    return Math.ceil(p / 8); // 8 pouches per box
  };

  // ---------------------------------------------------------------------------
  // lifecycle
  useEffect(() => {
    fetchProcessingOrders();

    const handleSocketUpdate = () => {
      fetchProcessingOrders();
      setSnackbarMsg("Order status updated!");
    };
    socket.on("order-status-updated", handleSocketUpdate);
    return () => socket.off("order-status-updated", handleSocketUpdate);
  }, []);

  const fetchProcessingOrders = async () => {
    try {
      const res = await api.get("/orders?status=In Progress");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // printing (Videojet pouch; expiry +1 year)
  const printPouchLabels = async (order) => {
    try {
      const customer = order?.name || order?.customer_name || "Unknown";

      const now = new Date();
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 1);
      const dd = String(exp.getDate()).padStart(2, "0");
      const mm = String(exp.getMonth() + 1).padStart(2, "0");
      const yyyy = exp.getFullYear();
      const expiryDate = `${dd}/${mm}/${yyyy}`;

      const { data } = await api.post("/printer/print-pouch", {
        customer,
        productionDate: expiryDate, // legacy key on server
        expiryDate,                 // explicit key (forward-compat)
      });

      console.log("Printer response:", data);
      setSnackbarMsg("Pouch print sent to Videojet (Expiry +1 year)");
    } catch (err) {
      console.error("Videojet print failed:", err);
      setSnackbarMsg("Failed to print pouch (see console)");
    }
  };

  // ---------------------------------------------------------------------------
  // QR generation + device printing
  const generateQRCodes = async (order) => {
    const count = computeBoxes(order); // <-- now uses overrides when present
    const codes = [];
    for (let i = 0; i < count; i++) {
      const text = `BOX_${order.order_id}_${i + 1}`;
      const png = await generateSmallPngQRCode(text);
      codes.push({ index: i + 1, url: png });
    }
    setQrCodes((prev) => ({ ...prev, [order.order_id]: codes }));
    setQrDialog({ open: true, order });
    setSnackbarMsg("QR Codes generated");
  };

  const handlePrintAll = async () => {
    const order = qrDialog.order;
    if (!order) return;
    const list = qrCodes[order.order_id] || [];
    try {
      const total = list.length;
      for (const { url, index } of list) {
        await printImage(url, order.name, `b${index}/${total}`);
      }
      setSnackbarMsg("All QR codes sent to printer");
    } catch (err) {
      console.error("Print all failed", err);
      setSnackbarMsg("Failed to print all QRs (see console)");
    }
  };

  // ---------------------------------------------------------------------------
  // Mark done → creates boxes on server, removes from this list
  const markOrderDone = async (orderId) => {
    try {
      const comment = comments[orderId] || "";
      const { data } = await api.post(`/orders/${encodeURIComponent(orderId)}/done`, { comment });
      const createdCount = data?.boxes_count ?? null;

      socket.emit("order-status-updated", {
        order_id: orderId,
        status: "processing complete",
        boxes_count: createdCount,
      });

      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setComments((prev) => {
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });

      setSnackbarMsg(
        createdCount != null
          ? `Order marked as done. Boxes created: ${createdCount}.`
          : "Order marked as done."
      );
    } catch (err) {
      console.error("Failed to update status", err);
      setSnackbarMsg("Failed to update order status");
    }
  };

  // ---------------------------------------------------------------------------
  // EDIT dialog handlers
  const openEditDialog = (order) => {
    setSelectedOrder(order);
    setEditedFields({
      name: order?.name ?? "",
      status: order?.status ?? "In Progress",
      weight_kg: order?.weight_kg ?? "",
      // reflect any override already present
      estimated_pouches: order?.estimated_pouches ?? order?.pouches_count ?? "",
      estimated_boxes: order?.estimated_boxes ?? order?.boxes_count ?? "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedOrder) return;

    const pouchOverride =
      editedFields.estimated_pouches !== "" && editedFields.estimated_pouches != null
        ? Number(editedFields.estimated_pouches)
        : undefined;

    const boxOverride =
      editedFields.estimated_boxes !== "" && editedFields.estimated_boxes != null
        ? Number(editedFields.estimated_boxes)
        : undefined;

    // Send both synonyms so the server (or DB function) can map either form.
    const payload = {
      name: editedFields.name,
      status: editedFields.status,
      weight_kg: Number(editedFields.weight_kg),
      estimated_pouches: pouchOverride,
      estimated_boxes: boxOverride,
      pouches_count: pouchOverride,
      boxes_count: boxOverride,
    };

    try {
      await api.put(`/orders/${selectedOrder.order_id}`, payload);

      // reflect instantly in UI
      setOrders((prev) =>
        prev.map((o) => {
          if (o.order_id !== selectedOrder.order_id) return o;
          const merged = { ...o, ...payload };
          // keep both keys set locally so helpers can see the overrides
          if (pouchOverride !== undefined) {
            merged.estimated_pouches = pouchOverride;
            merged.pouches_count = pouchOverride;
          }
          if (boxOverride !== undefined) {
            merged.estimated_boxes = boxOverride;
            merged.boxes_count = boxOverride;
          }
          return merged;
        })
      );

      setSnackbarMsg("Order updated successfully");
      setEditOpen(false);
    } catch (err) {
      console.error("Failed to update order", err);
      setSnackbarMsg("Update failed");
    }
  };

  const statusOptions = [
    { value: "Created", label: "Created" },
    { value: "In Progress", label: "In Progress" },
    { value: "Processing complete", label: "processing complete" },
    { value: "Ready for pickup", label: "Ready for pickup" },
    { value: "Picked up", label: "Picked up" },
  ];

  // ---------------------------------------------------------------------------
  // render
  return (
    <>
      <DrawerComponent />

      <Box
        sx={{
          backgroundColor: "#fffff",
          minHeight: "90vh",
          pt: 4,
          pb: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper elevation={3} sx={{ width: "min(90%, 800px)", p: 4, backgroundColor: "#ffffff", borderRadius: 2 }}>
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Apple Juice Processing Station
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 800, mt: 3 }}>
            {orders.map((order) => {
              const estPouches = computePouches(order);
              const qrCount = computeBoxes(order);

              // Expiry date (1 year from today), dd/mm/yyyy for UI display
              const exp = new Date();
              exp.setFullYear(exp.getFullYear() + 1);
              const expiryUi = `${String(exp.getDate()).padStart(2, "0")}/${String(
                exp.getMonth() + 1
              ).padStart(2, "0")}/${exp.getFullYear()}`;

              return (
                <Accordion key={order.order_id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      {order.name} — Est. {estPouches} pouches
                    </Typography>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Card sx={{ backgroundColor: "#f5f5f5" }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography>
                            <strong>Order ID:</strong> {order.order_id}
                          </Typography>
                          <Typography>
                            <strong>Customer:</strong> {order.name}
                          </Typography>
                          <Typography>
                            <strong>Apple Weight:</strong> {order.weight_kg} kg
                          </Typography>
                          <Typography>
                            <strong>Estimated Pouches:</strong> {estPouches}
                          </Typography>
                          <Typography>
                            <strong>QR Codes to Print:</strong> {qrCount}
                          </Typography>
                          <Typography>
                            <strong>Expiry Date:</strong> {expiryUi}
                          </Typography>

                          <TextField
                            label="Comments"
                            fullWidth
                            multiline
                            minRows={2}
                            value={comments[order.order_id] || ""}
                            onChange={(e) =>
                              setComments((prev) => ({ ...prev, [order.order_id]: e.target.value }))
                            }
                          />

                          <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Button variant="outlined" onClick={() => openEditDialog(order)}>
                              Edit
                            </Button>
                            <Button variant="contained" onClick={() => printPouchLabels(order)}>
                              Print Pouch Info
                            </Button>
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => generateQRCodes(order)}
                            >
                              Generate QR Codes
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              onClick={() => markOrderDone(order.order_id)}
                            >
                              Mark as Done
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>

          <Snackbar
            open={!!snackbarMsg}
            autoHideDuration={3000}
            onClose={() => setSnackbarMsg("")}
            message={snackbarMsg}
          />
        </Paper>
      </Box>

      {/* QR preview + "Print All" dialog (device printer) */}
      <Dialog
        open={qrDialog.open}
        onClose={() => setQrDialog({ open: false, order: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {qrDialog.order ? `QR Codes — ${qrDialog.order.name}` : "QR Codes"}
        </DialogTitle>
        <DialogContent dividers>
          {qrDialog.order && (qrCodes[qrDialog.order.order_id] || []).length > 0 ? (
            <Grid container spacing={2}>
              {qrCodes[qrDialog.order.order_id].map(({ url, index }) => (
                <Grid item xs={6} key={index}>
                  <Card sx={{ p: 1 }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Box {index}
                      </Typography>
                      <img src={url} alt={`QR ${index}`} style={{ width: 120, height: 120 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No QR codes generated.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog({ open: false, order: null })}>Close</Button>
          <Button
            variant="contained"
            onClick={handlePrintAll}
            disabled={!qrDialog.order || !(qrCodes[qrDialog.order.order_id] || []).length}
          >
            Print All
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth>
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Customer Name"
              value={editedFields.name}
              onChange={(e) => setEditedFields((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Status"
              value={editedFields.status}
              onChange={(e) => setEditedFields((prev) => ({ ...prev, status: e.target.value }))}
              fullWidth
              helperText="Select current status for this order"
            >
              {[
                { value: "Created", label: "Created" },
                { value: "In Progress", label: "In Progress" },
                { value: "Processing complete", label: "processing complete" },
                { value: "Ready for pickup", label: "Ready for pickup" },
                { value: "Picked up", label: "Picked up" },
              ].map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Weight (kg)"
              type="number"
              value={editedFields.weight_kg}
              onChange={(e) => setEditedFields((p) => ({ ...p, weight_kg: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Estimated Pouches (optional)"
              type="number"
              value={editedFields.estimated_pouches}
              onChange={(e) =>
                setEditedFields((p) => ({ ...p, estimated_pouches: e.target.value }))
              }
              fullWidth
              helperText="Manual override if you store this in DB"
            />
            <TextField
              label="Estimated Boxes (optional)"
              type="number"
              value={editedFields.estimated_boxes}
              onChange={(e) =>
                setEditedFields((p) => ({ ...p, estimated_boxes: e.target.value }))
              }
              fullWidth
              helperText="Manual override if you store this in DB"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default JuiceHandlePage;
