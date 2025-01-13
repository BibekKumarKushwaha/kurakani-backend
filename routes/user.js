

// import express from "express";
// import {
//   acceptFriendRequest,
//   forgotPassword,
//   getMyFriends,
//   getMyNotifications,
//   getMyProfile,
//   login,
//   logout,
//   newUser,
//   searchUser,
//   sendFriendRequest,
//   updateProfile,
//   verifyOtpAndSetPassword,
// } from "../controllers/user.js";
// import {
//   acceptRequestValidator,
//   loginValidator,
//   registerValidator,
//   sendRequestValidator,
//   validateHandler,
// } from "../lib/validators.js";
// import { isAuthenticated } from "../middlewares/auth.js";
// import { singleAvatar } from "../middlewares/multer.js";

// const app = express.Router();

// // User Registration
// app.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);

// // User Login
// app.post("/login", loginValidator(), validateHandler, login);

// // // Forgot Password (Request OTP)
// // app.post("/forgot-password", forgotPassword);

// // // Verify OTP and Set New Password
// // app.post("/verify-otp", verifyOtpAndSetPassword);

// // Routes below require the user to be logged in
// app.use(isAuthenticated);

// // Get User Profile
// app.get("/me", getMyProfile);

// // Update User Profile
// app.put("/me", singleAvatar, updateProfile);

// // Send Friend Request
// app.post("/friend-request", sendRequestValidator(), validateHandler, sendFriendRequest);

// // Accept Friend Request
// app.put("/friend-request/:id", acceptRequestValidator(), validateHandler, acceptFriendRequest);

// // Get Notifications
// app.get("/notifications", getMyNotifications);

// // Get Friends
// app.get("/friends", getMyFriends);

// app.get("/search", searchUser); // To search users for friends

// // Logout User
// app.get("/logout", logout);



// export default app;

import express from "express";
import {
  acceptFriendRequest,
  forgotPassword,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
  updateProfile,
  verifyOtpAndSetPassword,
} from "../controllers/user.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";

const app = express.Router();

app.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);
app.post("/login", loginValidator(), validateHandler, login);

// // // Forgot Password (Request OTP)
app.post("/forgot-password", forgotPassword);

// // // Verify OTP and Set New Password
app.post("/verify-otp", verifyOtpAndSetPassword);


// After here user must be logged in to access the routes

app.use(isAuthenticated);

app.get("/me", getMyProfile);

app.get("/logout", logout);

app.get("/search", searchUser);

app.put(
  "/sendrequest",
  sendRequestValidator(),
  validateHandler,
  sendFriendRequest
);

app.put(
  "/acceptrequest",
  acceptRequestValidator(),
  validateHandler,
  acceptFriendRequest
);

app.get("/notifications", getMyNotifications);

app.get("/friends", getMyFriends);

// Update User Profile
app.put("/me", singleAvatar, updateProfile);

export default app;
