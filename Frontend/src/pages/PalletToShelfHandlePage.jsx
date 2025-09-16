// Frontend/src/pages/PalletToShelfHandlePage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  Snackbar,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DrawerComponent from "../components/drawer";
import QRScanner from "../components/qrcamscanner";
import CustomerInfoCard from "../components/customerinfoshowcard";
import SmsConfirmDialog from "../components/SmsConfirmDialog";
import api from "../services/axios";

export default function PalletToShelfHandlePage() {
  const InitialOrderInfo = {
    order_id: "",
    name: "",
    city: "",
    boxes_count: 0,
  };

  const [scanResult, setScanResult] = useState(null);

  // Context we show (optional, but nice when available)
  const [orderInfo, setOrderInfo] = useState(InitialOrderInfo);
  const [fetchedBoxList, setFetchedBoxList] = useState([]);
  const [ordersOnPallet, setOrdersOnPallet] = useState([]);

  // What we actually need to submit
  const [palletId, setPalletId] = useState("");
  const [shelfId, setShelfId] = useState("");

  // Extra – you can scan boxes here too if you want progress UI,
  // but they are NOT required to submit.
  const [scannedBoxes, setScannedBoxes] = useState([]);

  // UI state
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // SMS confirmation dialog state
  const [smsOpen, setSmsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const short = (id) => (id ? `${id.slice(0, 6)}…${id.slice(-6)}` : "—");

  // ---------- Pallet context fetch (boxes + orders) ----------
  async function fetchPalletContext(pId) {
    if (!pId) return;
    try {
      const enc = encodeURIComponent(pId);
      const [{ data: ctx }, { data: orders }] = await Promise.all([
        api.get(`/pallets/${enc}/order-context`), // <-- exact route
        api.get(`/pallets/${enc}/orders`),        // <-- exact route
      ]);

      const boxes = Array.isArray(ctx?.boxes) ? ctx.boxes : [];
      const orderList = Array.isArray(orders) ? orders : [];

      setFetchedBoxList(boxes);
      setOrdersOnPallet(orderList);

      // Show one "primary" order in the summary card if available
      if (orderList.length) {
        const o = orderList[0];
        setOrderInfo((prev) => ({
          ...prev,
          order_id: o.order_id || "",
          name: o.name || prev.name,
          city: o.city || prev.city,
          boxes_count:
            typeof ctx?.boxes_count === "number"
              ? ctx.boxes_count
              : prev.boxes_count,
        }));
      } else {
        // Still let the chip show box count from context if present
        setOrderInfo((prev) => ({
          ...prev,
          boxes_count:
            typeof ctx?.boxes_count === "number"
              ? ctx.boxes_count
              : prev.boxes_count,
        }));
      }
    } catch (err) {
      console.error("Failed to load pallet context", err);
      // Don’t kill the UI; just show a small toast
      setSnackbarMsg("Failed to fetch pallet context");
    }
  }

  // Fetch context whenever a pallet is linked
  useEffect(() => {
    if (palletId) fetchPalletContext(palletId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palletId]);

  // ---------- Scanner handling ----------
  useEffect(() => {
    if (!scanResult) return;

    const raw = String(scanResult).trim();
    const upper = raw.toUpperCase();
    const uuidMatch = raw.match(/[0-9a-fA-F-]{36}/);
    const uuid = uuidMatch ? uuidMatch[0] : null;

    // PALLET (“PALLET_…” or bare UUID)
    if (upper.startsWith("PALLET") || (!!uuid && !raw.includes("_"))) {
      const id = upper.startsWith("PALLET")
        ? raw.replace(/^PALLET[\s_:\-]*/i, "").trim()
        : uuid;

      if (id) {
        setPalletId(id);
        setSnackbarMsg("Pallet linked");
        // reset context until fetched
        setFetchedBoxList([]);
        setOrdersOnPallet([]);
        setOrderInfo((prev) => ({ ...prev, order_id: "" }));
      }
      return;
    }

    // SHELF
    if (upper.startsWith("SHELF")) {
      const id = raw.replace(/^SHELF[\s_:\-]*/i, "").trim();
      if (id) {
        setShelfId(id);
        setSnackbarMsg("Shelf linked");
      }
      return;
    }

    // BOX – optional on this page (we don’t require it to submit)
    if (upper.startsWith("BOX")) {
      // Normalize like BOX_<orderId>_<n>
      const normalized = raw.replace(/\s+/g, "_");
      const parts = normalized.split("_");
      if (parts.length >= 3) {
        const order_id = parts[1];

        // reflect an order in the top chip list
        setOrdersOnPallet((prev) => {
          if (prev.some((o) => o.order_id === order_id)) return prev;
          return [...prev, { order_id }];
        });

        // If we still don’t have a visible order on the card, try to fetch it
        if (order_id && !orderInfo.order_id) {
          api
            .get(`/orders/${order_id}/boxes`)
            .then((res) => {
              const data = res?.data || {};
              setOrderInfo({
                order_id,
                name: data.name || "",
                city: data.city || "",
                boxes_count:
                  data.boxes_count ||
                  (Array.isArray(data.boxes) ? data.boxes.length : 0) ||
                  0,
              });
              setFetchedBoxList(Array.isArray(data.boxes) ? data.boxes : []);
            })
            .catch(() => setSnackbarMsg("Failed to fetch order/boxes"));
        }
      }

      setScannedBoxes((prev) => (prev.includes(raw) ? prev : [...prev, raw]));
      return;
    }

    setSnackbarMsg("Unrecognized QR");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResult]);

  // ---------- Submit flow (review → SMS confirm → POST) ----------
  const canSubmit = useMemo(() => Boolean(palletId) && Boolean(shelfId), [palletId, shelfId]);

  const handleOpenConfirm = () => setConfirmOpen(true);
  const handleConfirmCancel = () => setConfirmOpen(false);
  const handleConfirmContinue = () => {
    setConfirmOpen(false);
    setPendingAction(() => submitWithFlag);
    setSmsOpen(true);
  };

  const handleSmsChoice = async (sendNow) => {
    setSmsOpen(false);
    if (pendingAction) await pendingAction(sendNow);
  };

  const submitWithFlag = async (sendSms) => {
    try {
      setSubmitting(true);
  
      // 1) Assign pallet -> shelf on the server
      await api.post("/pallets/assign-shelf", {
        palletId,
        shelfId,
        sendSms,
      });
  
      // 2) Record SMS decision per order on this pallet (non-blocking)
      try {
        const orders = Array.isArray(ordersOnPallet) ? ordersOnPallet : [];
        await Promise.all(
          orders
            .map(o => o?.order_id)
            .filter(Boolean)
            .map(orderId =>
              api.post(
                `/orders/${encodeURIComponent(orderId)}/sms-status`,
                { sent: !!sendSms, source: "pallet-to-shelf" }
              )
            )
        );
      } catch (e) {
        // Do not block the main flow if this fails
        console.warn("sms-status record failed (non-blocking):", e?.message || e);
      }
  
      // 3) Reset UI
      setPalletId("");
      setShelfId("");
      setOrderInfo(InitialOrderInfo);
      setFetchedBoxList([]);
      setOrdersOnPallet([]);
      setScannedBoxes([]);
      setSnackbarMsg(sendSms ? "Assigned & SMS sent (if available)" : "Assigned (SMS skipped)");
    } catch (err) {
      console.error("Assign to shelf failed:", err);
      setSnackbarMsg("Submit failed. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };
  

  const handleClear = () => {
    setOrderInfo(InitialOrderInfo);
    setFetchedBoxList([]);
    setOrdersOnPallet([]);
    setScannedBoxes([]);
    setPalletId("");
    setShelfId("");
  };

  const scannedCount = scannedBoxes.length;
  const expectedCount = Number(orderInfo.boxes_count || 0);

  return (
    <>
      <DrawerComponent />

      <Container maxWidth="md" sx={{ py: 4, height: "95vh" }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            display: "flex",
            height: "auto",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {submitting && (
            <Box sx={{ position: "absolute", left: 0, right: 0, top: 0 }}>
              <LinearProgress />
            </Box>
          )}

          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Pallet → Shelf Handling
          </Typography>

          <Stack spacing={3} alignItems="center">
            <QRScanner onResult={setScanResult} />

            {/* Quick link summary */}
            <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
                <Chip label={`Pallet: ${palletId ? short(palletId) : "—"}`} color={palletId ? "success" : "default"} />
                <Chip label={`Shelf: ${shelfId ? shelfId : "—"}`} color={shelfId ? "success" : "default"} />
                <Chip
                  label={`Orders on pallet: ${ordersOnPallet.length}`}
                  color={ordersOnPallet.length ? "success" : "default"}
                />
                <Chip
                  label={`Boxes (fetched): ${fetchedBoxList.length}`}
                  color={fetchedBoxList.length ? "success" : "default"}
                />
                <Chip label={`Scanned boxes here: ${scannedCount}`} />
              </Stack>

              {!!ordersOnPallet.length && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Orders on this pallet
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {ordersOnPallet.map((o, i) => (
                      <Chip
                        key={i}
                        variant="outlined"
                        label={
                          o.name ? `${o.name} • ${short(o.order_id)}` : short(o.order_id)
                        }
                      />
                    ))}
                  </Stack>
                </>
              )}
            </Paper>


            {/* Optional: show fetched box list (from order/pallet context) */}
            {!!fetchedBoxList.length && (
              <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Boxes on context ({fetchedBoxList.length})
                </Typography>
                <List dense>
                  {fetchedBoxList.slice(0, 8).map((b, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText
                        primary={String(b.box_id || b.id || b)}
                        secondary={
                          b.order_id ? `Order: ${short(b.order_id)}` : undefined
                        }
                      />
                    </ListItem>
                  ))}
                  {fetchedBoxList.length > 8 && (
                    <ListItem disableGutters>
                      <ListItemText primary={`…and ${fetchedBoxList.length - 8} more`} />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={handleClear} disabled={submitting}>
                Clear
              </Button>
              <Button variant="contained" onClick={handleOpenConfirm} disabled={!canSubmit || submitting}>
                Assign to Shelf
              </Button>
            </Stack>

            {!canSubmit && (
              <Typography variant="caption" color="text.secondary">
                Tip: scan a <strong>PALLET</strong> and a <strong>SHELF</strong> to enable the
                button. Scanning a <strong>BOX</strong> is optional (only for showing order details).
              </Typography>
            )}
          </Stack>
        </Paper>
      </Container>

      <Snackbar
        open={Boolean(snackbarMsg)}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
      >
        <Alert severity="info" onClose={() => setSnackbarMsg("")}>
          {snackbarMsg}
        </Alert>
      </Snackbar>

      {/* Review/confirm dialog */}
      <Dialog open={confirmOpen} onClose={handleConfirmCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Review assignment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Pallet:</strong> {palletId || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Shelf:</strong> {shelfId || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Orders on pallet:</strong> {ordersOnPallet.length}
            </Typography>
            <Typography variant="body2">
              <strong>Order (context):</strong> {orderInfo.order_id || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Customer:</strong> {orderInfo.name || "—"}{" "}
              {orderInfo.city ? `(${orderInfo.city})` : ""}
            </Typography>
            <Typography variant="body2">
              <strong>Boxes (context):</strong> {fetchedBoxList.length}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel}>Back</Button>
          <Button variant="contained" onClick={handleConfirmContinue}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* SMS confirm */}
      <SmsConfirmDialog
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        onChoice={handleSmsChoice}
        title="Send pickup SMS now?"
        message="If you choose 'Yes', customers will be notified immediately that their order is ready."
      />
    </>
  );
}
