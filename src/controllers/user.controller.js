import asyncHandler from "../utils/asyncHandler.js";
import { z } from "zod";
import validator from "validator";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async (userId) =>{
   const user = await User.findById(userId)

   const accessToken = user.generateAccessToken()
   const refreshToken = user.generateRefreshToken()

   user.refreshToken = refreshToken
   await user.save({ validateBeforeSave: false })

   return {accessToken, refreshToken}
}

const registrationSchema = z.object({
  email: z.string().refine((val) => validator.isEmail(val), {
    message: "Invalid email format.",
  }),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;
  console.log(req.body);

  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }

    const validation = registrationSchema.safeParse({ email, password })
    if (!validation.success) {
    
        const errorMessage = validation.error.errors[0].message;
        throw new ApiError(400, errorMessage);
    }


  const existingUser = await User.findOne( {
    $or: [{username},{email}]
   });

  if (existingUser) {
    throw new ApiError(409, "User with this email or username already registered");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath) throw new ApiError(400,"Avatar is required");
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar) throw new ApiError(400,"Avatar is required");

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase()
  })
   
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering user.")
  }

  return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully!")
  )

});

const loginUser = asyncHandler(async (req,res)=>{
  console.log(req.body)
  const {email, password, username} = req.body

  if(!email || !username) {
    throw new ApiError(400,"username or email is required")
  }

  const user = await User.findOne({
    $or: [{username},{email}]
  })

  if(!user){
    throw new ApiError(400,"User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401,"password is incorrect")
  }
  
  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.
  status(200)
  .cookie("AccessToken",accessToken,options)
  .cookie("RefreshToken",refreshToken,options)
  .json(
    new ApiResponse(200,
    {
      loggedInUser,accessToken,refreshToken
    },
     "User LoggedIn successfully"
    )
  )
  

})

const logoutUser = asyncHandler(async (req,res) =>{
     await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            refreshToken : undefined
          }
        }
     )

     const options = {
        httpOnly: true,
        secure: true
      }

    return res.
    status(200)
    .ClearCookie("AccessToken",options)
    .ClearCookie("RefreshToken",options)
    .json(
      new ApiResponse(200,{},"User Logged Out")
    )
    
})

export { registerUser ,loginUser , logoutUser};
