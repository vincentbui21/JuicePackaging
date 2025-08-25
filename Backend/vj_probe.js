// vj_probe.js
const net = require("net");
const host = "192.168.1.149";
const port = 3003;

function session(cmds, label) {
  return new Promise((resolve) => {
    const s = net.createConnection(port, host, async () => {
      console.log("\n=== " + label + " ===");
      for (const cmd of cmds) {
        await new Promise((res) => {
          const to = setTimeout(res, 800); // fallback if silent
          s.once("data", (buf) => {
            clearTimeout(to);
            console.log("RX:", JSON.stringify(buf.toString()));
            res();
          });
          console.log("TX:", JSON.stringify(cmd));
          s.write(cmd);
        });
      }
      s.end();
      resolve();
    });
    s.on("error", (e) => {
      console.log("Socket error:", e.message);
      resolve();
    });
  });
}

function CR(s) { return s + "\r"; } // append <CR> exactly once

(async () => {
  const job = "Mehustaja";
  const customer = "Acme Juices";
  const productionDate = "19/08/2025";

  // 0) Read back what the printer thinks
  await session([CR("VER")], "VER");
  await session([CR("GJN")], "GJN (current job name)");
  await session([CR("GJF")], "GJF (field names for current job, if supported)");
  await session([CR("GJD")], "GJD (field values for current job, if supported)");

  // A) VAR path (tech’s “VAR command name” wording)
  await session([
    CR(`SLA|${job}`),                            // select job only
    CR(`VAR|VarField01=${customer}`),            // set named vars
    CR(`VAR|VarField02=${productionDate}`),
    CR("PRN"),
  ], "A) SLA (select) + VAR (named) + PRN");

  // B) SLA with named fields in one line (what we already tried)
  await session([
    CR(`SLA|${job}|VarField01=${customer}|VarField02=${productionDate}`),
    CR("PRN"),
  ], "B) SLA (named inline) + PRN");

  // C) SEL (positional fields)
  await session([
    CR(`SEL|${job}|${customer}|${productionDate}`),
    CR("PRN"),
  ], "C) SEL (positional) + PRN");

  // D) JDA (named on current job) then PRN
  await session([
    CR(`JDA|VarField01=${customer}|VarField02=${productionDate}`),
    CR("PRN"),
  ], "D) JDA (named update current) + PRN");

  // E) JDU (positional on current job) then PRN
  await session([
    CR(`JDU|${customer}|${productionDate}`),
    CR("PRN"),
  ], "E) JDU (positional update current) + PRN");

  console.log("\nDone. Watch which step actually changes the display/print.");
})();
