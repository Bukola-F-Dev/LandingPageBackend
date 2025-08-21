import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

// Rate limiter
const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 requests per window
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
    });
  },
});

app.post("/contact", contactLimiter, async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
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


// message to me
await transporter.sendMail({
  from: email,
  to: process.env.GMAIL_USER,
  subject: `Message from ${name}`,
  text: message,
});

// Auto reply to the sender
await transporter.sendMail({
  from: process.env.GMAIL_USER,
  to: email,
  subject: "Thank you for contacting us",
  text: `Hi ${name},\n\nThanks for reaching out! 
  We'll respond shortly.\n\nBest regards,\nPhone Tech Team`,
});

    res.json({ success: true, message: "Message sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));