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

const updatePassword = asyncHandler(async (req,res) => {
  const {oldPassword, newPassword} = req.password

  const user = await User.findById(req.user?._id)

  const isCorrectPassword = await user.isCorrectPassword(oldPassword)

  if(!isCorrectPassword){
    throw new ApiError(400,"Password is incorrect")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res.status(200,)
  .json(new ApiResponse(200,{},"Password is changed successfully"))
})

const getUser = asyncHandler(async (req,res)=>{
  
  return res.status(200).json(200,req.user,"User fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
  const user = await User.findById(
    req.user?._id,
    {
      $set: {fullName,email}
    },
    {new: true}
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200,user,"Account Details updated successfully"))
})

const updateAvatar = asyncHandler(async (req,res)=>{
  const avatarLocalPath = req.file?.path //single file avatar thats why file, not files

  if(!avatar) throw new ApiError(400,"Avatar file is missing")

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar) throw new ApiError(400,"Something wrong while uploading avatar")

  const user = await User.findById(
    req.user?._id,
    {
      $set: {avatar: avatar.url}
    },
    {new: true}
  ).select("-pasword")

  return res.status(200)
  .json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async (req,res)=>{
  const coverImageLocalPath = req.file?.path //single file avatar thats why file, not files

  if(!coverImageLocalPath) throw new ApiError(400,"Cover Image file is missing")

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage) throw new ApiError(400,"Something wrong while uploading cover image")

  const user = await User.findById(
    req.user?._id,
    {
      $set: {coverImage: coverImage.url}
    },
    {new: true}
  ).select("-pasword")

  return res.status(200)
  .json(new ApiResponse(200,user,"Cover image updated successfully"))
})



export { 
  registerUser ,
  loginUser , 
  logoutUser,
  updatePassword,
  getUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage
};
