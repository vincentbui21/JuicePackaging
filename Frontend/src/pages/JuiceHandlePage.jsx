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
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Print, QrCode, CheckCircle, Save, Delete, ViewList, ViewModule, Star } from "@mui/icons-material";
import { useEffect, useState } from "react";
import api from "../services/axios";
import { io } from "socket.io-client";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from "../services/send_to_printer";
import { useTranslation } from "react-i18next";

// Build socket URL from same base as axios
const WS_URL = (import.meta.env.VITE_API_BASE_URL || "https://api.mehustaja.fi/").replace(/\/+$/, "");
const socket = io(WS_URL);

function JuiceHandlePage() {
  const { t } = useTranslation();
  // data
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [search, setSearch] = useState("");
  const [inlineEdits, setInlineEdits] = useState({});
  const [viewMode, setViewMode] = useState(() => {
    // Load view mode from localStorage, default to "list"
    return localStorage.getItem('juiceHandleViewMode') || "list";
  });

  // Delete confirmation dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, order: null });

  // QR dialog
  const [qrCodes, setQrCodes] = useState({}); // { [orderId]: [{index, url}] }
  const [qrDialog, setQrDialog] = useState({ open: false, order: null });

  // comments for "mark as done"
  const [comments, setComments] = useState({});

  // notifications
  const [snackbarMsg, setSnackbarMsg] = useState("");

  // permission
  const [canAccessJuiceHandle, setCanAccessJuiceHandle] = useState(false);

  const statusOptions = [
    { value: "Created", label: "Created" },
    { value: "In Progress", label: "In Progress" },
    { value: "Processing complete", label: "processing complete" },
    { value: "Ready for pickup", label: "Ready for pickup" },
    { value: "Picked up", label: "Picked up" },
  ];

  // ---------- helpers (override-aware) ----------
  const computeEstimatedPouches = (order) => {
    const weight = Number(order?.weight_kg || 0);
    if (weight > 0) return Math.floor((weight * 0.65) / 3); // 0.65 yield, 3L pouch
    const fallback = Number(order?.pouches_count || 0);
    return Number.isNaN(fallback) ? 0 : fallback;
  };

  const computeEstimatedBoxes = (order, estimatedPouches) => {
    const p = Number(estimatedPouches || 0);
    return Math.max(1, Math.ceil(p / 8)); // 8 pouches per box
  };

  const getInlineValue = (orderId, field, fallback) =>
    inlineEdits?.[orderId]?.[field] ?? fallback;

  // ---------------------------------------------------------------------------
  // lifecycle
  useEffect(() => {
    fetchProcessingOrders({ page: 1, append: false });

    // Load permission - only admin or employees with Kuopio city access
    try {
      const permissionsStr = localStorage.getItem('userPermissions');
      if (permissionsStr) {
        const permissions = JSON.parse(permissionsStr);
        const isAdmin = permissions.role === 'admin';
        const hasKuopioAccess = permissions.allowed_cities && permissions.allowed_cities.includes('Kuopio');
        setCanAccessJuiceHandle(isAdmin || hasKuopioAccess);
      }
    } catch (err) {
      console.error('Failed to parse user permissions:', err);
    }

    const handleSocketUpdate = () => {
      fetchProcessingOrders({ page: 1, append: false });
      setSnackbarMsg("Order status updated!");
    };
    socket.on("order-status-updated", handleSocketUpdate);
    return () => socket.off("order-status-updated", handleSocketUpdate);
  }, []);

  const fetchProcessingOrders = async ({ page: nextPage = 1, append = false } = {}) => {
    try {
      setLoadingOrders(true);
      const res = await api.get("/orders", {
        params: { status: "In Progress", page: nextPage, limit: 20 },
      });
      const payload = Array.isArray(res.data)
        ? { rows: res.data, total: res.data.length, paged: false }
        : { rows: res.data?.rows || [], total: Number(res.data?.total || 0), paged: true };
      const sorted = [...payload.rows].sort((a, b) => {
        const aDate = new Date(a?.created_at || 0).getTime();
        const bDate = new Date(b?.created_at || 0).getTime();
        return aDate - bDate;
      });
      setOrders((prev) => {
        if (!append) return sorted;
        const merged = [...prev, ...sorted];
        const seen = new Set();
        return merged.filter((item) => {
          if (seen.has(item.order_id)) return false;
          seen.add(item.order_id);
          return true;
        });
      });
      if (payload.paged) {
        setHasMore(nextPage * 20 < payload.total);
        setPage(nextPage);
      } else {
        setHasMore(false);
        setPage(1);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
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
            actual_pouches: order?.actual_pouches || order?.pouches_count || estimatedPouches,
            actual_boxes: (order?.boxes_count > 0) ? order.boxes_count : estimatedBoxes,
          };
        }
      });
      return next;
    });
  }, [orders]);

  useEffect(() => {
    setComments(prevComments => {
        const newComments = { ...prevComments };
        orders.forEach(order => {
            if (newComments[order.order_id] === undefined && order.notes) {
                newComments[order.order_id] = order.notes;
            }
        });
        return newComments;
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
    const estimatedPouches = computeEstimatedPouches(order);
    const estimatedBoxes = computeEstimatedBoxes(order, estimatedPouches);
    const actualBoxes = Number(inline.actual_boxes || order?.boxes_count || 0);
    const count = actualBoxes > 0 ? actualBoxes : estimatedBoxes;
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
        // Add delay between prints to avoid popup blocker
        if (index < total) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      setSnackbarMsg("All QR codes sent to printer");
    } catch (err) {
      console.error("Print all failed", err);
      setSnackbarMsg(err.message || "Failed to print all QRs (see console)");
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
      actual_pouches: edits.actual_pouches !== "" ? Number(edits.actual_pouches) : undefined,
      actual_boxes: edits.actual_boxes !== "" ? Number(edits.actual_boxes) : undefined,
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
            actual_pouches: payload.actual_pouches ?? o.actual_pouches,
            boxes_count: payload.actual_boxes ?? o.boxes_count,
          };
        })
      );
      setSnackbarMsg("Order updated successfully");
    } catch (err) {
      console.error("Failed to update order", err);
      setSnackbarMsg("Update failed");
    }
  };

  const handleDeleteClick = (order) => {
    setDeleteConfirmDialog({ open: true, order });
  };

  const handleConfirmDelete = async () => {
    const order = deleteConfirmDialog.order;
    setDeleteConfirmDialog({ open: false, order: null });

    try {
      const customer_id = order.customer_id;
      if (!customer_id) {
        setSnackbarMsg("Delete failed: Customer ID not found on the selected order.");
        return;
      }

      await api.delete("/customer", { data: { customer_id: customer_id } });
      
      fetchProcessingOrders({ page: 1, append: false });
      setSnackbarMsg("Customer moved to Delete Bin");
    } catch (err) {
      console.error("Delete failed:", err);
      setSnackbarMsg(err.response?.data?.error || "Delete failed.");
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmDialog({ open: false, order: null });
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

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      localStorage.setItem('juiceHandleViewMode', newMode);
    }
  };

  // ---------------------------------------------------------------------------
  // render
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
        <Paper elevation={3} sx={{ width: viewMode === "grid" ? "min(95%, 1400px)" : "min(95%, 1200px)", p: 4, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            {t('juice_processing.title')}
          </Typography>

          {!canAccessJuiceHandle && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('juice_processing.view_only_warning')}
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
            <TextField
              label={t('juice_processing.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="small"
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
            >
              <ToggleButton value="list" aria-label="list view">
                <ViewList />
              </ToggleButton>
              <ToggleButton value="grid" aria-label="grid view">
                <ViewModule />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {viewMode === "list" ? (
            <Stack spacing={2}>
              {filteredOrders.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('juice_processing.no_orders_found')}
                </Typography>
              )}

            {filteredOrders.map((order) => {
              const estimatedPouches =
                computeEstimatedPouches(order);
              const estimatedBoxes = computeEstimatedBoxes(order, estimatedPouches);
              const inlineActualRaw = getInlineValue(order.order_id, "actual_pouches", order?.actual_pouches ?? "");
              const inlineActualBoxesRaw = getInlineValue(order.order_id, "actual_boxes", order?.boxes_count ?? "");
              const inlineWeightRaw = getInlineValue(order.order_id, "weight_kg", order?.weight_kg ?? "");
              const inlineStatus = getInlineValue(order.order_id, "status", order?.status || "In Progress");

              // Expiry date (1 year from today), dd/mm/yyyy for UI display
              const exp = new Date();
              exp.setFullYear(exp.getFullYear() + 1);
              const expiryUi = `${String(exp.getDate()).padStart(2, "0")}/${String(
                exp.getMonth() + 1
              ).padStart(2, "0")}/${exp.getFullYear()}`;

              return (
                <Card 
                  key={order.order_id} 
                  sx={{ 
                    border: "1px solid", 
                    borderColor: "divider", 
                    borderRadius: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      alignItems={{ xs: "flex-start", md: "center" }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6" fontWeight={700}>
                            {order.name || t('juice_processing.unknown')}
                          </Typography>
                          {order.is_from_reservation ? (
                            <Tooltip title={t('juice_processing.reservation_tooltip')}>
                              <Star sx={{ color: '#FFB300' }} fontSize="small" />
                            </Tooltip>
                          ) : null}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          <strong>{t('juice_processing.city')}:</strong> {order.city || "—"} • <strong>{t('juice_processing.order_id')}:</strong> {order.order_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>{t('juice_processing.est')}:</strong> {estimatedPouches || 0} {t('juice_processing.pouches')} • <strong>{t('juice_processing.est_boxes')}:</strong> {estimatedBoxes || 0} • <strong>{t('juice_processing.actual_pouches')}:</strong>{" "}
                          {inlineActualRaw === "" ? "—" : inlineActualRaw} • <strong>{t('juice_processing.actual_boxes')}:</strong>{" "}
                          {inlineActualBoxesRaw === "" ? "—" : inlineActualBoxesRaw} • <strong>{t('juice_processing.exp')}:</strong> {expiryUi}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.print_pouch_label')}>
                          <span>
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => printPouchLabels(order)}
                              disabled={!canAccessJuiceHandle}
                            >
                              <Print fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.generate_qr_codes')}>
                          <span>
                            <IconButton 
                              size="small" 
                              color="secondary" 
                              onClick={() => generateQRCodes(order)}
                              disabled={!canAccessJuiceHandle}
                            >
                              <QrCode fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.mark_as_done')}>
                          <span>
                            <IconButton 
                              size="small" 
                              color="success" 
                              onClick={() => markOrderDone(order.order_id)}
                              disabled={!canAccessJuiceHandle}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.delete_order')}>
                          <span>
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleDeleteClick(order)}
                              disabled={!canAccessJuiceHandle}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label={t('juice_processing.estimated_pouches')}
                          size="small"
                          type="number"
                          value={estimatedPouches || 0}
                          InputProps={{ readOnly: true }}
                          fullWidth
                          sx={{
                            '& .MuiInputBase-root': {
                              backgroundColor: 'action.hover',
                              color: 'text.secondary'
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label={t('juice_processing.actual_pouches_label')}
                          size="small"
                          type="number"
                          value={inlineActualRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "actual_pouches", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label={t('juice_processing.estimated_boxes')}
                          size="small"
                          type="number"
                          value={estimatedBoxes || 0}
                          InputProps={{ readOnly: true }}
                          fullWidth
                          sx={{
                            '& .MuiInputBase-root': {
                              backgroundColor: 'action.hover',
                              color: 'text.secondary'
                            }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label={t('juice_processing.actual_boxes_label')}
                          size="small"
                          type="number"
                          value={inlineActualBoxesRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "actual_boxes", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          label={t('juice_processing.weight_kg')}
                          size="small"
                          type="number"
                          value={inlineWeightRaw}
                          onChange={(e) => handleInlineChange(order.order_id, "weight_kg", e.target.value)}
                          fullWidth
                        />
                      </Grid>
                      {/* <Grid item xs={12} sm={6} md={3}>
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
                      </Grid> */}
                      <Grid item xs={12} sm={6} md={3}>
                        <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : ""} placement="top">
                          <span>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Save fontSize="small" />}
                              onClick={() => handleInlineSave(order.order_id)}
                              disabled={!canAccessJuiceHandle}
                            >
                              {t('juice_processing.save')}
                            </Button>
                          </span>
                        </Tooltip>
                      </Grid>
                    </Grid>

                    <TextField
                      label={t('juice_processing.comments')}
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
          ) : (
            <Grid container spacing={3}>
              {filteredOrders.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    No orders found.
                  </Typography>
                </Grid>
              )}
              {filteredOrders.map((order) => {
                const estimatedPouches = computeEstimatedPouches(order);
                const estimatedBoxes = computeEstimatedBoxes(order, estimatedPouches);
                const inlineActualRaw = getInlineValue(order.order_id, "actual_pouches", order?.actual_pouches ?? "");
                const inlineActualBoxesRaw = getInlineValue(order.order_id, "actual_boxes", order?.boxes_count ?? "");
                const inlineWeightRaw = getInlineValue(order.order_id, "weight_kg", order?.weight_kg ?? "");

                const exp = new Date();
                exp.setFullYear(exp.getFullYear() + 1);
                const expiryUi = `${String(exp.getDate()).padStart(2, "0")}/${String(
                  exp.getMonth() + 1
                ).padStart(2, "0")}/${exp.getFullYear()}`;

                return (
                  <Grid item xs={12} sm={6} key={order.order_id}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 3,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 6,
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6" fontWeight={700} gutterBottom noWrap>
                            {order.name || "Unknown"}
                          </Typography>
                          {order.is_from_reservation ? (
                            <Tooltip title={t('juice_processing.reservation_tooltip')}>
                              <Star sx={{ color: '#FFB300' }} fontSize="small" />
                            </Tooltip>
                          ) : null}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('juice_processing.city')}: {order.city || "—"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          {t('juice_processing.order')}: {order.order_id.slice(0, 8)}...
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        <Stack spacing={1} sx={{ my: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{t('juice_processing.est_pouches')}:</Typography>
                            <Typography variant="body2" fontWeight="medium">{estimatedPouches || 0}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{t('juice_processing.actual_pouches')}:</Typography>
                            <Typography variant="body2" fontWeight="medium">{inlineActualRaw === "" ? "—" : inlineActualRaw}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{t('juice_processing.est_boxes')}:</Typography>
                            <Typography variant="body2" fontWeight="medium">{estimatedBoxes || 0}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{t('juice_processing.actual_boxes')}:</Typography>
                            <Typography variant="body2" fontWeight="medium">{inlineActualBoxesRaw === "" ? "—" : inlineActualBoxesRaw}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{t('juice_processing.weight')}:</Typography>
                            <Typography variant="body2" fontWeight="medium">{inlineWeightRaw} kg</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">{t('juice_processing.expiry')}:</Typography>
                            <Typography variant="body2" fontWeight="medium">{expiryUi}</Typography>
                          </Box>
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
                          <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.print_pouch_label')}>
                            <span>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => printPouchLabels(order)}
                                disabled={!canAccessJuiceHandle}
                              >
                                <Print fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.generate_qr_codes')}>
                            <span>
                              <IconButton 
                                size="small" 
                                color="secondary" 
                                onClick={() => generateQRCodes(order)}
                                disabled={!canAccessJuiceHandle}
                              >
                                <QrCode fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.mark_as_done')}>
                            <span>
                              <IconButton 
                                size="small" 
                                color="success" 
                                onClick={() => markOrderDone(order.order_id)}
                                disabled={!canAccessJuiceHandle}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : t('juice_processing.delete_order')}>
                            <span>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDeleteClick(order)}
                                disabled={!canAccessJuiceHandle}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>

                        <TextField
                          label={t('juice_processing.comments')}
                          fullWidth
                          multiline
                          minRows={2}
                          size="small"
                          value={comments[order.order_id] || ""}
                          onChange={(e) =>
                            setComments((prev) => ({ ...prev, [order.order_id]: e.target.value }))
                          }
                          sx={{ mt: 2 }}
                        />

                        <Stack spacing={1} sx={{ mt: 2 }}>
                          <TextField
                            label={t('juice_processing.actual_pouches_label')}
                            size="small"
                            type="number"
                            value={inlineActualRaw}
                            onChange={(e) => handleInlineChange(order.order_id, "actual_pouches", e.target.value)}
                            fullWidth
                          />
                          <TextField
                            label={t('juice_processing.actual_boxes_label')}
                            size="small"
                            type="number"
                            value={inlineActualBoxesRaw}
                            onChange={(e) => handleInlineChange(order.order_id, "actual_boxes", e.target.value)}
                            fullWidth
                          />
                          <TextField
                            label={t('juice_processing.weight_kg')}
                            size="small"
                            type="number"
                            value={inlineWeightRaw}
                            onChange={(e) => handleInlineChange(order.order_id, "weight_kg", e.target.value)}
                            fullWidth
                          />
                          <Tooltip title={!canAccessJuiceHandle ? t('juice_processing.kuopio_access_required') : ""} placement="top">
                            <span>
                              <Button
                                variant="contained"
                                size="small"
                                fullWidth
                                startIcon={<Save fontSize="small" />}
                                onClick={() => handleInlineSave(order.order_id)}
                                disabled={!canAccessJuiceHandle}
                              >
                                {t('juice_processing.save_changes')}
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {hasMore && (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => fetchProcessingOrders({ page: page + 1, append: true })}
                disabled={loadingOrders}
              >
                {loadingOrders ? t('juice_processing.loading') : t('juice_processing.load_more')}
              </Button>
            </Stack>
          )}

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
          {qrDialog.order ? `${t('juice_processing.qr_codes')} — ${qrDialog.order.name}` : t('juice_processing.qr_codes')}
        </DialogTitle>
        <DialogContent dividers>
          {qrDialog.order && (qrCodes[qrDialog.order.order_id] || []).length > 0 ? (
            <Grid container spacing={2}>
              {qrCodes[qrDialog.order.order_id].map(({ url, index }) => (
                <Grid item xs={6} key={index}>
                  <Card sx={{ p: 1 }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {t('juice_processing.box')} {index}
                      </Typography>
                      <img src={url} alt={`QR ${index}`} style={{ width: 120, height: 120 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('juice_processing.no_qr_codes')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog({ open: false, order: null })}>{t('juice_processing.close')}</Button>
          <Button
            variant="contained"
            onClick={handlePrintAll}
            disabled={!qrDialog.order || !(qrCodes[qrDialog.order.order_id] || []).length}
          >
            {t('juice_processing.print_all')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onClose={handleCancelDelete}>
        <DialogTitle>{t('juice_processing.confirm_delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('juice_processing.delete_confirmation_message', { name: deleteConfirmDialog.order?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>{t('juice_processing.cancel')}</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            {t('juice_processing.yes_delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default JuiceHandlePage;
