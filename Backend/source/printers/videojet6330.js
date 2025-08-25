// source/printers/videojet6330.js (CommonJS)
const net = require("net");
const CR = "\r";

function sendAndWait(socket, cmd, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let done = false;

    const finish = (err, val) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.off("data", onData);
      if (err) reject(err);
      else resolve(val);
    };

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      // Protocol replies are CR-terminated
      if (buffer.includes("\r")) {
        finish(null, buffer);
      }
    };

    const timer = setTimeout(() => {
      finish(new Error(`Timeout waiting for response to "${cmd}"`));
    }, timeoutMs);

    socket.on("data", onData);
    socket.write(cmd + CR);
  });
}

async function printPouch({ host, port = 3003, job = "Mehustaja", customer, productionDate }) {
  const socket = new net.Socket();
  socket.setTimeout(8000);

  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("Printer connection timed out")));
    socket.connect(port, host, resolve);
  });

  try {
    // Reset parser
    socket.write(CR);

    // Optional: version — don’t block if silent
    try {
      const ver = await sendAndWait(socket, "VER", { timeoutMs: 1500 });
      if (!/VER\|/.test(ver)) {
        // continue; some firmwares respond differently
      }
    } catch (_) { /* ignore version timeout */ }

    // Update current job fields (JDU). If you prefer SLA, swap back.
    const jdu = ["JDU", `VarField01=${customer ?? ""}`, `VarField02=${productionDate ?? ""}`].join("|");
    const jduResp = await sendAndWait(socket, jdu, { timeoutMs: 3000 }).catch(() => "ACK"); // treat silence as OK
    if (!/^ACK/.test(jduResp)) {
      throw new Error(`JDU not acknowledged: ${String(jduResp).trim()}`);
    }

    // Print
    const prnResp = await sendAndWait(socket, "PRN", { timeoutMs: 3000 }).catch(() => "ACK");
    if (!/^ACK/.test(prnResp)) {
      throw new Error(`PRN not acknowledged: ${String(prnResp).trim()}`);
    }

    socket.end();
    return { ok: true };
  } catch (e) {
    socket.end();
    throw e;
  }
}

module.exports = { printPouch };
