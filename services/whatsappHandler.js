const path = require("path");
const qrcode = require("qrcode-terminal");
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const Lead = require("../models/models");
const getGeminiResponse = require("../utils/gemini");

const ALERT_NUMBER = "917840820161@s.whatsapp.net";


function detectQuoteIntent(msg) {
  const lower = msg.toLowerCase();
  return (
    lower.includes("quote") ||
    lower.includes("quotation") ||
    lower.includes("₹") ||
    lower.match(/\b\d+\s*(pcs|pic|pieces)\b/) ||
    lower.match(/\b\d+\s*at\s*₹?\d+/)
  );
}

async function startSock() {
  const authFolder = path.join(__dirname, "../auth_info");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: ["Baileys", "Chrome", "4.0"],
    syncFullHistory: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`❌ Connection closed: ${code}`);
      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        startSock();
      } else {
        console.log("👋 Logged out. Please rescan QR.");
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!messages?.length) return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const name = msg.pushName || "Unknown";
    const messageContent =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.documentMessage?.caption ||
      msg.message.buttonsResponseMessage?.selectedButtonId ||
      msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
      "Unsupported message type";

    let lead = await Lead.findOne({ number: sender });
    const isNew = !lead;

    try {
      if (!lead) {
        lead = await Lead.create({
          number: sender,
          name,
          messages: [],
        });
      }

      lead.messages.push({
        text: messageContent,
        timestamp: new Date(),
        direction: "incoming",
      });
      await lead.save();
    } catch (err) {
      console.error("❌ Lead save error:", err.message);
    }

    let reply = isNew
      ? `👋 Welcome to *Scratchnest*! Which service interests you?\n1. Ambitag (Datalogger)\n2. BookMyContainer\n3. HotBox (Testing)`
      : await getGeminiResponse(messageContent);

    try {
      await sock.sendMessage(sender, { text: reply });

      await Lead.findOneAndUpdate(
        { number: sender },
        {
          $push: {
            messages: {
              text: reply,
              timestamp: new Date(),
              direction: "outgoing",
            },
          },
        }
      );

      if (detectQuoteIntent(messageContent)) {
        const alertMsg = `📢 New Lead Request Quote!\n\n👤 Name: ${name}\n📞 Number: ${sender}\n💬 Msg: "${messageContent}"`;
        await sock.sendMessage(ALERT_NUMBER, { text: alertMsg });
        console.log(`🚀 Alert sent to ${ALERT_NUMBER}`);
      }
    } catch (err) {
      console.error("❌ Send failed:", err.message || err);
    }
  });
}

module.exports = startSock;
