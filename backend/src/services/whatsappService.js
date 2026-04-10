const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const path = require("path");
const pino = require("pino");
const fs = require("fs");
const { Boom } = require("@hapi/boom");

const SESSION_DIR = path.join(__dirname, "../../wa-session");

// Known working WA web versions as fallback
const FALLBACK_WA_VERSION = [2, 3000, 1023223821];

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qr = null;
    this.status = "disconnected"; // disconnected | connecting | waiting_qr | connected
    this.connectedPhone = null;
    this.reconnecting = false;
    this.lastInitAt = 0;
    this.failCount = 0; // track consecutive connection failures
  }

  clearSessionFiles() {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
  }

  resetSocket() {
    try {
      if (this.sock?.ev?.removeAllListeners) {
        this.sock.ev.removeAllListeners();
      }
      if (this.sock?.ws) {
        this.sock.ws.close();
      }
    } catch (_) {}
    this.sock = null;
  }

  async initialize(force = false) {
    if (!force && this.sock && this.status === "connected") return;
    if (!force && this.reconnecting) return;

    const now = Date.now();
    if (!force && this.sock && this.status !== "connected" && now - this.lastInitAt < 15000) {
      return;
    }

    try {
      this.lastInitAt = now;

      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }

      if (this.sock) {
        this.resetSocket();
      }

      this.status = "connecting";
      this.qr = null;

      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      // Fetch the latest WA version dynamically; fallback if fetch fails
      let version = FALLBACK_WA_VERSION;
      try {
        const { version: fetchedVersion, isLatest } = await fetchLatestBaileysVersion();
        version = fetchedVersion;
        console.log(`[WhatsApp] Using WA version: ${version.join(".")} (isLatest=${isLatest})`);
      } catch (err) {
        console.warn("[WhatsApp] Could not fetch latest WA version, using fallback:", FALLBACK_WA_VERSION.join("."));
      }

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false,
        logger: pino({ level: "silent" }),
        browser: ["Karyawan HR", "Chrome", "124.0.0"],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        connectTimeoutMs: 30000,
        keepAliveIntervalMs: 10000,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qr = qr;
          this.status = "waiting_qr";
          this.failCount = 0;
          console.log("[WhatsApp] QR code ready");
        }

        if (connection === "close") {
          const boomError = new Boom(lastDisconnect?.error);
          const statusCode = boomError?.output?.statusCode;
          const wasLoggedOut = statusCode === DisconnectReason.loggedOut;
          const isConnectionFailure = statusCode === 500 || statusCode === 503 || statusCode === 408;

          console.warn(`[WhatsApp] Connection closed. Code: ${statusCode}, loggedOut: ${wasLoggedOut}`);

          this.status = "disconnected";
          this.qr = null;
          this.connectedPhone = null;
          this.resetSocket();

          if (wasLoggedOut) {
            this.clearSessionFiles();
            this.failCount = 0;
            console.warn("[WhatsApp] Logged out – session cleared");
            return; // Don't reconnect if explicitly logged out
          }

          this.failCount++;

          if (isConnectionFailure && this.failCount > 3) {
            // Persistent connection failure (likely WA server issue or network) – stop trying
            console.error("[WhatsApp] Repeated connection failures. Stopping auto-reconnect. Please try again manually.");
            this.failCount = 0;
            this.reconnecting = false;
            return;
          }

          if (!this.reconnecting) {
            const delay = Math.min(3000 * this.failCount, 15000); // backoff 3s, 6s, 9s... max 15s
            this.reconnecting = true;
            console.log(`[WhatsApp] Reconnecting in ${delay}ms (attempt ${this.failCount})...`);
            setTimeout(() => {
              this.reconnecting = false;
              this.initialize(true);
            }, delay);
          }
        }

        if (connection === "open") {
          this.status = "connected";
          this.qr = null;
          this.failCount = 0;
          this.connectedPhone = this.sock?.user?.id?.split(":")[0] || null;
          console.log("[WhatsApp] Connected:", this.connectedPhone);
        }
      });
    } catch (err) {
      console.error("[WhatsApp] Init error:", err.message);
      this.status = "disconnected";
    }
  }

  getStatus() {
    return {
      status: this.status,
      phone: this.connectedPhone,
    };
  }

  getQR() {
    return this.qr;
  }

  async logout() {
    clearTimeout(this._reconnectTimer);
    this.reconnecting = false;
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (err) {
      console.error("[WhatsApp] Logout error:", err.message);
    }

    this.resetSocket();
    this.clearSessionFiles();

    this.status = "disconnected";
    this.qr = null;
    this.connectedPhone = null;
    this.failCount = 0;
  }

  async sendMessage(phone, text) {
    if (this.status !== "connected" || !this.sock) {
      console.warn("[WhatsApp] Not connected, skipping message to", phone);
      return false;
    }

    try {
      let jid = phone.replace(/[^0-9]/g, "");
      if (jid.startsWith("0")) jid = "62" + jid.slice(1);
      jid = jid + "@s.whatsapp.net";

      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (err) {
      console.error("[WhatsApp] Send error:", err.message);
      return false;
    }
  }
}

// Singleton
const whatsappService = new WhatsAppService();
module.exports = whatsappService;
