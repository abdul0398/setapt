import express from "express";
import { isAdmin, verify } from "../middlewares/verify.js";
import {
  createGoogleCalendarEvent,
  refreshAccessToken,
} from "../utils/googleAuth.js";

const router = express.Router();

router
  .post("/api/bookings/create", async (req, res) => {
    const { eventId, date, time, name, email, agentId } = req.body;
    try {
      await __pool.query(
        "INSERT INTO bookings (event_id, date, time, name, email, agent_id) VALUES (?, ?, ?, ?, ?, ?)",
        [eventId, date, time, name, email, agentId]
      );

      const [agent] = await __pool.query("SELECT * FROM users WHERE id = ?", [
        agentId,
      ]);

      const [event] = await __pool.query("SELECT * FROM event WHERE id = ?", [
        eventId,
      ]);

      const { access_token, refresh_token } = agent[0].google_calendar_tokens;

      const eventDetails = {
        summary: event[0].name,
        description: event[0].description,
        startTimeISO: `${date}T${time}:00`,
        endTimeISO: `${date}T${time}:00`,
      };

      let createdEvent = await createGoogleCalendarEvent(
        access_token,
        eventDetails
      );

      if (createdEvent === "access token expired") {
        const { access_token } = await refreshAccessToken(refresh_token);
        await __poool.query(
          "UPDATE users SET google_calendar_tokens = ? WHERE id = ?",
          [JSON.stringify({ access_token, refresh_token }), agentId]
        );
        await createGoogleCalendarEvent(access_token, eventDetails);
      }
      res.status(201).json({ message: "Booking created successfully" });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: "Booking creation failed" });
    }
  })
  .get("/bookings", verify, async (req, res) => {
    try {
      const user = req.user;
      let bookingsQuery = "";
      let agentsQuery = "";
      if (user.role === "admin") {
        bookingsQuery = "SELECT * FROM bookings";
        agentsQuery = "SELECT * FROM users WHERE role = 'agent'";
      } else {
        bookingsQuery = "SELECT * FROM bookings WHERE agent_id = ?";
        agentsQuery = "SELECT * FROM users WHERE id = ? AND role = 'agent'";
      }
      const [Bookings] = await __pool.query(bookingsQuery, [user.id]);
      const [Agents] = await __pool.query(agentsQuery, [user.id]);
      res.render("bookings.ejs", { agents: Agents, bookings: Bookings });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: "Booking retrieval failed" });
    }
  })
  .get("/api/bookings/fetch", verify, async (req, res) => {
    try {
      const { agentId } = req.query;
      const user = req.user;
      if (user.role !== "admin" && user.id != agentId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const [Bookings] = await __pool.query(
        "SELECT * FROM bookings WHERE agent_id = ?",
        [agentId]
      );
      const [Events] = await __pool.query(
        "SELECT * FROM event WHERE agent_id = ?",
        [agentId]
      );

      const bookingsWithEventNames = Bookings.map((booking) => {
        const event = Events.find((e) => e.id === booking.event_id);
        return {
          ...booking,
          event_name: event ? event.name : "Unknown Event",
        };
      });

      res
        .status(200)
        .json({ bookings: bookingsWithEventNames, events: Events });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
export default router;
