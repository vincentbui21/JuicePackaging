// source/printers/videojet6330.js
const net = require("net");
const fs = require("fs");
const path = require("path");

const CR = "\r";

/** Optional fallback to read a default IP if none is supplied. */
function getPrinterIP() {
  try {
    // keep this tolerant: check both likely locations
    const candidates = [
      path.join(__dirname, "../default-setting.txt"),
      path.join(__dirname, "../source/default-setting.txt"),
      path.join(process.cwd(), "default-setting.txt"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const [k, v] = String(line).split("=");
          if (k && k.trim() === "printer_ip") return String(v || "").trim();
        }
      }
    }
  } catch (err) {
    // non-fatal
    console.warn("getPrinterIP():", err.message);
  }
  return "192.168.1.139"; // safe fallback
}

/** Very tolerant ASCII line sender (keeps legacy behavior). */
function sendLine({ host, port, line, connectTimeoutMs = 6000, lingerMs = 200 }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let rx = "";
    let connected = false;
    const to = setTimeout(() => {
      if (!connected) {
        try { socket.destroy(); } catch {}
        return reject(new Error(`connect timeout to ${host}:${port}`));
      }
      try { socket.end(); } catch {}
      resolve({ rx: rx.trim() });
    }, connectTimeoutMs);

    socket.setEncoding("ascii");
    socket.on("data", d => { rx += d; });
    socket.on("error", e => { clearTimeout(to); reject(e); });
    socket.on("close", () => { clearTimeout(to); resolve({ rx: rx.trim() }); });

    socket.connect(port, host, () => {
      connected = true;
      socket.write(line + CR, "ascii", () => setTimeout(() => socket.end(), lingerMs));
    });
  });
}

/** Small sanitizer for inline field values. */
function safe(s) {
  return String(s ?? "")
    .replace(/[|\r\n]/g, " ")   // don’t break protocol frames
    .trim()
    .slice(0, 64);              // avoid extremely long names
}

/** Split a full name into {firstName,lastName}. Last token → last name. */
function splitName(fullName) {
  const parts = safe(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop();
  const firstName = parts.join(" ");
  return { firstName, lastName };
}

/**
 * Print pouch label via Videojet 6330 using Zipher-compatible frames.
 * Backward compatible args:
 *  - old:  { customer, productionDate }
 *  - new:  { customer?, firstName?, lastName?, productionDate?, expiryDate? }
 *
 * Mapping for new 3-line CIFF:
 *   VarField01 = lastName
 *   VarField02 = firstName
 *   VarField03 = dateStr
 */
async function printPouch({
  host = getPrinterIP(),
  port = 3003,
  job = "Mehustaja",
  customer,
  firstName,
  lastName,
  productionDate,  // kept for backward compatibility
  expiryDate,      // accepted synonym
}) {
  // Resolve names
  let f = safe(firstName);
  let l = safe(lastName);
  if (!f && !l) {
    const n = splitName(customer);
    f = n.firstName;
    l = n.lastName;
  }

  // Resolve date (use whichever is provided by caller)
  const dateStr = safe(expiryDate || productionDate);
  if (!dateStr) throw new Error("printPouch: date is required");

  // 1) Single-frame SLA (preferred)
  const sla = `SLA|${safe(job)}|VarField01=${l}|VarField02=${f}|VarField03=${dateStr}|`;
  const rSLA = await sendLine({ host, port, line: sla });

  if (!rSLA.rx || /ACK/i.test(rSLA.rx)) {
    const rPRN = await sendLine({ host, port, line: "PRN" });
    return {
      ok: true,
      host, port,
      sent: { sla, prn: "PRN" },
      rx: { sla: rSLA.rx, prn: rPRN.rx }
    };
  }

  // 2) Very tolerant multi-step fallback
  const rSLA2 = await sendLine({ host, port, line: `SLA|${safe(job)}` });
  const rV1   = await sendLine({ host, port, line: `VAR|VarField01=${l}` });
  const rV2   = await sendLine({ host, port, line: `VAR|VarField02=${f}` });
  const rV3   = await sendLine({ host, port, line: `VAR|VarField03=${dateStr}` });
  const rPRN2 = await sendLine({ host, port, line: "PRN" });

  return {
    ok: /ACK/i.test([rSLA2.rx, rV1.rx, rV2.rx, rV3.rx, rPRN2.rx].join("")),
    host, port,
    sent: {
      sla: `SLA|${safe(job)}`,
      var1: `VAR|VarField01=${l}`,
      var2: `VAR|VarField02=${f}`,
      var3: `VAR|VarField03=${dateStr}`,
      prn : "PRN"
    },
    rx: { sla: rSLA2.rx, var1: rV1.rx, var2: rV2.rx, var3: rV3.rx, prn: rPRN2.rx },
  };
}

module.exports = { printPouch, sendLine, splitName };
