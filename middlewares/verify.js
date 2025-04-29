import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";

const storage = (uploadPath) => {
  return multer.diskStorage({
    destination: async function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + file.originalname);
    },
  });
};

const verify = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "you need to login first");
    return res.redirect("/login");
  }
  next();
};

const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return false;
  }
  return true;
};

const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "you need to login first");
    return res.redirect("/login");
  }

  if (req.user.role !== "admin") {
    req.flash("error", "you are not authorized");
    return res.redirect("/agents");
  }
  next();
};

const isTokenValid = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (token !== process.env.TOKEN) {
      return res
        .status(401)
        .json({ message: "Token is not valid or not present " });
    }
    next();
  } catch (error) {
    console.log(error);
    return res
      .status(401)
      .json({ message: "Token is not valid or not present " });
  }
};

async function setUploadPath(req, res, next) {
  const randomString = uuidv4();
  const uploadPath = path.join("uploads", "orders", randomString);
  await fs.mkdir(uploadPath, { recursive: true });
  const upload = multer({ storage: storage(uploadPath) });
  req.upload = upload;
  next();
}

export { verify, isAuthenticated, isAdmin, isTokenValid, setUploadPath };
