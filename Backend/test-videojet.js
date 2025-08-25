const net = require("net");
const CR = "\r";
function send(host, port, line) {
  return new Promise((resolve, reject) => {
    const s = net.createConnection(port, host, () => s.end(line + CR));
    s.on("error", reject);
    s.on("close", resolve);
  });
}

async function printPouch({ host = "192.168.1.149", port = 3003, customer, productionDate }) {
  await send(host, port, `SLA|Mehustaja|VarField01-1=${customer}|VarField02-1=${productionDate}`);
  await send(host, port, "PRN");
  return { ok: true };
}

module.exports = { printPouch };
