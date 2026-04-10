const nodemailer = require("nodemailer");
const NotificationChannel = require("../models/NotificationChannel");

let cachedTransporter = null;
let cachedConfig = null;

async function getTransporter() {
  const doc = await NotificationChannel.findOne();
  if (!doc || !doc.email?.enabled) return null;

  const config = doc.email;
  if (!config.provider || !config.apiKey || !config.from) return null;

  // Check if config changed
  const configKey = `${config.provider}:${config.apiKey}:${config.from}`;
  if (cachedTransporter && cachedConfig === configKey) return cachedTransporter;

  let transportOptions = {};

  // Common SMTP providers
  const provider = (config.provider || "").toLowerCase();
  if (provider === "gmail") {
    transportOptions = { service: "gmail", auth: { user: config.from, pass: config.apiKey } };
  } else if (provider === "sendgrid") {
    transportOptions = { host: "smtp.sendgrid.net", port: 587, auth: { user: "apikey", pass: config.apiKey } };
  } else if (provider === "resend") {
    transportOptions = { host: "smtp.resend.com", port: 587, auth: { user: "resend", pass: config.apiKey } };
  } else if (provider.includes(":")) {
    // Custom format: host:port
    const [host, port] = provider.split(":");
    transportOptions = { host, port: parseInt(port) || 587, auth: { user: config.from, pass: config.apiKey } };
  } else {
    transportOptions = { host: provider, port: 587, auth: { user: config.from, pass: config.apiKey } };
  }

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedConfig = configKey;
  return cachedTransporter;
}

exports.sendEmail = async (to, subject, bodyText) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn("[Email] Not configured, skipping email to", to);
      return false;
    }

    const doc = await NotificationChannel.findOne();
    const from = doc?.email?.from || "noreply@telnet.co.id";

    await transporter.sendMail({
      from,
      to,
      subject,
      text: bodyText,
    });

    return true;
  } catch (err) {
    console.error("[Email] Send error:", err.message);
    return false;
  }
};
