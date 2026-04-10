const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode");
const fs = require("fs");

async function testWA() {
  // Clean up previous test session
  if (fs.existsSync("wa-test")) {
    fs.rmSync("wa-test", { recursive: true, force: true });
  }

  console.log("Fetching latest WA version...");
  let version = [2, 3000, 1023223821];
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
    console.log("WA Version:", version.join("."), "| isLatest:", result.isLatest);
  } catch (e) {
    console.warn("Failed to fetch version, using fallback:", version.join("."));
  }

  const { state, saveCreds } = await useMultiFileAuthState("wa-test");

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["Karyawan HR", "Chrome", "124.0.0"],
    markOnlineOnConnect: false,
    connectTimeoutMs: 30000,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    console.log("Status:", connection || "(pending)");

    if (qr) {
      console.log("\n=== QR BERHASIL DITERIMA! ===");
      // Print small ASCII QR to terminal
      const qrTerminal = await qrcode.toString(qr, { type: "terminal", small: true });
      console.log(qrTerminal);
      console.log("Scan QR di atas dengan aplikasi WhatsApp Anda.");
      // Don't exit - wait for connection
    }

    if (connection === "open") {
      console.log("CONNECTED! Phone:", sock.user?.id?.split(":")[0]);
      process.exit(0);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.error("Connection closed. Code:", code);
      process.exit(1);
    }
  });
}

testWA().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
