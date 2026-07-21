import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Comment } from "../models/comment.model.js"
import mongoose from "mongoose"

const getVideoComments = asyncHandler(async (req,res)=>{
    const { videoId }  = req.params
    const { page = 1, limit = 10 } = req.query

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const videoComments = Comment.aggregate([
         {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
                createdAt: -1 // Newest comments first
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comments = await Comment.aggregatePaginate(videoComments,options)


    return res.status(200)
    .json(
        new ApiResponse(200,comments,"Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req,res)=>{
    const {videoId} = req.params
    const {content} = req.body
    const userId = req.user._id

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid id")
    }

    if(!content?.trim()){
        throw new ApiError(400,"Please write something")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create(
        {
            content: content.trim(),
            video: videoId,
            owner: userId
        }
    )

    if(!comment){
        throw new ApiError(400,"Failed to add comment")
    }

    return res.status(201)
    .json(
        new ApiResponse(201,comment,"Comment added successfully")
    )

})

const updateComment = asyncHandler(async (req,res)=>{
    const {commentId} = req.params
    const {content} = req.body
    
    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid id")
    }
    if(!content?.trim()){
        throw new ApiError(400,"Comment can not be empty")
    }

    const comment = await Comment.findById(commentId)
    if(!comment) throw new ApiError(404, "Comment not found")

    if(comment.owner.toString()!= req.user._id.toString()){
        throw new ApiError(403,"You are not allowed to update this comment")
    }

    comment.content = content.trim()
    const updatedComment = await comment.save({validateBeforeSave: false})

    if(!updatedComment){
        throw new ApiError(400, "Failed to update comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
})

const deleteComment = asyncHandler(async (req,res)=>{
    const {commentId} = req.params
    
    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid id")
    }

    const comment = await Comment.findById(commentId)
    if(!comment) throw new ApiError(404, "Comment not found")

    if(comment.owner.toString()!= req.user._id.toString()){
        throw new ApiError(403,"You are not allowed to update this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment deleted successfully"));
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}