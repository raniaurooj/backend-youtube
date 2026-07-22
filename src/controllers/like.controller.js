import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {User} from "../models/user.model.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import mongoose from "mongoose"

const getLikedVideos = asyncHandler(async (req,res)=>{
    const userId = req.user._id

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: {$exists: true} //to get only videolikes
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]

                        }
                    },
                    {
                        $addFields: {
                            owner: {$arrayElemAt : ["$ownerDetails",0]}
                        }
                    },
                    {
                        $project: {
                            ownerDetails: 0
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: {$arrayElemAt: ["$videoDetails",0]}
            }
        },
        {
            $project: {
                videoDetails: 0
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))

})


const toggleVideoLike = asyncHandler(async (req,res)=>{
    const { videoId } = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid id")
    }

    const likedVideo = await Like.findOne(
        {
            video: videoId,
            likedBy: userId
        }
    )

    if(!likedVideo){
        await Like.create({
            video: videoId,
            likedBy: userId
        })

        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Video liked successfully"));
    }

    await Like.findByIdAndDelete(likedVideo._id)
    
     return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false }, "Video unliked successfully"));

})

const toggleTweetLike = asyncHandler(async (req,res)=>{

    const { tweetId } = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid id")
    }

    const likedTweet = await Like.findOne(
        {
            tweet: tweetId,
            likedBy: userId
        }
    )

    if(!likedTweet){
        await Like.create({
            tweet: tweetId,
            likedBy: userId
        })

        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully"));
    }

    await Like.findByIdAndDelete(likedTweet._id)
    
     return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully"));

})

const toggleCommentLike = asyncHandler(async (req,res)=>{

    const { commentId } = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid id")
    }

    const likedComment = await Like.findOne(
        {
            comment: commentId,
            likedBy: userId
        }
    )

    if(!likedComment){
        await Like.create({
            comment: commentId,
            likedBy: userId
        })

        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Comment liked successfully"));
    }

    await Like.findByIdAndDelete(likedComment._id)
    
     return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false }, "Comment unliked successfully"));

})

export {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
}