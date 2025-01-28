
import mongoose, { Schema, model } from "mongoose";
import { hash } from "bcrypt";

const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      public_id: {
        type: String,
        required: true,
      },
      
  
      url: {
        type: String,
        required: true,
      },
    },
    phoneNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    resetPasswordOTP:{
      type: Number,

    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// schema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   this.password = await hash(this.password, 10);
// });
schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Skip if not modified
  this.password = await hash(this.password, 10); // Hash password only if modified
  next();
});


export const User = mongoose.models.User || model("User", schema);

