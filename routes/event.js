import express from "express";
import { verify } from "../middlewares/verify.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router
  .get("/api/event/fetch/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await __pool.query(`SELECT * FROM event WHERE id = ?`, [
        id,
      ]);
      res.status(200).json({ event: rows[0] });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/api/event/delete/:id", verify, async (req, res) => {
    const { id } = req.params;
    try {
      await __pool.query(`DELETE FROM event WHERE id = ?`, [id]);

      res.status(200).json({ message: "event Deleted Successfully" });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  })
  .post("/api/event/create", verify, async (req, res) => {
    const { agentID, title, description, duration, status } = req.body;
    try {
      const [rows] = await __pool.query(
        `SELECT * FROM event WHERE name = ? AND agent_id != ?`,
        [title, agentID]
      );
      if (rows.length > 0) {
        return res
          .status(401)
          .json({ message: "event with this name already exists" });
      }
      await __pool.query(
        `INSERT INTO event (name, agent_id, description, duration, status, slug) VALUES (?, ?, ?, ?, ?, ?)`,
        [title, agentID, description, duration, status, uuidv4()]
      );

      res.status(200).json("event Created Successfully with name " + title);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  })
  .put("/api/event/update/:id", verify, async (req, res) => {
    const { id } = req.params;
    const { title, description, duration, status, agentID } = req.body;
    try {
      const [rows] = await __pool.query(
        `SELECT * FROM event WHERE name = ? AND agent_id != ?`,
        [title, agentID]
      );
      if (rows.length > 0) {
        return res
          .status(401)
          .json({ message: "event with this name already exists" });
      }
      await __pool.query(
        `UPDATE event SET name = ?, description = ?, duration = ?, status = ? WHERE id = ?`,
        [title, description, duration, status, id]
      );
      res.status(200).json({ message: "event Updated Successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  })
  .get("/event/:slug", async (req, res) => {
    const { slug } = req.params;
    try {
      const [rows] = await __pool.query(`SELECT * FROM event WHERE slug = ?`, [
        slug,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Event not found" });
      }
      const [availabilityRules] = await __pool.query(
        `SELECT * FROM availability_rules WHERE agent_id = ?`,
        [rows[0].agent_id]
      );

      const [agent] = await __pool.query(`SELECT * FROM users WHERE id = ?`, [
        rows[0].agent_id,
      ]);

      res.render("event.ejs", {
        event: rows[0],
        availabilityRules,
        agentId: rows[0].agent_id,
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: error.message });
    }
  });
export default router;
