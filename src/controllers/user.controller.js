import asyncHandler from "../utils/asyncHandler.js";
import { z } from "zod";
import validator from "validator";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import mongoose from "mongoose";


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
          $unset: {
            refreshToken : 1
          }
        }
     )

     const options = {
        httpOnly: true,
        secure: true
      }

    return res.
    status(200)
    .clearCookie("AccessToken",options)
    .clearCookie("RefreshToken",options)
    .json(
      new ApiResponse(200,{},"User Logged Out")
    )
    
})

const updatePassword = asyncHandler(async (req,res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)

  const isCorrectPassword = await user.isPasswordCorrect(oldPassword)

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
  const {fullName,email} = req.body
  const user = await User.findByIdAndUpdate(
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

  if(!avatarLocalPath) throw new ApiError(400,"Avatar file is missing")

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  if(!avatar) throw new ApiError(400,"Something wrong while uploading avatar")

  const user = await User.findByIdAndUpdate(
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

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {coverImage: coverImage.url}
    },
    {new: true}
  ).select("-pasword")

  return res.status(200)
  .json(new ApiResponse(200,user,"Cover image updated successfully"))
})


const getUserChannelProfile = asyncHandler(async (req,res)=>{
  const {username} = req.params //req.params is object

  if(!username.trim()) {
    throw new ApiError(400,"Username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
      username:username.trim().toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions", //actual document
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        subscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id,"$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        email: 1
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(400, "Channel doesnot exist")
  }

  res.status(200)
  .json(
     new ApiResponse(200,channel[0],"User channel fetched Successfully")
  )
})

const getWatchHistory = asyncHandler(async (req, res)=>{
  const watchHistory = await User.aggregate([
    {
      $match: {
        //convert id string into objectId
        _id: new mongoose.Types.ObjectId(req.user._id) //bcz aggregation pipelines are direct mongoose dont work here 
      }
    },
    {
      $lookup: {
        from: "videos", 
        localField: "watchHistory", //field that is needed
        foreignField: "_id", //field that watch history needed
        as: "watchHistory",
        pipeline: [{
          //we want from the watch history to get the owner of each video
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [{
              //field that we want from the owner document not full object of owner
              $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
              }
            }]
          }
          },
          {
            $addFields: {
            owner: {
              $first: "$owner" //first index of array as a owner just to get easier response
              }
            }
          }
        ]
      }
    }
  ])
   
  return res.status(200)
  .json(
    new ApiResponse(200,watchHistory,"Watch history fetched successfully")
  )
})

export { 
  registerUser ,
  loginUser , 
  logoutUser,
  updatePassword,
  getUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
