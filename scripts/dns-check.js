// Тафтиши DNS: кадом суроғаҳо бармегарданд ва кадомашон дастрас аст
const dns = require("dns");
const net = require("net");

const hosts = [
  "ep-holy-sun-bd9g3ida-pooler.c-8.us-east-2.aws.neon.tech",
  "ep-holy-sun-bd9g3ida.c-8.us-east-2.aws.neon.tech",
];

const tcp = (host, family) =>
  new Promise((resolve) => {
    const t = Date.now();
    const s = net.connect({ host, port: 5432, family, timeout: 8000 }, () => {
      s.destroy();
      resolve(`OK ${Date.now() - t}ms`);
    });
    s.on("error", (e) => resolve(`ERR ${e.code || e.message}`));
    s.on("timeout", () => {
      s.destroy();
      resolve("TIMEOUT");
    });
  });

(async () => {
  for (const h of hosts) {
    console.log("\n=== " + h);
    const addrs = await new Promise((res) => dns.lookup(h, { all: true }, (e, a) => res(a || [])));
    console.log("DNS:", addrs.map((a) => `${a.address} (v${a.family})`).join(", "));
    for (const a of addrs) {
      console.log(`  v${a.family} ${a.address}: ${await tcp(a.address, a.family)}`);
    }
    console.log("  by hostname (default):", await tcp(h));
    console.log("  by hostname (ipv4):   ", await tcp(h, 4));
    console.log("  by hostname (ipv6):   ", await tcp(h, 6));
  }
})();
