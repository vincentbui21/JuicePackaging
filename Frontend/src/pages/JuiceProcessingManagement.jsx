import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Snackbar,
  IconButton,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  MenuItem
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Edit, QrCode, Delete, Print } from "@mui/icons-material";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from "../services/send_to_printer";

function JuiceProcessingManagement() {
  const [orders, setOrders] = useState([]);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Store generated codes: { [orderId]: { pouches, boxes, codes:[{index,url}] } }
  const [qrCodes, setQrCodes] = useState({});

  // QR popup/dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDialogOrderId, setQrDialogOrderId] = useState(null);

  const [editedFields, setEditedFields] = useState({
    name: "",
    status: "",
    weight_kg: "",
    estimated_pouches: "",
    estimated_boxes: "",
  });

  const getOrderById = (id) => orders.find((o) => o.order_id === id) || null;

  useEffect(() => {
    fetchOrders();
  }, []);

  const computeFromWeight = (weight_kg) => {
    const w = Number(weight_kg) || 0;
    const estimatedPouches = Math.floor((w * 0.65) / 3);
    const estimatedBoxes = Math.ceil(estimatedPouches / 8);
    return { estimatedPouches, estimatedBoxes };
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders?status=processing complete");
      const enriched = (res.data || []).map((order) => {
        const { estimatedPouches, estimatedBoxes } = computeFromWeight(order.weight_kg);
        return {
          ...order,
          // prefer persisted counts if present, otherwise computed fallback
          estimated_pouches: order?.pouches_count ?? estimatedPouches,
          estimated_boxes: order?.boxes_count ?? estimatedBoxes,
        };
      });
      setOrders(enriched);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setSnackbarMsg("Failed to fetch orders");
    }
  };

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

      await api.post("/printer/print-pouch", {
        customer,
        productionDate: expiryDate, // legacy param name for server compatibility
        expiryDate,
      });

      setSnackbarMsg("Pouch print sent (Expiry +1 year)");
    } catch (e) {
      console.error("printPouchLabels failed", e);
      setSnackbarMsg("Failed to print pouch");
    }
  };

  const handleShowQR = async (order) => {
    try {
      const boxesToUse = Number(order.estimated_boxes) || 0;
      const codes = [];
      for (let i = 0; i < boxesToUse; i++) {
        const text = `BOX_${order.order_id}_${i + 1}`;
        const png = await generateSmallPngQRCode(text);
        codes.push({ index: i + 1, url: png });
      }

      setQrCodes((prev) => ({
        ...prev,
        [order.order_id]: {
          pouches: order.estimated_pouches,
          boxes: boxesToUse,
          codes,
        },
      }));

      // open dialog for this order
      setQrDialogOrderId(order.order_id);
      setQrDialogOpen(true);
      setSnackbarMsg("QR Codes generated");
    } catch (e) {
      console.error(e);
      setSnackbarMsg("Failed to generate QR Codes");
    }
  };

  // Use device print management for single QR too
  const printSingleQRCode = async (orderId, url, index) => {
    const order = getOrderById(orderId);
    try {
      await printImage(url, order?.name || "Customer", `b${index}/1`);
      setSnackbarMsg(`Box ${index} sent to printer`);
    } catch (e) {
      console.error("Single print failed", e);
      setSnackbarMsg("Failed to print QR");
    }
  };

  // Use device print management for ALL QRs
  const printAllQRCodes = async (orderId) => {
    const order = getOrderById(orderId);
    const data = qrCodes[orderId];
    if (!data || !data.codes?.length) return;

    try {
      const total = data.codes.length;
      for (const { index, url } of data.codes) {
        await printImage(url, order?.name || "Customer", `b${index}/${total}`);
      }
      setSnackbarMsg("All QR codes sent to printer");
    } catch (e) {
      console.error("Print all failed", e);
      setSnackbarMsg("Failed to print all QRs");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setQrCodes((prev) => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
      setSnackbarMsg("Order deleted successfully");
    } catch (err) {
      console.error("Failed to delete order", err);
      setSnackbarMsg("Failed to delete order");
    }
  };

  const openEditDialog = (row) => {
    setSelectedOrder(row);
    setEditedFields({
      name: row?.name ?? "",
      status: row?.status ?? "",
      weight_kg: row?.weight_kg ?? "",
      estimated_pouches: row?.estimated_pouches ?? "",
      estimated_boxes: row?.estimated_boxes ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedOrder) return;

    const payload = {
      name: editedFields.name,
      status: editedFields.status,
      weight_kg: Number(editedFields.weight_kg),
      estimated_pouches: Number(editedFields.estimated_pouches),
      estimated_boxes: Number(editedFields.estimated_boxes),
    };

    try {
      await api.put(`/orders/${selectedOrder.order_id}`, payload);

      // Update locally so QR generation uses overridden values immediately
      setOrders((prev) =>
        prev.map((o) => (o.order_id === selectedOrder.order_id ? { ...o, ...payload } : o))
      );

      setSnackbarMsg("Order updated successfully");
      setEditDialogOpen(false);
    } catch (err) {
      console.error("Failed to update order", err);
      setSnackbarMsg("Update failed");
    }
  };

  const statusOptions = [
    { value: "Created", label: "Created" },
    { value: "Picked up", label: "Picked up" },
    { value: "Ready for pickup", label: "Ready for pickup" },
    { value: "Processing complete", label: "processing complete" },
    { value: "In Progress", label: "In Progress" },
  ];

  const columns = [
    { field: "order_id", headerName: "Order ID", flex: 1 },
    { field: "name", headerName: "Customer", flex: 1.5 },
    { field: "weight_kg", headerName: "Weight (kg)", flex: 1 },
    { field: "estimated_pouches", headerName: "Pouches", flex: 1 },
    { field: "estimated_boxes", headerName: "Boxes", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      flex: 0,
      minWidth: 280,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton color="primary" onClick={() => openEditDialog(params.row)} size="small">
            <Edit fontSize="small" />
          </IconButton>
          <IconButton color="secondary" onClick={() => handleShowQR(params.row)} size="small">
            <QrCode fontSize="small" />
          </IconButton>
          <IconButton
            color="success"
            onClick={() => printPouchLabels(params.row)}
            title="Print Pouch Info"
            size="small"
          >
            <Print fontSize="small" />
          </IconButton>
          <IconButton color="error" onClick={() => handleDeleteOrder(params.row.order_id)} size="small">
            <Delete fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const filteredRows = orders.filter((o) =>
    (o?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const currentQrData = qrDialogOrderId ? qrCodes[qrDialogOrderId] : null;

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
          overflowX: "auto",
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
            Juice Processing Management
          </Typography>

          <TextField
            label="Search Orders"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 2, backgroundColor: "white", borderRadius: 1 }}
          />

          <DataGrid
            autoHeight
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.order_id}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            sx={{
              backgroundColor: "white",
              borderRadius: 2,
              boxShadow: 3,
              '& .MuiDataGrid-cell[data-field="actions"]': { overflow: "visible" },
            }}
          />
        </Paper>
      </Box>

      {/* QR dialog (uses device printer for single + all) */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {qrDialogOrderId ? `QR Codes — Order ${qrDialogOrderId}` : "QR Codes"}
        </DialogTitle>
        <DialogContent dividers>
          {currentQrData ? (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Pouches: {currentQrData.pouches} &nbsp; • &nbsp; Boxes: {currentQrData.boxes}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {currentQrData.codes.map(({ index, url }) => (
                  <Card key={index} sx={{ p: 1, backgroundColor: "#fff" }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2">Box {index}</Typography>
                      <img
                        src={url}
                        alt={`QR ${index}`}
                        style={{ width: 120, height: 120 }}
                      />
                      <Button
                        size="small"
                        sx={{ mt: 1 }}
                        variant="outlined"
                        onClick={() => printSingleQRCode(qrDialogOrderId, url, index)}
                      >
                        Print this
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="body2">No QR codes generated.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => qrDialogOrderId && printAllQRCodes(qrDialogOrderId)}
            disabled={!qrDialogOrderId || !currentQrData?.codes?.length}
          >
            Print All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog (unchanged) */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent>
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
              helperText="Please select the order status"
            >
              {[
                { value: "Created", label: "Created" },
                { value: "Picked up", label: "Picked up" },
                { value: "Ready for pickup", label: "Ready for pickup" },
                { value: "Processing complete", label: "processing complete" },
                { value: "In Progress", label: "In Progress" },
              ].map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
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
              label="Estimated Pouches"
              type="number"
              value={editedFields.estimated_pouches}
              onChange={(e) => setEditedFields((p) => ({ ...p, estimated_pouches: e.target.value }))}
              fullWidth
              helperText="Manual override. Will be used instead of the formula."
            />
            <TextField
              label="Estimated Boxes"
              type="number"
              value={editedFields.estimated_boxes}
              onChange={(e) => setEditedFields((p) => ({ ...p, estimated_boxes: e.target.value }))}
              fullWidth
              helperText="Manual override. QR generation will use this."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
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

export default JuiceProcessingManagement;
