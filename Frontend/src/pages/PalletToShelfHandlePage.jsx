import { useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        api.get(`/pallets/${enc}/order-context`),
        api.get(`/pallets/${enc}/orders`),
      ]);

      const boxes = Array.isArray(ctx?.boxes) ? ctx.boxes : [];
      const orderList = Array.isArray(orders) ? orders : [];

      setFetchedBoxList(boxes);
      setOrdersOnPallet(orderList);

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
      setSnackbarMsg(t('pallet_to_shelf.failed_fetch_context'));
    }
  }

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

    if (upper.startsWith("PALLET") || (!!uuid && !raw.includes("_"))) {
      const id = upper.startsWith("PALLET")
        ? raw.replace(/^PALLET[\s_:\-]*/i, "").trim()
        : uuid;

      if (id) {
        setPalletId(id);
        setSnackbarMsg(t('pallet_to_shelf.pallet_linked'));
        setFetchedBoxList([]);
        setOrdersOnPallet([]);
        setOrderInfo((prev) => ({ ...prev, order_id: "" }));
      }
      return;
    }

    if (upper.startsWith("SHELF")) {
      const id = raw.replace(/^SHELF[\s_:\-]*/i, "").trim();
      if (id) {
        setShelfId(id);
        setSnackbarMsg(t('pallet_to_shelf.shelf_linked'));
      }
      return;
    }

    if (upper.startsWith("BOX")) {
      const normalized = raw.replace(/\s+/g, "_");
      const parts = normalized.split("_");
      if (parts.length >= 3) {
        const order_id = parts[1];
        setOrdersOnPallet((prev) => {
          if (prev.some((o) => o.order_id === order_id)) return prev;
          return [...prev, { order_id }];
        });

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
            .catch(() => setSnackbarMsg(t('pallet_to_shelf.failed_fetch_order')));
        }
      }

      setScannedBoxes((prev) => (prev.includes(raw) ? prev : [...prev, raw]));
      return;
    }

    setSnackbarMsg(t('pallet_to_shelf.unrecognized_qr'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResult]);

  // ---------- Submit flow ----------
  const canSubmit = useMemo(
    () => Boolean(palletId) && Boolean(shelfId),
    [palletId, shelfId]
  );

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

      // Assign pallet -> shelf on the server
      await api.post("/pallets/assign-shelf", {
        palletId,
        shelfId,
        sendSms,
      });

      // Reset UI
      setPalletId("");
      setShelfId("");
      setOrderInfo(InitialOrderInfo);
      setFetchedBoxList([]);
      setOrdersOnPallet([]);
      setScannedBoxes([]);
      setSnackbarMsg(
        sendSms
          ? t('pallet_to_shelf.assigned_sms')
          : t('pallet_to_shelf.assigned_no_sms')
      );
    } catch (err) {
      console.error("Assign to shelf failed:", err);
      setSnackbarMsg(t('pallet_to_shelf.submit_failed'));
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

          <Typography
            variant="h4"
            sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}
          >
            {t('pallet_to_shelf.title')}
          </Typography>

          <Stack spacing={3} alignItems="center">
            <QRScanner onResult={setScanResult} />

            <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                useFlexGap
                flexWrap="wrap"
              >
                <Chip
                  label={`${t('pallet_to_shelf.pallet')}: ${palletId ? short(palletId) : "—"}`}
                  color={palletId ? "success" : "default"}
                />
                <Chip
                  label={`${t('pallet_to_shelf.shelf')}: ${shelfId ? shelfId : "—"}`}
                  color={shelfId ? "success" : "default"}
                />
                <Chip
                  label={`${t('pallet_to_shelf.orders_on_pallet')}: ${ordersOnPallet.length}`}
                  color={ordersOnPallet.length ? "success" : "default"}
                />
                <Chip
                  label={`${t('pallet_to_shelf.boxes_fetched')}: ${fetchedBoxList.length}`}
                  color={fetchedBoxList.length ? "success" : "default"}
                />
                <Chip label={`${t('pallet_to_shelf.scanned_boxes')}: ${scannedCount}`} />
              </Stack>

              {!!ordersOnPallet.length && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    {t('pallet_to_shelf.orders_on_this_pallet')}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {ordersOnPallet.map((o, i) => (
                      <Chip
                        key={i}
                        variant="outlined"
                        label={
                          o.name
                            ? `${o.name} • ${short(o.order_id)}`
                            : short(o.order_id)
                        }
                      />
                    ))}
                  </Stack>
                </>
              )}
            </Paper>

            {!!fetchedBoxList.length && (
              <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('pallet_to_shelf.boxes_on_context', { count: fetchedBoxList.length })}
                </Typography>
                <List dense>
                  {fetchedBoxList.slice(0, 8).map((b, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText
                        primary={String(b.box_id || b.id || b)}
                        secondary={
                          b.order_id ? `${t('pallet_to_shelf.order')}: ${short(b.order_id)}` : undefined
                        }
                      />
                    </ListItem>
                  ))}
                  {fetchedBoxList.length > 8 && (
                    <ListItem disableGutters>
                      <ListItemText
                        primary={t('pallet_to_shelf.and_more', { count: fetchedBoxList.length - 8 })}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={submitting}
              >
                {t('pallet_to_shelf.clear')}
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenConfirm}
                disabled={!canSubmit || submitting}
              >
                {t('pallet_to_shelf.assign_to_shelf')}
              </Button>
            </Stack>

            {!canSubmit && (
              <Typography variant="caption" color="text.secondary">
                {t('pallet_to_shelf.tip')}
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

      <Dialog
        open={confirmOpen}
        onClose={handleConfirmCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('pallet_to_shelf.review_assignment')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>{t('pallet_to_shelf.pallet')}:</strong> {palletId || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>{t('pallet_to_shelf.shelf')}:</strong> {shelfId || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>{t('pallet_to_shelf.orders_on_pallet')}:</strong> {ordersOnPallet.length}
            </Typography>
            <Typography variant="body2">
              <strong>{t('pallet_to_shelf.order_context')}:</strong> {orderInfo.order_id || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>{t('pallet_to_shelf.customer')}:</strong> {orderInfo.name || "—"}{" "}
              {orderInfo.city ? `(${orderInfo.city})` : ""}
            </Typography>
            <Typography variant="body2">
              <strong>{t('pallet_to_shelf.boxes_context')}:</strong> {fetchedBoxList.length}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel}>{t('pallet_to_shelf.back')}</Button>
          <Button variant="contained" onClick={handleConfirmContinue}>
            {t('pallet_to_shelf.continue')}
          </Button>
        </DialogActions>
      </Dialog>

      <SmsConfirmDialog
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        onChoice={handleSmsChoice}
        title={t('pallet_to_shelf.sms_dialog_title')}
        message={t('pallet_to_shelf.sms_dialog_message')}
      />
    </>
  );
}
