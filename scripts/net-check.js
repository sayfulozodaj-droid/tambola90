// Санҷиши пайвасти шабака ба PostgreSQL (Neon): TCP + TLS
// Иҷро: node scripts/net-check.js <host>
const net = require("net");
const tls = require("tls");

const host = process.argv[2];
if (!host) {
  console.error("Истифода: node scripts/net-check.js <host>");
  process.exit(1);
}

const started = Date.now();

const socket = net.connect({ host, port: 5432, timeout: 20000 }, () => {
  console.log(`TCP OK   ${host} (${Date.now() - started} ms)`);
  socket.destroy();

  // Боз як бор — ин дафъа бо TLS (Neon бе SSL кор намекунад)
  const t0 = Date.now();
  const t = tls.connect(
    { host, port: 5432, servername: host, timeout: 20000, rejectUnauthorized: false },
    () => {
      console.log(`TLS OK   ${host} (${Date.now() - t0} ms, protocol=${t.getProtocol()})`);
      t.destroy();
      process.exit(0);
    }
  );
  t.on("error", (e) => {
    console.log(`TLS ERR  ${host} ${e.code || ""} ${e.message}`);
    process.exit(2);
  });
  t.on("timeout", () => {
    console.log(`TLS TIMEOUT ${host}`);
    process.exit(3);
  });
});

socket.on("error", (e) => {
  console.log(`TCP ERR  ${host} ${e.code || ""} ${e.message}`);
  process.exit(4);
});

socket.on("timeout", () => {
  console.log(`TCP TIMEOUT ${host}`);
  process.exit(5);
});
