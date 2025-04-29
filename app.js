import dotenv from "dotenv";
dotenv.config();
import setMiddleWares from "./middlewares/express.js";
import {
  userRouter,
  agentRouter,
  leadRouter,
  eventRouter,
  bookingRouter,
} from "./routes/index.js";
import { connectToDB, createAdmin } from "./db/index.js";

async function start() {
  const port = process.env.PORT || 4000;
  const { app } = await setMiddleWares();
  await connectToDB();
  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.role = req.user ? req.user.role : "guest"; // ✅ Fallback to 'guest' if not logged in
    next();
  });

  app.use([userRouter, agentRouter, leadRouter, eventRouter, bookingRouter]);
  app.use((req, res) => {
    res.render("error.ejs");
  });
  app.listen(port, async () => {
    console.log(`
      ██████╗ █████╗ ██╗     ███████╗███╗   ██╗██████╗ ██╗     ██╗   ██╗
     ██╔════╝██╔══██╗██║     ██╔════╝████╗  ██║██╔══██╗██║     ██║   ██║
     ██║     ███████║██║     █████╗  ██╔██╗ ██║██║  ██║██║     ██║   ██║
     ██║     ██╔══██║██║     ██╔══╝  ██║╚██╗██║██║  ██║██║     ██║   ██║
     ╚██████╗██║  ██║███████╗███████╗██║ ╚████║██████╔╝███████╗╚██████╔╝
      ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝ ╚═════╝ 
    `);
    console.log(`##### Express Server Started at port ${port} #####`);
  });
}
start();
