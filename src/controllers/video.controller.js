import asyncHandler from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js"
import {Video} from "../models/video.model.js"
import { pipeline } from "zod/v3";
import { optional } from "zod";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiErrors.js";
import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req,res)=>{

    try {
        
        const {page =1, limit = 10, sortBY, sortType, query, userId } = req.query //from frontend
        
        const pipeline = [] // we so manually add stages based on user query
        
        //matching videos related to query, userid , and ispublished status
        if(query){
            pipeline.push({
                $match:{
                    $or: [
                        {title: {$regex: query, $options : "i"}},
                        {description: {$regex: query, $option: "i"}}
                    ]
                }
            })
        }

        if(userId){
            pipeline.push({
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            })
        }

        pipeline.push({
            $match: {
                isPublished: true  // default homepage
            }
        })

        //lookup for all matching videos for their owner details
        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails" // convert the lookup array into object 
            },
            {
                $project:{
                    videoFile: 1,
                    thumbNail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    isPublished: 1,
                    createdAt: 1,
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        avatar: "$ownerDetails.avatar",
                        fullName: "$ownerDetails.fullName"
                    }
                }
            }
        )

        //sorting all the videos
        pipeline.push({
            $sort : {
                [sortBy] : sortType === "asc"? 1 : -1 //square bracket because it is variable holding value
            }
        })
        
        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        }

        const result = await Video.aggregatePaginate(
            Video.aggregate(pipeline),
            options
        )
        
        return res.status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videos: result.docs,
                    totalPages: result.totalPages,
                    totalVideos: result.totalDocs,
                    currentPage: result.page,
                    hasNextPage: result.hasNextPage,
                    hasPrevPage: result.hasPrevPage
                },
                "Videos fetched successfuly"
            )
        )

    } catch (error) {
        
        throw new ApiError(400,"Something went wrong while fetching Videos")
    }

})

const publishVideo = asyncHandler(async (req,res)=>{
    const {title, description} = req.body

    if(!title) throw new ApiError(400, "Title is required")
    if(!description) throw new ApiError(400,"description is required")

    const videoLocalPath  = req.files?.videoFile?.[0]?.path
    const thumbNailLocalPath = req.files?.thumbNail?.[0]?.path


    if(!videoLocalPath) throw new ApiError(400, "Video is missing")
    if(!thumbNailLocalPath)   throw new ApiError(400, "Thumbnail is missing")

   try {
     const videoFile = await uploadOnCloudinary(videoLocalPath)
     const thumbNailFile = await uploadOnCloudinary(thumbNailLocalPath)
 
     if(!videoFile) throw new ApiError(500,"Something went wrong while uploading video")
     if(!thumbNailFile) throw new ApiError(500,"Something went wrong while uploading Thumbnail")
 
 
     const video = await Video.create({
         videoFile: videoFile.url,
         thumbNail: thumbNailFile.url,
         duration: videoFile.duration,
         owner: req.user._id,
         isPublished: true,
         title,
         description,
     })
 
     return res.status(201)
     .json(
         new ApiResponse(201,video,"Video published successfully")
     )
   } catch (error) {
      throw new ApiError(500,error?.message || "Something went wrong while publishing video")
   }
    

    
})

const getVideoById = asyncHandler(async (req,res)=>{
    const {videoId} = req.params

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $inc : {views: 1}
        },
        {
            new: true
        }
    ).populate("owner","username fullname avatar") //automatically match ref id behind the scene 

    if(!video) {
        throw new ApiError(404,"Video not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,video,"Video fetched successfully")
    )
    
})

const updateVideoDetails = asyncHandler(async (req,res)=>{
    const {videoId} = req.params
    const { title, description} = req.body
    const thumbNailLocalPath = req.file?.path
    
    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video id")
    }

    if(!title && !description && !thumbNailLocalPath) {
       throw new ApiError(400,"Atleast one field is required")
    }
    
    const video = await Video.findById(videoId)
    if(!video)  throw new ApiError(404,"Video not found")

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You do not have permission to update this video")
    }

    const thumbNail = await uploadOnCloudinary(thumbNailLocalPath)
    if(!thumbNail) throw new ApiError(500,"Something went wrong whilei uploading thumbnail")

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title || video.title,
                description: description || video.description,
                thumbNail: thumbNail.url
            }
        },
        { new: true }
    );
    
    return res.status(200)
    .json(
        new ApiResponse(200, updatedVideo,"Video updated successfully")
    )

})

const deleteVideo = asyncHandler(async (req,res)=>{
    const {videoId} = req.params

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video) throw new ApiError(404,"Video not found")
    
    //tostring because object id is an object so javascript comapre their reference not tat actual string 
    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"You are not allowed to delete this video")
    }
    
    if (video.videoFile) {
        await deleteFromCloudinary(video.videoFile, "video");
    }
    if (video.thumbNail) {
        await deleteFromCloudinary(video.thumbNail, "image");
    }

    await Video.findByIdAndDelete(videoId)

    res.status(200)
    .json(
        new ApiResponse(200,"Video deleted Successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req,res)=>{
     const {videoId} = req.params

     if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid id format")
     }

     const video = await Video.findById(videoId)

     if(!video){
        throw new ApiError(404,"Video not found")
     }

     if(!video.owner.equals(req.user._id)){
        throw new ApiError(403,"You don't have permission to change this video status")
     }

     video.isPublished = !video.isPublished
     
     await video.save({validateBeforeSave: false})

     return res.status(200)
     .json(
        new ApiResponse(200,video,"Video statud changed successfully")
     )


})

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus
}