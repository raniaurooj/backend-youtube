import asyncHandler from "../utils/asyncHandler.js";
import { z } from "zod";
import validator from "validator";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const registrationSchema = z.object({
  email: z.string().refine((val) => validator.isEmail(val), {
    message: "Invalid email format.",
  }),
});

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;

  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }

  try {
    registrationSchema.parse({ email }); 
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.errors[0].message);
    }
    throw error;
  }

  const existingUser = await User.findOne( {
    $or: [{username},{email}]
   });

  if (existingUser) {
    throw new ApiError(409, "User with this email or username already registered");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  if(req.files.coverImage){
    const CoverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if(!avatarLocalPath) throw new ApiError(400,"Avatar is required");
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(CoverImageLocalPath);

  if(!avatar) throw new ApiError(400,"Avatar is required");

  const user = User.create({
    fullName,
    avatar: avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase()
  })
   
  const createdUser = User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering user.")
  }

  return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully!")
  )

});

export { registerUser };
