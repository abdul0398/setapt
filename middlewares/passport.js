import crypto from "crypto";
import bcrypt from "bcrypt";

async function verifyForUser(email, password, cb) {
  try {
    const [rows, field] = await __pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (rows.length == 0) {
      return cb(null, false, { message: "Incorrect email or password." });
    }

    // Ensure both password and hash are strings
    const storedHash = rows[0].hashed_password.toString();
    const match = await bcrypt.compare(password.toString(), storedHash);
    console.log(match);

    if (!match) {
      return cb(null, false, { message: "Incorrect username or password." });
    }
    return cb(null, rows[0]);
  } catch (error) {
    console.log(error);
    return cb(error);
  }
}

function serializeUser(user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.email, role: user.role });
  });
}

function deserializeUser(user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
}

export { verifyForUser, serializeUser, deserializeUser };
