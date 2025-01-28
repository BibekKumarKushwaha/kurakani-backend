
import { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { User } from "../models/user.js";
import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import { sendOtp } from "../service/sendOtp.js";
import bcrypt from "bcrypt";



const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio, phoneNumber } = req.body;

  // Validate phone number on the backend, ensuring 10 digits only
  if (!/^\d{10}$/.test(phoneNumber)) {
    return next(new ErrorHandler("Please provide a valid 10-digit phone number"));
  }

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload Avatar"));

  const result = await uploadFilesToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
    phoneNumber,
  });

  sendToken(res, user, 201, "User created");
});


const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return next(new ErrorHandler("Please provide both username and password", 400));
  }

  // Find user by username and include password
  const user = await User.findOne({ username }).select("+password");

  if (!user) {
    console.error("Login error: User not found with username:", username);
    return next(new ErrorHandler("Invalid Username or Password", 404));
  }

  console.log("Stored hashed password:", user.password);

  // Compare provided password with hashed password
  const isMatch = await bcrypt.compare(password, user.password);

  console.log("Provided password:", password);
  console.log("Password match result:", isMatch);

  if (!isMatch) {
    console.error("Login error: Password mismatch for username:", username);
    return next(new ErrorHandler("Invalid Username or Password", 404));
  }

  console.log("Login successful for user:", username);

  // Send token upon successful login
  sendToken(res, user, 200, `Welcome Back, ${user.name}`);
});


const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);

  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("chattu-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

const searchUser = TryCatch(async (req, res) => {
  const { name = "" } = req.query;

  // Finding All my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  //  extracting All Users from my chats means friends or people I have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  // Finding all users except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  // Modifying the response
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;

  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

const getMyNotifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests,
  });
});

const getMyFriends = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});
const updateProfile = TryCatch(async (req, res, next) => {
  const { name, bio, username, phoneNumber } = req.body;

  const user = await User.findById(req.user);

  if (!user) return next(new ErrorHandler("User not found", 404));

  // Check if the username or phone number is already in use by another user
  const existingUserByUsername = await User.findOne({ username });
  if (existingUserByUsername && existingUserByUsername._id.toString() !== user._id.toString()) {
    return next(new ErrorHandler("Username is already taken", 400));
  }

  const existingUserByPhone = await User.findOne({ phoneNumber });
  if (existingUserByPhone && existingUserByPhone._id.toString() !== user._id.toString()) {
    return next(new ErrorHandler("Phone number is already in use", 400));
  }

  // Update user fields
  user.name = name || user.name;
  user.bio = bio || user.bio;
  user.username = username || user.username;
  user.phoneNumber = phoneNumber || user.phoneNumber;

  // Update avatar if a new one is uploaded
  if (req.file) {
    const file = req.file;

    // Upload file to Cloudinary
    const result = await uploadFilesToCloudinary([file]);

    // Save avatar data in the user model
    user.avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };
  }

  // Save updated user data
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
});

const forgotPassword = async (req, res) => {
  console.log(req.body);

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
      return res.status(400).json({
          success: false,
          message: "Please enter your phone number",
      });
  }
  try {
      const user = await User.findOne({ phoneNumber: phoneNumber });
      if (!user) {
          return res.status(404).json({
              success: false,
              message: "User not found",
          });
      }

      const randomOTP = Math.floor(100000 + Math.random() * 900000);
      console.log(randomOTP);

      user.resetPasswordOTP = randomOTP;
      user.resetPasswordExpires = Date.now() + 600000;
      await user.save();

      const isSent = await sendOtp(phoneNumber, randomOTP);

      if (!isSent) {
          return res.status(400).json({
              success: false,
              message: "Error in sending OTP",
          });
      }

      res.status(200).json({
          success: true,
          message: "OTP sent to your phone number",
      });
  } catch (error) {
      console.log(error);
      return res.status(500).json({
          success: false,
          message: "Internal server error",
      });
  }
};



const verifyOtpAndSetPassword = TryCatch(async (req, res, next) => {
  const { phoneNumber, otp, newPassword } = req.body;

  // Validate input
  if (!phoneNumber || !otp || !newPassword) {
    return next(new ErrorHandler("Required fields are missing!", 400));
  }

  // Find user by phone number and include OTP fields
  const user = await User.findOne({ phoneNumber }).select(
    "+resetPasswordOTP +resetPasswordExpires"
  );

  if (!user) {
    return next(new ErrorHandler("User not found!", 404));
  }

  console.log("Stored OTP in database:", user.resetPasswordOTP);
  console.log("Provided OTP:", otp);

  // Validate OTP
  if (user.resetPasswordOTP !== otp) {
    return next(new ErrorHandler("Invalid OTP!", 400));
  }

  // Check if OTP has expired
  if (user.resetPasswordExpires < Date.now()) {
    return next(new ErrorHandler("OTP expired!", 400));
  }

  // Hash the new password

  // Update user password and clear OTP fields
  user.password = newPassword;
  user.resetPasswordOTP = null; // Clear OTP
  user.resetPasswordExpires = null; // Clear expiry
  await user.save();

  console.log("Password successfully updated for user:", user.phoneNumber);

  res.status(200).json({
    success: true,
    message: "OTP verified and password updated!",
  });
});



export {
  acceptFriendRequest,
  getMyFriends,
  getMyNotifications,
  getMyProfile,
  login,
  logout,
  newUser,
  searchUser,
  sendFriendRequest,
  updateProfile,
  forgotPassword,
  verifyOtpAndSetPassword,
};