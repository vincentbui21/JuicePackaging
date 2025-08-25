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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Edit, QrCode, Delete, Print} from "@mui/icons-material";
import api from "../services/axios";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";

function JuiceProcessingManagement() {
  const [orders, setOrders] = useState([]);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [search, setSearch] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qrCodes, setQrCodes] = useState({});
  const [editedFields, setEditedFields] = useState({
    name: "",
    status: "",
    weight_kg: "",
    estimated_pouches: "",
    estimated_boxes: "",
  });

  /** -------- PRINT -------- */
  const printSingleQRCode = (url, index) => {
    const popup = window.open("", "_blank");
    popup.document.write(`
      <html>
        <head><title>Print QR Code</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;font-family:Arial;">
          <p style="margin:6px 0;">Box ${index}</p>
          <img src="${url}" style="width:150px;height:150px;" />
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  };
  /** -------------------------------- */

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
          estimated_pouches: order?.estimated_pouches ?? estimatedPouches,
          estimated_boxes: order?.estimated_boxes ?? estimatedBoxes,
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
        productionDate: expiryDate, // keep legacy param name for server compatibility
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
      setSnackbarMsg("QR Codes generated");
    } catch (e) {
      console.error(e);
      setSnackbarMsg("Failed to generate QR Codes");
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
      flex: 0,                 // don't let it shrink
      minWidth: 280,           // room for 4 icons
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
    }
  ];

  const filteredRows = orders.filter((o) =>
    (o?.name || "").toLowerCase().includes(search.toLowerCase())
  );

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
          overflowX: "auto"
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
            sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}
          >
            Order Management
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
            // ensure the Actions column doesn't clip last buttons on tight layouts
            '& .MuiDataGrid-cell[data-field="actions"]': { overflow: "visible" },
         }}
        />

        </Paper>
      </Box>

      {/* QR sections */}
      {Object.entries(qrCodes).map(([orderId, data]) => (
        <Box key={orderId} mt={2} p={2} component={Paper} sx={{ width: "min(1200px, 95%)", mx: "auto",overflowX: "auto" }}>
          <Typography variant="h6">QR Codes for Order: {orderId}</Typography>
          <Typography>Pouches: {data.pouches}</Typography>
          <Typography>Boxes: {data.boxes}</Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" mt={2}>
            {data.codes.map(({ index, url }) => (
              <Card key={index} sx={{ p: 1, backgroundColor: "#fff" }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="body2">Box {index}</Typography>
                  <img src={url} alt={`QR ${index}`} style={{ width: 120, height: 120 }} />
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    variant="outlined"
                    onClick={() => printSingleQRCode(url, index)}
                  >
                    Print
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      ))}

      {/* Edit Dialog */}
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
              label="Status"
              value={editedFields.status}
              onChange={(e) => setEditedFields((p) => ({ ...p, status: e.target.value }))}
              fullWidth
            />
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
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
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
