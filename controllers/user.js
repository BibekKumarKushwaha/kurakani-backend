

// import { compare } from "bcrypt";
// import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
// import { getOtherMember } from "../lib/helper.js";
// import { TryCatch } from "../middlewares/error.js";
// import { Chat } from "../models/chat.js";
// import { Request } from "../models/request.js";
// import { User } from "../models/user.js";
// import {
//   cookieOptions,
//   emitEvent,
//   sendToken,
//   uploadFilesToCloudinary,
// } from "../utils/features.js";
// import { ErrorHandler } from "../utils/utility.js";
// //import sendOtp from "../service/sendOtp.js";

// // Create a new user and save it to the database and save token in cookie
// const newUser = TryCatch(async (req, res, next) => {
//   const { name, username, password, bio, phoneNumber } = req.body;

//   const file = req.file;

//   // Check for required fields
//   if (!file) return next(new ErrorHandler("Please Upload Avatar"));
//   if (!phoneNumber) return next(new ErrorHandler("Phone number is required"));

//   // Validate phone number format (e.g., 10-15 digits)
//   const phoneRegex = /^[0-9]{10}$/;
//   if (!phoneRegex.test(phoneNumber)) {
//     return next(new ErrorHandler("Invalid phone number format"));
//   }

//   // Check if phone number already exists
//   const existingUser = await User.findOne({ phoneNumber });
//   if (existingUser) {
//     return next(new ErrorHandler("Phone number already in use"));
//   }

//   const result = await uploadFilesToCloudinary([file]);

//   const avatar = {
//     public_id: result[0].public_id,
//     url: result[0].url,
//   };

//   const user = await User.create({
//     name,
//     bio,
//     username,
//     password,
//     avatar,
//     phoneNumber, // Add phone number to user creation
//   });

//   sendToken(res, user, 201, "User created");
// });

// // Login user and save token in cookie
// const login = TryCatch(async (req, res, next) => {
//   const { username, password } = req.body;

//   const user = await User.findOne({ username }).select("+password");

//   if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

//   const isMatch = await compare(password, user.password);

//   if (!isMatch)
//     return next(new ErrorHandler("Invalid Username or Password", 404));

//   sendToken(res, user, 200, `Welcome Back, ${user.name}`);
// });

// const getMyProfile = TryCatch(async (req, res, next) => {
//   const user = await User.findById(req.user);

//   if (!user) return next(new ErrorHandler("User not found", 404));

//   res.status(200).json({
//     success: true,
//     user,
//   });
// });

// const logout = TryCatch(async (req, res) => {
//   return res
//     .status(200)
//     .cookie("chattu-token", "", { ...cookieOptions, maxAge: 0 })
//     .json({
//       success: true,
//       message: "Logged out successfully",
//     });
// });

// const searchUser = TryCatch(async (req, res) => {
//   const { name = "" } = req.query;

//   // Finding All my chats
//   const myChats = await Chat.find({ groupChat: false, members: req.user });

//   //  extracting All Users from my chats means friends or people I have chatted with
//   const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

//   // Finding all users except me and my friends
//   const allUsersExceptMeAndFriends = await User.find({
//     _id: { $nin: allUsersFromMyChats },
//     name: { $regex: name, $options: "i" },
//   });

//   // Modifying the response
//   const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
//     _id,
//     name,
//     avatar: avatar.url,
//   }));

//   return res.status(200).json({
//     success: true,
//     users,
//   });
// });

// const sendFriendRequest = TryCatch(async (req, res, next) => {
//   const { userId } = req.body;

//   const request = await Request.findOne({
//     $or: [
//       { sender: req.user, receiver: userId },
//       { sender: userId, receiver: req.user },
//     ],
//   });

//   if (request) return next(new ErrorHandler("Request already sent", 400));

//   await Request.create({
//     sender: req.user,
//     receiver: userId,
//   });

//   emitEvent(req, NEW_REQUEST, [userId]);

//   return res.status(200).json({
//     success: true,
//     message: "Friend Request Sent",
//   });
// });

// const acceptFriendRequest = TryCatch(async (req, res, next) => {
//   const { requestId, accept } = req.body;

//   const request = await Request.findById(requestId)
//     .populate("sender", "name")
//     .populate("receiver", "name");

//   if (!request) return next(new ErrorHandler("Request not found", 404));

//   if (request.receiver._id.toString() !== req.user.toString())
//     return next(
//       new ErrorHandler("You are not authorized to accept this request", 401)
//     );

//   if (!accept) {
//     await request.deleteOne();

//     return res.status(200).json({
//       success: true,
//       message: "Friend Request Rejected",
//     });
//   }

//   const members = [request.sender._id, request.receiver._id];

//   await Promise.all([
//     Chat.create({
//       members,
//       name: `${request.sender.name}-${request.receiver.name}`,
//     }),
//     request.deleteOne(),
//   ]);

//   emitEvent(req, REFETCH_CHATS, members);

//   return res.status(200).json({
//     success: true,
//     message: "Friend Request Accepted",
//     senderId: request.sender._id,
//   });
// });

// const getMyNotifications = TryCatch(async (req, res) => {
//   const requests = await Request.find({ receiver: req.user }).populate(
//     "sender",
//     "name avatar"
//   );

//   const allRequests = requests.map(({ _id, sender }) => ({
//     _id,
//     sender: {
//       _id: sender._id,
//       name: sender.name,
//       avatar: sender.avatar.url,
//     },
//   }));

//   return res.status(200).json({
//     success: true,
//     allRequests,
//   });
// });

// const getMyFriends = TryCatch(async (req, res) => {
//   const chatId = req.query.chatId;

//   const chats = await Chat.find({
//     members: req.user,
//     groupChat: false,
//   }).populate("members", "name avatar");

//   const friends = chats.map(({ members }) => {
//     const otherUser = getOtherMember(members, req.user);

//     return {
//       _id: otherUser._id,
//       name: otherUser.name,
//       avatar: otherUser.avatar.url,
//     };
//   });

//   if (chatId) {
//     const chat = await Chat.findById(chatId);

//     const availableFriends = friends.filter(
//       (friend) => !chat.members.includes(friend._id)
//     );

//     return res.status(200).json({
//       success: true,
//       friends: availableFriends,
//     });
//   } else {
//     return res.status(200).json({
//       success: true,
//       friends,
//     });
//   }
// });



// const updateProfile = TryCatch(async (req, res, next) => {
//   const { name, bio, username, phoneNumber } = req.body;

//   const user = await User.findById(req.user);

//   if (!user) return next(new ErrorHandler("User not found", 404));

//   // Check if the username or phone number is already in use by another user
//   const existingUserByUsername = await User.findOne({ username });
//   if (existingUserByUsername && existingUserByUsername._id.toString() !== user._id.toString()) {
//     return next(new ErrorHandler("Username is already taken", 400));
//   }

//   const existingUserByPhone = await User.findOne({ phoneNumber });
//   if (existingUserByPhone && existingUserByPhone._id.toString() !== user._id.toString()) {
//     return next(new ErrorHandler("Phone number is already in use", 400));
//   }

//   // Update user fields
//   user.name = name || user.name;
//   user.bio = bio || user.bio;
//   user.username = username || user.username;
//   user.phoneNumber = phoneNumber || user.phoneNumber;

//   // Update avatar if a new one is uploaded
//   if (req.file) {
//     const file = req.file;

//     // Upload file to Cloudinary
//     const result = await uploadFilesToCloudinary([file]);

//     // Save avatar data in the user model
//     user.avatar = {
//       public_id: result[0].public_id,
//       url: result[0].url,
//     };
//   }

//   // Save updated user data
//   await user.save();

//   res.status(200).json({
//     success: true,
//     message: "Profile updated successfully",
//     user,
//   });
// });
// const forgotPassword = async (req, res) => {
//   console.log(req.body);
 
//   const { phoneNumber } = req.body;
 
//   if (!phoneNumber) {
//     return res.status(400).json({
//       success: false,
//       message: "Please enter your phone number",
//     });
//   }
//   try {
//     const user = await userModel.findOne({ phoneNumber: phoneNumber });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }
//     // Generate OTP
//     const randomOTP = Math.floor(100000 + Math.random() * 900000);
//     console.log(randomOTP);
 
//     user.resetPasswordOTP = randomOTP;
//     user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
//     await user.save();
 
//     // Send OTP to user phone number
//     const isSent = await sendOtp(phoneNumber, randomOTP);
 
//     if (!isSent) {
//       return res.status(400).json({
//         success: false,
//         message: "Error in sending OTP",
//       });
//     }
 
//     res.status(200).json({
//       success: true,
//       message: "OTP sent to your phone number",
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

// //verify otp and change password
// const verifyOtpAndSetPassword = async (req, res) => {
//   //get data
//   const { phoneNumber, otp, newPassword } = req.body;
//   if (!phoneNumber || !otp || !newPassword) {
//       return res.status(400).json({
//           'success': false,
//           'message': 'required fields are missing!'
//       });
//   }
//   try {
//       const user = await userModel.findOne({ phoneNumber: phoneNumber });

//       //verify otp
//       if (user.resetPasswordOTP != otp) {
//           return res.status(400).json({
//               'success': false,
//               'message': 'invalid otp!!'
//           });
//       }
//       if (user.resetPasswordExpires < Date.now()) {
//           return res.status(400).json({
//               'success': false,
//               'message': 'OTP Expired!'
//           });
//       }
//       //password hash
//       const randomSalt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(newPassword, randomSalt);

//       //update password
//       user.password = hashedPassword;
//       await user.save();

//       //response
//       res.status(200).json({
//           'success': true,
//           'message': 'OTP verified and password updated!'
//       });

//   } catch (error) {
//       console.log(error);
//       return res.status(500).json({
//           'success': false,
//           'message': 'server error!'
//       });
//   }
// };


// export {
//   acceptFriendRequest,
//   getMyFriends,
//   getMyNotifications,
//   getMyProfile,
//   login,
//   logout,
//   newUser,
//   searchUser,
//   sendFriendRequest,
//   updateProfile,
//   forgotPassword,
//   verifyOtpAndSetPassword,
// };



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

// Create a new user and save it to the database and save token in cookie
// const newUser = TryCatch(async (req, res, next) => {
//   const { name, username, password, bio,phoneNumber } = req.body;

//   const file = req.file;

//   if (!file) return next(new ErrorHandler("Please Upload Avatar"));

//   const result = await uploadFilesToCloudinary([file]);

//   const avatar = {
//     public_id: result[0].public_id,
//     url: result[0].url,
//   };

//   const user = await User.create({
//     name,
//     bio,
//     username,
//     password,
//     avatar,
//     phoneNumber,
//   });

//   sendToken(res, user, 201, "User created");
// });

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


// Login user and save token in cookie
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch)
    return next(new ErrorHandler("Invalid Username or Password", 404));

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
    const user = await userModel.findOne({ phoneNumber: phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // Generate OTP
    const randomOTP = Math.floor(100000 + Math.random() * 900000);
    console.log(randomOTP);
 
    user.resetPasswordOTP = randomOTP;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes
    await user.save();
 
    // Send OTP to user phone number
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

//verify otp and change password
const verifyOtpAndSetPassword = async (req, res) => {
  //get data
  const { phoneNumber, otp, newPassword } = req.body;
  if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({
          'success': false,
          'message': 'required fields are missing!'
      });
  }
  try {
      const user = await userModel.findOne({ phoneNumber: phoneNumber });

      //verify otp
      if (user.resetPasswordOTP != otp) {
          return res.status(400).json({
              'success': false,
              'message': 'invalid otp!!'
          });
      }
      if (user.resetPasswordExpires < Date.now()) {
          return res.status(400).json({
              'success': false,
              'message': 'OTP Expired!'
          });
      }
      //password hash
      const randomSalt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, randomSalt);

      //update password
      user.password = hashedPassword;
      await user.save();

      //response
      res.status(200).json({
          'success': true,
          'message': 'OTP verified and password updated!'
      });

  } catch (error) {
      console.log(error);
      return res.status(500).json({
          'success': false,
          'message': 'server error!'
      });
  }
};
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