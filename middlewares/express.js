import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import ejsMate from "ejs-mate";
import session from "express-session";
import flash from "connect-flash";
import passport from "passport";
import LocalStrategy from "passport-local";
import connectMySQL from "express-mysql-session";
import { verifyForUser, serializeUser, deserializeUser } from "./passport.js";

const MySQLStore = connectMySQL(session);
async function setMiddleWares() {
  const app = express();
  app.use(express.static("public"));
  app.engine("ejs", ejsMate);
  app.set("view engine", "ejs");
  app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(cors());
  const sessionConfig = {
    secret: process.env.secret || "RANDOMSECRET",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: new MySQLStore({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    }),
  };
  app.use(session(sessionConfig));
  app.use(flash());
  app.use(passport.session());
  app.use(passport.authenticate("session"));

  passport.use(
    "user",
    new LocalStrategy({ usernameField: "email" }, verifyForUser)
  );
  passport.serializeUser(serializeUser);
  passport.deserializeUser(deserializeUser);

  app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  });

  return { app, express };
}

export default setMiddleWares;
