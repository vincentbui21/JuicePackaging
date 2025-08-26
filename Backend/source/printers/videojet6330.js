// source/printers/videojet6330.js
const net = require("net");
const CR = "\r";

const fs = require("fs");
const path = require("path");

function getPrinterIP() {
  try {
    const content = fs.readFileSync(path.join(__dirname, "../source/default-setting.txt"), "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const [key, value] = line.split("=");
      if (key.trim() === "printer_ip") return value.trim();
    }
  } catch (err) {
    console.error("Failed to read printer IP:", err);
  }
  return "192.168.1.139"; // fallback default
}


function sendLine({ host, port, line, connectTimeoutMs = 6000, lingerMs = 200 }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let rx = "";
    let connected = false;

    const to = setTimeout(() => {
      if (!connected) {
        socket.destroy();
        return reject(new Error(`connect timeout to ${host}:${port}`));
      }
      try { socket.destroy(); } catch(_) {}
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

async function printPouch({
  host = getPrinterIP(),
  port = 3003,
  job = "Mehustaja",
  customer,
  productionDate,
}) {
  if (!customer || !productionDate) throw new Error("customer & productionDate required");

  // 1) Hercules-exact form (note the trailing pipe before CR)
  const slaOneLine = `SLA|${job}|VarField01=${customer}|VarField02=${productionDate}|`;
  const rSLA = await sendLine({ host, port, line: slaOneLine });

  // If the printer ACKs, go straight to PRN.
  if (!rSLA.rx || /ACK/i.test(rSLA.rx)) {
    const rPRN = await sendLine({ host, port, line: "PRN" });
    return { ok: true, host, port, sent: { sla: slaOneLine, prn: "PRN" }, rx: { sla: rSLA.rx, prn: rPRN.rx } };
  }

  // 2) Fallback: split into SLA + VAR + VAR + PRN (very tolerant)
  const rSLA2 = await sendLine({ host, port, line: `SLA|${job}` });
  const rV1   = await sendLine({ host, port, line: `VAR|VarField01=${customer}` });
  const rV2   = await sendLine({ host, port, line: `VAR|VarField02=${productionDate}` });
  const rPRN2 = await sendLine({ host, port, line: "PRN" });

  return {
    ok: /ACK/i.test((rSLA2.rx||"") + (rV1.rx||"") + (rV2.rx||"") + (rPRN2.rx||"")),
    host,
    port,
    sent: { sla: `SLA|${job}`, var1: `VAR|VarField01=${customer}`, var2: `VAR|VarField02=${productionDate}`, prn: "PRN" },
    rx: { sla: rSLA2.rx, var1: rV1.rx, var2: rV2.rx, prn: rPRN2.rx },
  };
}

module.exports = { printPouch };
