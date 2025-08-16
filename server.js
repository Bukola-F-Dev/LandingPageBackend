import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", 
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 1️⃣ Send message to Me
    await transporter.sendMail({
      from: email,
      to: process.env.GMAIL_USER,
      subject: `Message from ${name}`,
      text: message,
    });

    // 2️⃣ Send Auto-Reply to the Sender
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Thank you for contacting us",
      text: `Hi ${name},\n\nThank you for reaching out! We have received your message and 
      will respond shortly.\n\nBest regards,\nPhone Tech Team`,
    });

    res.json({ success: true, message: "Message sent and auto-reply sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));