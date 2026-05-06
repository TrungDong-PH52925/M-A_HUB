
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store for OTPs (In production, use Redis or a DB)
  const otpStore = new Map<string, { code: string; expires: number }>();

  // Nodemailer config setup
  let transporter: nodemailer.Transporter | null = null;
  try {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log("Ethereal test email account created.");
  } catch (err) {
    console.error("Failed to create Ethereal account:", err);
  }

  // API Routes
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });

    let testUrl = null;

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: '"M&A Platform Auth" <no-reply@ethereal.email>',
          to: email, // this will be caught by ethereal
          subject: "Your 2FA Login Code",
          text: `Your M&A Platform authentication code is: ${otp}\n\nThis code will expire in 5 minutes.`,
          html: `<b>Your M&A Platform authentication code is: <span style="font-size:24px;">${otp}</span></b><br/><br/>This code will expire in 5 minutes.`,
        });
        testUrl = nodemailer.getTestMessageUrl(info);
        console.log("OTP Email sent. Preview URL: %s", testUrl);
      } catch (err) {
        console.error("Error sending email:", err);
      }
    } else {
      console.log(`[AUTH-FALLBACK] OTP for ${email}: ${otp}`);
    }

    res.json({ success: true, message: "OTP sent successfully", testUrl });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record) return res.status(400).json({ error: "No OTP found for this email" });
    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP expired" });
    }
    if (record.code !== otp) return res.status(400).json({ error: "Invalid OTP" });

    otpStore.delete(email);
    res.json({ success: true, message: "OTP verified" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
