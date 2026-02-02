import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Op } from "sequelize";
import { User } from "../models/User.js";
import { auth } from "../middleware/auth.js";
import sendEmail from "../utils/sendEmail.js";



const router = express.Router();

function generateAccessToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function generateRefreshToken(id) {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

// ------------------------------------------
// SIGNUP
// ------------------------------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const exist = await User.findOne({ where: { email } });
    if (exist) {
      return res.status(409).json({
        status: "error",
        message: "User already exists"
      });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed
    });

    // Return success response
    res.status(201).json({
      status: "success",
      message: "Signup successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// ------------------------------------------
// LOGIN
// ------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Send response
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        accessToken,
        refreshToken,
      }
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});




// ------------------------------------------
// GET CURRENT USER
// ------------------------------------------
router.get("/user", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email"] // NEVER send password
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.json({
      status: "success",
      data: { user }
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});


// ------------------------------------------
// FORGOT PASSWORD
// ------------------------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();
console.log("User saved with reset token");
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
 console.log("Reset link:", resetLink);
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    //   }
    // });

    // await transporter.sendMail({
    //   to: user.email,
    //   subject: "Reset your password",
    //   html: `
    //     <p>You requested a password reset</p>
    //     <a href="${resetLink}">Reset Password</a>
    //     <p>This link expires in 15 minutes</p>
    //   `
    // });


    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes</p>
      `
    });

console.log("Email sent successfully");
    res.json({
      status: "success",
      message: "Password reset link sent"
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});


// ------------------------------------------
// RESET PASSWORD
// ------------------------------------------
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired token"
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.refreshToken = null; // force re-login

    await user.save();

    res.json({
      status: "success",
      message: "Password reset successful"
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});


export default router;
