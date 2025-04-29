import express from "express";
const router = express.Router();
import passport from "passport";
import { verify } from "../middlewares/verify.js";

router
  .get("/", verify, (req, res) => {
    res.redirect("/agents");
  })
  .get("/login", (req, res) => {
    res.render("login.ejs");
  })
  .post(
    "/login",
    passport.authenticate("user", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (req, res) => {
      res.redirect("/");
    }
  )
  .get("/logout", async (req, res) => {
    req.logOut((done) => {
      res.redirect("/login");
    });
  });

export default router;
