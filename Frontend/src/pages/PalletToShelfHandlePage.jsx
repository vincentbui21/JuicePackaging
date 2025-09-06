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
} from "@mui/material";
import DrawerComponent from "../components/drawer";
import QRScanner from "../components/qrcamscanner";
import CustomerInfoCard from "../components/customerinfoshowcard";
import BoxInfoCard from "../components/boxinfocard";
import api from "../services/axios";
import SmsConfirmDialog from "../components/SmsConfirmDialog";

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

  // What we actually need to submit
  const [palletId, setPalletId] = useState("");
  const [shelfId, setShelfId] = useState("");

  // Extra – you can scan boxes here too if you want progress UI,
  // but they are NOT required to submit.
  const [scannedBoxes, setScannedBoxes] = useState([]);

  const [snackbarMsg, setSnackbarMsg] = useState("");

  // SMS confirmation dialog state
  const [smsOpen, setSmsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // function to call after choice

  // Try to enrich page with order context based on PALLET id (optional)
  async function tryFetchOrderContextForPallet(id) {
    // All of this is best-effort; if your backend doesn’t have these
    // endpoints yet, it will silently fail and the page still works.
    const tryEndpoints = [
      `/pallets/${encodeURIComponent(id)}/order-context`,
      `/pallets/${encodeURIComponent(id)}/orders`,
      `/pallets/${encodeURIComponent(id)}/boxes`,
    ];
    for (const url of tryEndpoints) {
      try {
        const res = await api.get(url);
        const d = res?.data || {};
        // normalize a few common shapes
        const boxes =
          Array.isArray(d.boxes)
            ? d.boxes
            : Array.isArray(d.items)
            ? d.items
            : [];
        const boxes_count =
          typeof d.boxes_count === "number"
            ? d.boxes_count
            : boxes.length || 0;

        const name = d.name || d.customer_name || "";
        const city = d.city || d.location || "";
        const order_id = d.order_id || d.orderId || "";

        setOrderInfo({ order_id, name, city, boxes_count });
        setFetchedBoxList(boxes);
        return; // success – stop trying further endpoints
      } catch {
        // ignore and try next
      }
    }
  }

  // Handle scanner results
  useEffect(() => {
    if (!scanResult) return;

    const raw = String(scanResult).trim();
    const upper = raw.toUpperCase();
    const uuidMatch = raw.match(/[0-9a-fA-F-]{36}/);
    const uuid = uuidMatch ? uuidMatch[0] : null;

    // PALLET (supports "PALLET_xxx" or a bare UUID)
    if (upper.startsWith("PALLET") || (!!uuid && !raw.includes("_"))) {
      const id = upper.startsWith("PALLET")
        ? raw.replace(/^PALLET[\s_:\-]*/i, "").trim()
        : uuid;

      if (id) {
        setPalletId(id);
        setSnackbarMsg("Pallet linked");
        // Best-effort fetch of context (optional)
        if (!orderInfo.order_id) {
          tryFetchOrderContextForPallet(id);
        }
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

    // BOX – optional here, but if scanned we’ll show order summary/progress
    if (upper.startsWith("BOX")) {
      const parts = raw.split("_");
      // Accept formats like "BOX_<orderId>_<n>" or "BOX <orderId> <n>"
      const normalizedParts = parts.length >= 3 ? parts : raw.replace(/\s+/g, "_").split("_");
      if (normalizedParts.length >= 3) {
        const order_id = normalizedParts[1];
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
  }, [scanResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Enable submit as soon as we have pallet + shelf (no box scan required)
  const canSubmit = useMemo(() => {
    return Boolean(palletId) && Boolean(shelfId);
  }, [palletId, shelfId]);

  const handleOpenConfirm = () => {
    setPendingAction(() => submitWithFlag);
    setSmsOpen(true);
  };

  const handleSmsChoice = async (sendNow) => {
    setSmsOpen(false);
    if (pendingAction) {
      await pendingAction(sendNow);
    }
  };

  const submitWithFlag = async (sendSms) => {
    try {
      await api.post("/pallets/assign-shelf", {
        palletId,
        shelfId,
        sendSms, // backend will respect or ignore depending on your implementation
      });

      // Reset UI
      setPalletId("");
      setShelfId("");
      setOrderInfo(InitialOrderInfo);
      setFetchedBoxList([]);
      setScannedBoxes([]);
      setSnackbarMsg(
        sendSms ? "Assigned & SMS sent (if available)" : "Assigned (SMS skipped)"
      );
    } catch (err) {
      console.error(err);
      setSnackbarMsg("Submit failed. See console for details.");
    }
  };

  const handleCancel = () => {
    setOrderInfo(InitialOrderInfo);
    setFetchedBoxList([]);
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
          }}
        >
          <Typography
            variant="h4"
            sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}
          >
            Pallet → Shelf Handling
          </Typography>

          <Stack spacing={3} alignItems="center">
            <QRScanner onResult={setScanResult} />

            {/* Order summary – shown when we have it (from box scan or optional pallet summary) */}
            {/* <CustomerInfoCard customerInfo={orderInfo} countLabel="Box Count" /> */}

            {/* Progress card (needs pallet id to display the frame; order fields fill if available) */}
            {(palletId || orderInfo.order_id) && (
              <BoxInfoCard
                palletId={palletId}
                orderId={orderInfo.order_id}
                customerName={orderInfo.name}
                city={orderInfo.city}
                expected={expectedCount}
                scanned={scannedCount}
              />
            )}

            {/* Show chosen shelf */}
            {shelfId && (
              <Typography variant="body2" color="text.secondary">
                Shelf: <strong>{shelfId}</strong>
              </Typography>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={handleCancel}>
                Clear
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenConfirm}
                disabled={!canSubmit}
              >
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
