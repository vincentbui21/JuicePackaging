import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Snackbar,
  Paper,
  Container,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import QRScanner from "../components/qrcamscanner";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";
import CustomerInfoCard from "../components/customerinfoshowcard";
import BoxInfoCard from "../components/boxinfocard";
import SmsConfirmDialog from "../components/SmsConfirmDialog";

// Small chip showing each scanned box id
function BoxChip({ index, id }) {
  return (
    <Chip
      label={`Box ${index}: ${id}`}
      sx={{ maxWidth: "100%", textOverflow: "ellipsis" }}
    />
  );
}

const InitialOrderInfo = {
  name: "",
  created_at: "",
  weight_kg: "",
  boxes_count: "",
  city: "",
  order_id: "",
  customer_id: "",
  status: "",
};

// ── helpers to avoid false “mark as done” prompts ─────────────────────────────
function normalizeStatus(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Returns true if an order can proceed to box loading.
 * Accepts many variants to avoid false negatives:
 *  - "processing complete", "processed", "complete", "completed"
 *  - "ready for pallet", "ready for pickup", "ready", "done"
 * Also accepts boolean-ish flags if your API exposes them:
 *  - info.is_done / info.done / info.completed / info.isCompleted
 */
function isOrderReadyForLoading(info) {
  const s = normalizeStatus(info?.status);
  const allowed =
    s === "processing complete" ||
    s === "processed" ||
    s === "complete" ||
    s === "completed" ||
    s === "ready for pallet" ||
    s === "ready for pickup" ||
    s === "ready" ||
    s === "done";

  const flag =
    info?.is_done === true ||
    info?.is_done === 1 ||
    info?.done === true ||
    info?.done === 1 ||
    info?.completed === true ||
    info?.completed === 1 ||
    info?.isCompleted === true;

  return allowed || flag;
}

async function fetchOrderDone(api, orderId) {
  try {
    const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}/status`);
    if (data?.ok) return data.done === true;
  } catch (_) {}
  return null; // unknown
}


export default function BoxToPalletLoadingPage() {
  const [scanResult, setScanResult] = useState(null);

  // Basic order summary (locked by first scanned box)
  const [orderInfo, setOrderInfo] = useState(InitialOrderInfo);

  // Container targets
  const [palletId, setPalletId] = useState(null); // normal flow
  const [shelfId, setShelfId] = useState(null); // Kuopio flow

  // Canonical list of boxes that belong to this order (from backend)
  const [fetchedBoxList, setFetchedBoxList] = useState([]); // [{ box_id }, ...]
  // Boxes scanned in this session (strings like "BOX_<uuid>[_n]")
  const [scannedBoxes, setScannedBoxes] = useState([]);

  const [snackbarMsg, setSnackbarMsg] = useState("");

  // “Order not done” dialog
  const [notDoneOpen, setNotDoneOpen] = useState(false);

  // SMS confirm (Kuopio only)
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Derived flags / helpers
  const isKuopio = useMemo(
    () => (orderInfo?.city || "").toString().trim().toLowerCase() === "kuopio",
    [orderInfo?.city]
  );

  // Normalize inputs like "BOX 123..." → "BOX_<uuid>[_n]"
  const normalizeBoxCode = (raw) => {
    const s = String(raw || "").trim();
    const m = s.match(/([0-9a-fA-F-]{36})(?:_(\d+))?/);
    if (m) return `BOX_${m[1]}${m[2] ? `_${m[2]}` : ""}`;
    if (/^BOX[\s:\-_]/i.test(s)) {
      const t = s.replace(/^BOX[\s:\-_]*/i, "BOX_");
      return t.replace(/^BOX__/, "BOX_");
    }
    return s.startsWith("BOX_") ? s : s;
  };

  const extractOrderId = (boxId) => {
    const m = String(boxId).match(/BOX_([0-9a-fA-F-]{36})(?:_\d+)?/);
    return m ? m[1] : null;
  };

  const extractSuffix = (boxId) => {
    const m = String(boxId).match(/BOX_[0-9a-fA-F-]{36}_(\d+)/);
    return m ? m[1] : null;
  };

  // baseOf("BOX_<uuid>_2") → "BOX_<uuid>"
  const baseOf = (id) => {
    const m = String(id).match(/^(BOX_[0-9a-fA-F-]{36})/i);
    return m ? m[1] : id;
  };
  const belongsToFetchedOrder = (boxId) =>
    fetchedBoxList.some((b) => baseOf(b.box_id) === baseOf(boxId));

  // Quick reset
  const resetAll = () => {
    setScannedBoxes([]);
    setShelfId(null);
    setPalletId(null);
    setOrderInfo(InitialOrderInfo);
    setFetchedBoxList([]);
  };

  // ──────────────────────────────────────────────────────────────
  // Handle every scanned QR
  useEffect(() => {
    if (!scanResult) return;

    const raw = String(scanResult).trim();
    const upper = raw.toUpperCase();
    const uuidMatch = raw.match(/[0-9a-fA-F-]{36}/);
    const uuid = uuidMatch ? uuidMatch[0] : null;

    // SHELF: used only in Kuopio direct flow
    if (/^SHELF[\s_:\-]/i.test(raw) || upper.startsWith("SHELF")) {
      const id = uuid || raw.replace(/^SHELF[\s_:\-]*/i, "").trim();
      if (id) {
        setShelfId(id);
        setSnackbarMsg("Shelf scanned.");
        return;
      }
    }

    // PALLET: used in normal flow
    if (/^PALLET[\s_:\-]/i.test(raw) || upper.startsWith("PALLET")) {
      const id = uuid || raw.replace(/^PALLET[\s_:\-]*/i, "").trim();
      if (id) {
        setPalletId(id);
        setSnackbarMsg("Pallet scanned.");
        return;
      }
    }
    // Support legacy “bare UUID” as pallet if none selected yet
    if (!palletId && uuid && !/[0-9a-fA-F-]{36}_\d+/.test(raw)) {
      setPalletId(uuid);
      setSnackbarMsg("Pallet scanned.");
      return;
    }

    // BOX: "BOX_xxx", "...<uuid>_n", etc.
    if (
      /^BOX[\s_:\-]/i.test(raw) ||
      upper.startsWith("BOX") ||
      /[0-9a-fA-F-]{36}_\d+/.test(raw) ||
      /_[0-9a-fA-F-]{36}_\d+/.test(raw) ||
      /[0-9a-fA-F-]{36}$/.test(raw)
    ) {
      const normalized = normalizeBoxCode(raw);
      const orderId = extractOrderId(normalized);
      if (!orderId) {
        setSnackbarMsg("Could not read order from box QR.");
        return;
      }

      const processScan = () => {
        // Keep a single order locked for the session
        if (orderInfo.order_id && orderInfo.order_id !== orderId) {
          setSnackbarMsg(
            "This box belongs to a different order. Finish current order first."
          );
          return;
        }

        // If backend sent a canonical list, validate membership
        if (fetchedBoxList.length > 0 && !belongsToFetchedOrder(normalized)) {
          setSnackbarMsg("This box does not belong to the current order.");
          return;
        }

        // Prevent scanning the same suffix twice for this order
        const suffix = extractSuffix(normalized);
        if (suffix) {
          const suffixAlready = scannedBoxes.some(
            (b) => extractOrderId(b) === orderId && extractSuffix(b) === suffix
          );
          if (suffixAlready) {
            setSnackbarMsg(`Box #${suffix} for this order is already scanned.`);
            return;
          }
        }

        // Final dedupe by exact id
        if (scannedBoxes.includes(normalized)) {
          setSnackbarMsg("Box already scanned.");
          return;
        }

        setScannedBoxes((prev) => [...prev, normalized]);
        setSnackbarMsg("Box scanned.");
      };

      // First box → fetch order + canonical box list, then accept the scan
      if (!orderInfo.order_id) {
        api
          .get(`/boxes/scan-info/${encodeURIComponent(normalized)}`)
          .then(async (res) => {
            const info = res?.data?.order;
            console.log("scan-info status:", info?.status, info);
            const list = Array.isArray(res?.data?.boxes) ? res.data.boxes : [];
          
            if (!info || !info.order_id) {
              setSnackbarMsg("Order not found for this box.");
              return;
            }
          
            // 1) Decide readiness using scan-info (if present)…
            let ready = isOrderReadyForLoading(info);
          
            // 2) …otherwise ask the backend for status and use that.
            if (!ready) {
              const serverSaysDone = await fetchOrderDone(api, info.order_id);
              if (serverSaysDone === true) ready = true;
            }
          
            if (!ready) {
              setNotDoneOpen(true);
              resetAll();
              return;
            }
          
            // authoritative expected count (if your server exposes it)
            let expected = Number(info.boxes_count || 0);
            try {
              const expRes = await api.get(
                `/orders/${encodeURIComponent(info.order_id)}/expected-boxes`
              );
              expected = Number(expRes?.data?.expected ?? expected);
            } catch {
              /* ignore; use info.boxes_count */
            }
          
            setOrderInfo({
              name: info.name || "",
              created_at: info.created_at || "",
              weight_kg: info.weight_kg || "",
              boxes_count: expected,
              city: info.city || "",
              order_id: info.order_id,
              customer_id: info.customer_id,
              status: info.status || "", // may still be ""
            });
            setFetchedBoxList(list);
          
            // process the current scan after state has been set
            setTimeout(processScan, 0);
          })
          .catch((e) => {
            console.error(e);
            setSnackbarMsg("Failed to fetch order info for this box.");
          });
      } else {
        processScan();
      }

      return;
    }

    setSnackbarMsg("Unrecognized QR");
  }, [scanResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────
  // Submit enablement:
  // We only require: an order, at least ONE scanned box, and
  //   Kuopio → a shelf
  //   others → a pallet
  const canSubmit = useMemo(() => {
    if (!orderInfo.order_id) return false;
    if (scannedBoxes.length < 1) return false;
    return isKuopio ? Boolean(shelfId) : Boolean(palletId);
  }, [orderInfo.order_id, scannedBoxes.length, isKuopio, shelfId, palletId]);

  // Normal (non-Kuopio) submit
  const submitToPallet = async () => {
    await api.post(`/pallets/${palletId}/load-boxes`, { boxes: scannedBoxes });
    resetAll();
    setSnackbarMsg("Submitted successfully.");
  };

  // Kuopio submit + optional SMS (controlled by confirm dialog)
  const submitKuopio = async (sendNow) => {
    // ✅ Send the decision in the BODY; backend reads `sendSms`
    await api.post(`/shelves/load-boxes`, {
      shelfId,
      boxes: scannedBoxes,
      sendSms: !!sendNow,
    });

    // ✅ No extra /orders/:orderId/sms-status call here (server updates counters)
    resetAll();
    setSnackbarMsg(sendNow ? "Submitted; SMS queued." : "Submitted without SMS.");
  };

  const handleSubmit = async () => {
    try {
      if (isKuopio) {
        // Ask before sending SMS
        setConfirmOpen(true);
      } else {
        await submitToPallet();
      }
    } catch (err) {
      console.error(err);
      setSnackbarMsg("Submit failed. See console for details.");
    }
  };

  const handleCancel = () => resetAll();

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
          }}
        >
          <Typography
            variant="h4"
            sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}
          >
            {isKuopio ? "Box → Shelf Handling (Kuopio)" : "Box → Pallet Handling"}
          </Typography>

          <Stack spacing={3} alignItems="center">
            {/* One scanner – the effect decides what was scanned */}
            <QRScanner onResult={setScanResult} />

            {/* Order/customer summary (from the first box) */}
            <CustomerInfoCard customerInfo={orderInfo} countLabel="Box Count" />

            {/* Pallet/Shelf + progress */}
            {(palletId || shelfId || orderInfo.order_id) && (
              <BoxInfoCard
                palletId={isKuopio ? null : palletId}
                orderId={orderInfo.order_id}
                customerName={orderInfo.name}
                city={orderInfo.city}
                expected={expectedCount}
                scanned={scannedCount}
              />
            )}

            {/* Show Shelf explicitly for Kuopio */}
            {isKuopio && shelfId && (
              <Typography variant="body2" color="text.secondary">
                Shelf: <strong>{shelfId}</strong>
              </Typography>
            )}

            {(orderInfo.order_id || expectedCount > 0) && (
              <Typography variant="body2" color="text.secondary">
                Scanned <strong>{scannedCount}</strong> of{" "}
                <strong>{expectedCount || 0}</strong> boxes&nbsp;·&nbsp;
                {Math.max((expectedCount || 0) - scannedCount, 0)} to go
              </Typography>
            )}

            {/* Scanned box chips */}
            <Stack spacing={1} alignItems="stretch" width="100%">
              {scannedBoxes.map((id, idx) => (
                <BoxChip key={id} index={idx + 1} id={id} />
              ))}
            </Stack>

            {/* Actions */}
            <Stack spacing={2} direction="row">
              {scannedBoxes.length > 0 && (
                <Button color="error" variant="contained" onClick={handleCancel}>
                  Cancel
                </Button>
              )}

              {/* Show the button as soon as we have at least one box; enable only when canSubmit */}
              {scannedBoxes.length > 0 && (
                <Button
                  color="success"
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  sx={{
                    backgroundColor: "#d6d0b1",
                    color: "black",
                    "&:hover": { backgroundColor: "#c5bfa3" },
                  }}
                >
                  Submit
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Container>

      {/* Kuopio SMS confirm */}
      <SmsConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onChoice={async (sendNow) => {
          setConfirmOpen(false);
          try {
            await submitKuopio(sendNow);
          } catch (e) {
            console.error(e);
            setSnackbarMsg("Submit failed. See console for details.");
          }
        }}
        title="Send SMS to customer now?"
        message={`Order: ${orderInfo.name || "—"} · City: ${orderInfo.city || "—"}`}
      />

      {/* Not-done dialog */}
      <Dialog
        open={notDoneOpen}
        onClose={() => setNotDoneOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Order not marked as done</DialogTitle>
        <DialogContent>
          Please mark this order as <strong>Processing complete</strong> before
          loading boxes to a pallet or shelf.
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNotDoneOpen(false)}>
            OK
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
