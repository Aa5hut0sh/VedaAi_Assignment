import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      default: null,
    },

    hashedPassword: {
      type: String,
      required: true,
      default: null,
    },

    school:{
        type: String,
        required: true,
        default: null,
    },
    role: {
      type: String,
      enum: ["ADMIN", "TEACHER"],
      default: "TEACHER",
    }
  },
  {
    timestamps: true,
  },
);



const User = mongoose.model("User", userSchema);

export default User;