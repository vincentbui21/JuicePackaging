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
} from "@mui/material";
import QRScanner from "../components/qrcamscanner";
import api from "../services/axios";
import DrawerComponent from "../components/drawer";
import CustomerInfoCard from "../components/customerinfoshowcard";
import BoxInfoCard from "../components/boxinfocard";

// Tiny, inline Box chip UI (index + id)
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
};

function BoxToPalletLoadingPage() {
  const [scanResult, setScanResult] = useState(null);

  // order/customer summary (set after first BOX scan)
  const [orderInfo, setOrderInfo] = useState(InitialOrderInfo);

  // the pallet to load onto (single pallet per session)
  const [palletId, setPalletId] = useState(null);

  // full canonical ids "BOX_<orderUUID>[_<n>]" that belong to this order
  const [fetchedBoxList, setFetchedBoxList] = useState([]); // [{box_id}, ...]
  const [scannedBoxes, setScannedBoxes] = useState([]); // ["BOX_<uuid>_<n>", ...]

  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(true);

  // ====== helpers ======
  // Normalize to "BOX_<uuid>" or "BOX_<uuid>_<n>"
  const normalizeBoxCode = (raw) => {
    const s = String(raw || "").trim();
    const m = s.match(/([0-9a-fA-F-]{36})(?:_(\d+))?/);
    if (m) return `BOX_${m[1]}${m[2] ? `_${m[2]}` : ""}`;
    if (/^BOX[\s:\-_]/i.test(s)) {
      const t = s.replace(/^BOX[\s:\-_]*/i, "BOX_");
      return t.replace(/^BOX__/, "BOX_"); // collapse accidental "BOX__"
    }
    return s.startsWith("BOX_") ? s : s;
  };

  // Accept with/without suffix
  const extractOrderId = (boxId) => {
    const m = String(boxId).match(/BOX_([0-9a-fA-F-]{36})(?:_\d+)?/);
    return m ? m[1] : null;
  };

  const extractSuffix = (boxId) => {
    const m = String(boxId).match(/BOX_[0-9a-fA-F-]{36}_(\d+)/);
    return m ? m[1] : null; // may be null for "BOX_<uuid>"
  };

  // Base compare: treat BOX_<uuid> and BOX_<uuid>_2 as the same family
  const baseOf = (id) => {
    const m = String(id).match(/^(BOX_[0-9a-fA-F-]{36})/i);
    return m ? m[1] : id;
  };
  const belongsToFetchedOrder = (boxId) =>
    fetchedBoxList.some((b) => baseOf(b.box_id) === baseOf(boxId));

  // ====== first-class effect: react to each scan like CrateHandling ======
  useEffect(() => {
    if (!scanResult) return;

    const raw = String(scanResult).trim();
    const upper = raw.toUpperCase();
    const uuidMatch = raw.match(/[0-9a-fA-F-]{36}/);
    const uuid = uuidMatch ? uuidMatch[0] : null;

    // ---- Pallet detection (one pallet for the session) ----
    if (/^PALLET[\s_:\-]/i.test(raw) || upper.startsWith("PALLET")) {
      const id = uuid || raw.replace(/^PALLET[\s_:\-]*/i, "").trim();
      if (id) {
        setPalletId(id);
        setSnackbarMsg("Pallet scanned.");
        return;
      }
    }
    // bare UUID (not "<uuid>_<n>") and no pallet yet -> treat as pallet
    if (!palletId && uuid && !/[0-9a-fA-F-]{36}_\d+/.test(raw)) {
      setPalletId(uuid);
      setSnackbarMsg("Pallet scanned.");
      return;
    }

    // ---- Box detection ----
    if (
      /^BOX[\s_:\-]/i.test(raw) ||
      upper.startsWith("BOX") ||
      /[0-9a-fA-F-]{36}_\d+/.test(raw) ||
      /_[0-9a-fA-F-]{36}_\d+/.test(raw) ||
      /[0-9a-fA-F-]{36}$/.test(raw) // allow pure uuid if your camera returns that
    ) {
      const normalized = normalizeBoxCode(raw);
      const orderId = extractOrderId(normalized);
      if (!orderId) {
        setSnackbarMsg("Could not read order from box QR.");
        return;
      }

      const processScan = () => {
        // enforce same order
        if (orderInfo.order_id && orderInfo.order_id !== orderId) {
          setSnackbarMsg("This box belongs to a different order. Finish current order first.");
          return;
        }

        // must be one of the known boxes for this order (prevents cross-order scans)
        // Only enforce if backend returned any rows
        if (fetchedBoxList.length > 0 && !belongsToFetchedOrder(normalized)) {
          setSnackbarMsg("This box does not belong to the current order.");
          return;
        }

        // prevent same suffix twice for this order
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

        // final dedupe by exact id
        if (scannedBoxes.includes(normalized)) {
          setSnackbarMsg("Box already scanned.");
          return;
        }

        setScannedBoxes((prev) => [...prev, normalized]);
        setSnackbarMsg("Box scanned.");
      };

      // If first box for this flow: fetch order & its boxes, then add this scan
      if (!orderInfo.order_id) {
        api
          .get(`/boxes/scan-info/${encodeURIComponent(normalized)}`)
          .then(async (res) => {
            const info = res?.data?.order;
            const list = Array.isArray(res?.data?.boxes) ? res.data.boxes : [];
            if (!info || !info.order_id) {
              setSnackbarMsg("Order not found for this box.");
              return;
            }

            // also fetch authoritative expected to avoid stale zeros
            let expected = Number(info.boxes_count || 0);
            try {
              const expRes = await api.get(
                `/orders/${encodeURIComponent(info.order_id)}/expected-boxes`
              );
              expected = Number(expRes?.data?.expected ?? expected);
            } catch {
              // ignore; we'll use info.boxes_count
            }

            setOrderInfo({
              name: info.name || "",
              created_at: info.created_at || "",
              weight_kg: info.weight_kg || "",
              boxes_count: expected, // keep numeric
              city: info.city || "",
              order_id: info.order_id,
              customer_id: info.customer_id,
            });

            setFetchedBoxList(list); // [{box_id}, ...]
            // after we have the list, process the scanned box
            setTimeout(processScan, 0);
          })
          .catch((e) => {
            console.error(e);
            setSnackbarMsg("Failed to fetch order info for this box.");
          });
      } else {
        // already locked to order -> just process
        processScan();
      }
      return;
    }

    setSnackbarMsg("Unrecognized QR");
  }, [scanResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // enable submit when: have pallet, have order, expected > 0, and scanned == expected
  useEffect(() => {
    const expected = Number(orderInfo.boxes_count || 0);
    const can =
      Boolean(palletId) &&
      Boolean(orderInfo.order_id) &&
      expected > 0 &&
      scannedBoxes.length === expected;
    setSubmitDisabled(!can);
  }, [palletId, orderInfo, scannedBoxes]);

  const handleSubmit = async () => {
    if (submitDisabled) return;
    try {
      // load ONLY the scanned boxes (they’re already canonical IDs)
      const res = await api.post(
        `/pallets/${encodeURIComponent(palletId)}/load-boxes`,
        { boxes: scannedBoxes }
      );
      setSnackbarMsg(
        res?.data?.message || `Loaded ${scannedBoxes.length} boxes onto pallet.`
      );
    } catch (e) {
      console.error(e);
      setSnackbarMsg("Failed to load boxes.");
      return;
    }
    // reset after successful submit
    handleCancel();
  };

  const handleCancel = () => {
    setOrderInfo(InitialOrderInfo);
    setFetchedBoxList([]);
    setScannedBoxes([]);
    setPalletId(null);
    setSubmitDisabled(true);
  };

  const scannedCount = scannedBoxes.length;
  const expectedCount = Number(orderInfo.boxes_count || 0);

  // for display: dedup + order
  const scannedList = useMemo(() => scannedBoxes, [scannedBoxes]);

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
            height: "100%",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="h4"
            sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}
          >
            Box → Pallet Handling
          </Typography>

          <Stack spacing={3} alignItems="center">
            <QRScanner onResult={setScanResult} />

            {/* Order/customer summary (from first box) */}
            <CustomerInfoCard customerInfo={orderInfo} countLabel="Box Count" />

            {/* Pallet + progress -> BoxInfoCard */}
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

            {/* Scanned box chips */}
            <Stack spacing={1} alignItems="stretch" width="100%">
              {scannedList.map((id, idx) => (
                <BoxChip key={id} index={idx + 1} id={id} />
              ))}
            </Stack>

            {/* Actions (like CrateHandling) */}
            <Stack spacing={2} direction="row">
              {scannedBoxes.length > 0 && (
                <Button color="error" variant="contained" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              {!submitDisabled && (
                <Button
                  color="success"
                  variant="contained"
                  onClick={handleSubmit}
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

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </>
  );
}

export default BoxToPalletLoadingPage;
