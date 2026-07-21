import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { Tweet } from "../models/tweet.model.js";
import {User} from "../models/user.model.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req,res)=>{
    const { content } = req.body;
    const userId = req.user._id;

    if(!content.trim()){
        throw new ApiError(400, "Please write something")
    }
    
    const tweet = await Tweet.create({
        content: content.trim(),
        owner: userId
    })

    if(!tweet){
        throw new ApiError(400, "Failed to create tweet")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, tweet, "Tweet is created successfully")
    )
})

const getUserTweets = asyncHandler(async (req,res)=>{
    const {userId} = req.params;
    
    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError(400,"Invalid Id format")
    }

    const user = await User.findById(userId);
    if(!user) {
        throw new ApiError(404,"User not found")
    }

    const tweets = await Tweet.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$ownerDetails", 0]
                }
            }
        },
        {
            $project: {
                ownerDetails: 0
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            tweets,
            tweets.length ? "User tweets fetched successfully" : "No tweets found for this user"
        )
    )
})

const updateTweet = asyncHandler(async (req,res)=>{
    const { content } = req.body;
    const { tweetId } = req.params;
    const userId = req.user._id;

    if(!content?.trim()){
        throw new ApiError(400, "Please write something")
    }

    if(!mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet Id")
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404,"Tweet not found")
    }

    if(tweet.owner.toString()!= userId.toString()){
        throw new ApiError(403,"You are not allowed to update this tweet")
    }

    tweet.content = content.trim()

    const updatedTweet = await tweet.save({validateBeforeSave: false})

    return res.status(200)
    .json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    )

})

const deleteTweet = asyncHandler(async (req,res)=>{
    const {tweetId} = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid id")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet) {
        throw new ApiError(404,"Tweet not found")
    }

    if(tweet.owner.toString()!= userId.toString()){
        throw new ApiError(403,"You are not allowed to update this tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}