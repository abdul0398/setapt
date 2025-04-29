import express from "express";
import { verify, isAdmin } from "../middlewares/verify.js";
import bcrypt from "bcrypt";
const router = express.Router();
import dotenv from "dotenv";
dotenv.config();

router
  .get("/agents", verify, async (req, res, next) => {
    try {
      const user = req.user;
      let query = "";
      if (user.role === "admin") {
        query =
          "SELECT * FROM users WHERE role = 'agent' ORDER BY created_at DESC";
      } else {
        query =
          "SELECT * FROM users WHERE id = ? AND role = 'agent' ORDER BY created_at DESC";
      }
      const [rows] = await __pool.query(query, [user.id]);
      res.render("agents.ejs", { agents: rows, role: req.user.role });
    } catch (error) {
      console.log(error.message);
      next();
    }
  })
  .post("/api/agent/create", isAdmin, async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const [rows] = await __pool.query(`SELECT * FROM users WHERE email = ?`, [
        email,
      ]);
      if (rows.length > 0) {
        return res
          .status(401)
          .json({ message: "Client with this name already exists" });
      }
      const hashed_password = await bcrypt.hash(password, 10);
      const [row] = await __pool.query(
        `INSERT INTO users (name, email, hashed_password, role) VALUES(?, ?, ?, 'agent')`,
        [name, email, hashed_password]
      );
      res.status(200).json({ id: row.insertId });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/api/agent/fetch/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await __pool.query(
        `SELECT id, name, email FROM users WHERE id = ?`,
        [id]
      );
      const [events] = await __pool.query(
        `SELECT * FROM event WHERE agent_id = ? ORDER BY created_at DESC`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(200).json({ agent: rows[0], events: events });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  })
  .post("/api/agent/update/:id", verify, async (req, res) => {
    const { id } = req.params;
    const { name, password } = req.body;
    try {
      const [rows] = await __pool.query(
        `SELECT name, email FROM users WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Agent not found" });
      }

      if (password && password.length > 8) {
        const hashed_password = await bcrypt.hash(password, 10);
        await __pool.query(
          `UPDATE users SET name = ?, hashed_password = ? WHERE id = ?`,
          [name, hashed_password, id]
        );
      } else {
        await __pool.query(`UPDATE users SET name = ? WHERE id = ?`, [
          name,
          id,
        ]);
      }

      res.status(200).json("Agent Updated Successfully with name " + name);
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ message: error.message });
    }
  })
  .get("/api/agent/delete/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await __pool.query(`SELECT * FROM users WHERE id = ?`, [
        id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Agent not found" });
      }
      await __pool.query(`DELETE FROM users WHERE id = ?`, [id]);
      res.status(200).json("Agent Deleted Successfully");
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  })
  .post("/api/agent/update-availability/:id", verify, async (req, res) => {
    const { id } = req.params;
    const { availabilityRules } = req.body;

    try {
      const [rows] = await __pool.query(`SELECT * FROM users WHERE id = ?`, [
        id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Agent not found" });
      }

      await __pool.query(`DELETE FROM availability_rules WHERE agent_id = ?`, [
        id,
      ]);

      for (const rule of availabilityRules) {
        const { day_of_week, start_time, end_time } = rule;
        await __pool.query(
          `INSERT INTO availability_rules (agent_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`,
          [id, day_of_week, start_time, end_time]
        );
      }

      res.status(200).json({ message: "Availability updated successfully" });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/api/agent/fetch-availability/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await __pool.query(
        `SELECT * FROM availability_rules WHERE agent_id = ?`,
        [id]
      );
      res.status(200).json({ availabilityRules: rows });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/api/agent/google-auth-url/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await __pool.query(
        `SELECT google_calendar_tokens FROM users WHERE id = ?`,
        [id]
      );
      if (rows[0]?.google_calendar_tokens) {
        return res
          .status(400)
          .json({ message: "Google Calendar already connected" });
      }
      // Generate Google OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
        process.env.GOOGLE_CLIENT_ID
      }&redirect_uri=${
        process.env.GOOGLE_REDIRECT_URI
      }&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent&state=${encodeURIComponent(
        id
      )}`;
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/api/agent/google-callback", verify, async (req, res) => {
    const { code, state } = req.query;
    try {
      console.log(
        process.env.GOOGLE_REDIRECT_URI,
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      // Store tokens in database
      await __pool.query(
        `UPDATE users SET google_calendar_tokens = ? WHERE id = ?`,
        [JSON.stringify(tokens), state]
      );

      res.redirect("/agents");
    } catch (error) {
      console.error("Error in Google callback:", error);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/api/agent/google-status/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await __pool.query(
        `SELECT google_calendar_tokens FROM users WHERE id = ?`,
        [id]
      );

      const connected = rows[0]?.google_calendar_tokens ? true : false;
      res.json({ connected });
    } catch (error) {
      console.error("Error checking Google status:", error);
      res.status(500).json({ message: error.message });
    }
  })
  .post("/api/agent/disconnect-google/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      await __pool.query(
        `UPDATE users SET google_calendar_tokens = NULL WHERE id = ?`,
        [id]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Google:", error);
      res.status(500).json({ message: error.message });
    }
  });

export default router;
