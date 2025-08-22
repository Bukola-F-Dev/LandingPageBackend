import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import axios from "axios";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

console.log("GMAIL_USER:", process.env.GMAIL_USER);

{/* // ZeroBounce validation
async function validateEmailWithZeroBounce(email) {
  try {
    const apiKey = process.env.ZEROBOUNCE_API_KEY;
    const response = await axios.get(
      `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${email}`
    );
    return response.data;
  } catch (err) {
    return { status: "error" };
  }
}  */}

// recaptcha validation
async function validateCaptcha(token) {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
    );
    return response.data.success;
  } catch (err) {
    return { status: "error" };
  }
}

// Rate limiter
const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
    });
  },
});


app.post("/contact", contactLimiter, async (req, res) => {
  const { name, email, message, captcha } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  //Validate captcha first
  const captchaValid = await validateCaptcha(captcha);
  if (!captchaValid) {
    return res.status(400).json({ success: false, message: "Captcha failed" });
  }

  //Validate email with ZeroBounce
  const validation = await validateEmailWithZeroBounce(email);
  if (
    validation.status !== "valid" ||
    validation.sub_status === "mailbox_not_found" ||
    validation.sub_status === "disposable" ||
    validation.sub_status === "toxic"
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid or non-existent email address",
    });
  }

  try {
    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
    });

    // Message to me
    await transporter.sendMail({
      from: email,
      to: process.env.GMAIL_USER,
      subject: `Message from ${name}`,
      text: message,
    });

    // Auto reply to sender
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Thank you for contacting us",
      text: `Hi ${name},\n\nThanks for reaching out! We'll respond shortly.\n\nBest regards,\nPhone Tech Team`,
    });

    res.json({ success: true, message: "Message sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));