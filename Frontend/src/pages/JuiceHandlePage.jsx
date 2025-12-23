import {
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
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import { Print, QrCode, CheckCircle, Save, Delete } from "@mui/icons-material";
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
  const [search, setSearch] = useState("");
  const [inlineEdits, setInlineEdits] = useState({});

  // QR dialog
  const [qrCodes, setQrCodes] = useState({}); // { [orderId]: [{index, url}] }
  const [qrDialog, setQrDialog] = useState({ open: false, order: null });

  // comments for "mark as done"
  const [comments, setComments] = useState({});

  // notifications
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const statusOptions = [
    { value: "Created", label: "Created" },
    { value: "In Progress", label: "In Progress" },
    { value: "Processing complete", label: "processing complete" },
    { value: "Ready for pickup", label: "Ready for pickup" },
    { value: "Picked up", label: "Picked up" },
  ];

  // ---------- helpers (override-aware) ----------
  const computeEstimatedPouches = (order) => {
    const manual = order?.estimated_pouches ?? order?.pouches_count;
    const manualNum = Number(manual);
    if (!Number.isNaN(manualNum) && manualNum > 0) return manualNum;
    const weight = Number(order?.weight_kg || 0);
    return Math.floor((weight * 0.65) / 3); // 0.65 yield, 3L pouch
  };

  const computeEstimatedBoxes = (order, estimatedPouches) => {
    const manual = order?.estimated_boxes ?? order?.boxes_count;
    const manualNum = Number(manual);
    if (!Number.isNaN(manualNum) && manualNum > 0) return manualNum;
    const p = Number(estimatedPouches || 0);
    return Math.max(1, Math.ceil(p / 8)); // 8 pouches per box
  };

  const getInlineValue = (orderId, field, fallback) =>
    inlineEdits?.[orderId]?.[field] ?? fallback;

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
      const sorted = [...(res.data || [])].sort((a, b) => {
        const aDate = new Date(a?.created_at || 0).getTime();
        const bDate = new Date(b?.created_at || 0).getTime();
        return aDate - bDate;
      });
      setOrders(sorted);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    setInlineEdits((prev) => {
      const next = { ...prev };
      orders.forEach((order) => {
        if (!next[order.order_id]) {
          const estimatedPouches = computeEstimatedPouches(order);
          const estimatedBoxes = computeEstimatedBoxes(order, estimatedPouches);
          next[order.order_id] = {
            status: order?.status || "In Progress",
            weight_kg: order?.weight_kg ?? "",
            estimated_pouches: estimatedPouches,
            estimated_boxes: estimatedBoxes,
            actual_pouches: order?.actual_pouches ?? "",
          };
        }
      });
      return next;
    });
  }, [orders]);

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
    const inline = inlineEdits[order.order_id] || {};
    const estimatedPouches = Number(inline.estimated_pouches) || computeEstimatedPouches(order);
    const estimatedBoxes = Number(inline.estimated_boxes) || computeEstimatedBoxes(order, estimatedPouches);
    const count = estimatedBoxes;
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

  const handleInlineChange = (orderId, field, value) => {
    setInlineEdits((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value,
      },
    }));
  };

  const handleInlineSave = async (orderId) => {
    const edits = inlineEdits[orderId];
    if (!edits) return;

    const payload = {
      status: edits.status,
      weight_kg: edits.weight_kg !== "" ? Number(edits.weight_kg) : undefined,
      estimated_pouches: edits.estimated_pouches !== "" ? Number(edits.estimated_pouches) : undefined,
      estimated_boxes: edits.estimated_boxes !== "" ? Number(edits.estimated_boxes) : undefined,
      actual_pouches: edits.actual_pouches !== "" ? Number(edits.actual_pouches) : undefined,
    };

    try {
      await api.put(`/orders/${orderId}`, payload);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.order_id !== orderId) return o;
          return {
            ...o,
            status: payload.status ?? o.status,
            weight_kg: payload.weight_kg ?? o.weight_kg,
            pouches_count: payload.estimated_pouches ?? o.pouches_count,
            boxes_count: payload.estimated_boxes ?? o.boxes_count,
            actual_pouches: payload.actual_pouches ?? o.actual_pouches,
          };
        })
      );
      setSnackbarMsg("Order updated successfully");
    } catch (err) {
      console.error("Failed to update order", err);
      setSnackbarMsg("Update failed");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setInlineEdits((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setSnackbarMsg("Order deleted successfully");
    } catch (err) {
      console.error("Failed to delete order:", err);
      setSnackbarMsg("Failed to delete order");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      order?.name,
      order?.order_id,
      order?.city,
    ].some((v) => String(v || "").toLowerCase().includes(q));
  });

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
        <Paper elevation={3} sx={{ width: "min(95%, 1200px)", p: 4, backgroundColor: "#ffffff", borderRadius: 2 }}>
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Apple Juice Processing Station
          </Typography>

          <TextField
            label="Search by customer, order ID, or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />

          <Stack spacing={2}>
            {filteredOrders.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No orders found.
              </Typography>
            )}

            {filteredOrders.map((order) => {
              const inlineEstimatedRaw = getInlineValue(order.order_id, "estimated_pouches", "");
              const estimatedPouches =
                inlineEstimatedRaw !== "" ? Number(inlineEstimatedRaw) : computeEstimatedPouches(order);
              const inlineBoxesRaw = getInlineValue(order.order_id, "estimated_boxes", "");
              const estimatedBoxes =
                inlineBoxesRaw !== "" ? Number(inlineBoxesRaw) : computeEstimatedBoxes(order, estimatedPouches);
              const inlineActualRaw = getInlineValue(order.order_id, "actual_pouches", order?.actual_pouches ?? "");
              const inlineWeightRaw = getInlineValue(order.order_id, "weight_kg", order?.weight_kg ?? "");
              const inlineStatus = getInlineValue(order.order_id, "status", order?.status || "In Progress");

              // Expiry date (1 year from today), dd/mm/yyyy for UI display
              const exp = new Date();
              exp.setFullYear(exp.getFullYear() + 1);
              const expiryUi = `${String(exp.getDate()).padStart(2, "0")}/${String(
                exp.getMonth() + 1
              ).padStart(2, "0")}/${exp.getFullYear()}`;

              return (
                <Card key={order.order_id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {order.name || "Unknown"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          City: {order.city || "—"} • Order ID: {order.order_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Est: {estimatedPouches || 0} pouches • Boxes: {estimatedBoxes || 0} • Actual:{" "}
                          {inlineActualRaw === "" ? "—" : inlineActualRaw} • Exp: {expiryUi}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Tooltip title="Print pouch label">
                          <IconButton size="small" color="primary" onClick={() => printPouchLabels(order)}>
                            <Print fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Generate QR codes">
                          <IconButton size="small" color="secondary" onClick={() => generateQRCodes(order)}>
                            <QrCode fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark as done">
                          <IconButton size="small" color="success" onClick={() => markOrderDone(order.order_id)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete order">
                          <IconButton size="small" color="error" onClick={() => handleDeleteOrder(order.order_id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Estimated pouches"
                          size="small"
                          type="number"
                          value={inlineEstimatedRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "estimated_pouches", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Actual pouches"
                          size="small"
                          type="number"
                          value={inlineActualRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "actual_pouches", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Estimated boxes"
                          size="small"
                          type="number"
                          value={inlineBoxesRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "estimated_boxes", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label="Weight (kg)"
                          size="small"
                          type="number"
                          value={inlineWeightRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "weight_kg", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          select
                          label="Status"
                          size="small"
                          value={inlineStatus}
                          onChange={(e) => handleInlineChange(order.order_id, "status", e.target.value)}
                          fullWidth
                        >
                          {statusOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Save fontSize="small" />}
                          onClick={() => handleInlineSave(order.order_id)}
                        >
                          Save
                        </Button>
                      </Grid>
                    </Grid>

                    <TextField
                      label="Comments"
                      fullWidth
                      multiline
                      minRows={2}
                      value={comments[order.order_id] || ""}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [order.order_id]: e.target.value }))
                      }
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

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
    </>
  );
}

export default JuiceHandlePage;
