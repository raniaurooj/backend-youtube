import mongoose, { mongo } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const createPlayList = asyncHandler(async (req,res)=>{
    const userId = req.user._id
    const {name, description} = req.body
    
    if(!name?.trim()){
        throw new ApiError(400, "Playlist name is rerquired")
    }

    const playList = await Playlist.create({
        name: name.trim(),
        description: description?.trim() || "",
        videos: [],
        owner: userId
    })

    if(!playList){
        throw new ApiError(400, "Something went wrong while creating playlist")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,playList,"Playlist created successfully")
    )

})

const getUserPlayList = asyncHandler(async (req, res)=>{
    const {userId} = req.params

    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError(400, "Invalid id")
    }

    const playList = await Playlist.find({owner: userId})

    if(!playList){
        throw new ApiError(404,"PlayList not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,playList,"Playlist fetched successfully")
    )
})

const getPlayListById = asyncHandler(async (req,res)=>{
    const { playListId } = req. params
    
    if(!mongoose.isValidObjectId(playListId)){
        throw new ApiError(400, "Invalid id")
    }

    const playList = await Playlist.findById(playListId)
    .populate({
        path: "videos",
        select: "title thumbNail duration views owner",
        populate: {
            path: "owner",
            select: "username avatar fullName"
        }
    })

    if(!playList){
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, playList, "Playlist fetched successfully")
    )
})

const addVideoToPlayList = asyncHandler(async (req,res)=>{
    const {playListId, videoId} = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(videoId) || !mongoose.isValidObjectId(playListId)){
        throw new ApiError(400, "Invalid id")
    }

    const playList = await Playlist.findById(playListId);
    if(!playList) throw new ApiError(404, "Playlist not found")
    
    if(playList.owner.toString() != userId.toString()){
        throw new ApiError(400,"You are not allowed to update this playlist")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404,"Video not found")
    }

    if(playList.videos.includes(videoId)){
        throw new ApiError(400, "Video is already in playlist")
    }

    playList.videos.push(videoId)
    await playList.save()

    return res.status(200)
    .json(
        new ApiResponse(200, playList,"Video added to playlist successfully")
    )

})

const removeVideoFromPlayList = asyncHandler(async (req,res)=>{
    const {playListId, videoId} = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(videoId) || !mongoose.isValidObjectId(playListId)){
        throw new ApiError(400, "Invalid id")
    }
    
    const playList = await Playlist.findById(playListId);
    if(!playList) throw new ApiError(404, "Playlist not found")
    
    if(playList.owner.toString() != userId.toString()){
        throw new ApiError(400,"You are not allowed to update this playlist")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404,"Video not found")
    }

    if(!playList.videos.includes(videoId)){
        throw new ApiError(404, "Video is not found in the playlist")
    }

    playList.videos.pull(videoId)
    await playList.save()

    return res.status(200)
    .json(
        new ApiResponse(200,playList ,"Video removed from the playlist successfully")
    )

})

const removePlayList = asyncHandler(async (req,res)=>{
    const {playListId} = req.params
    const userId = req.user._id

    if(!mongoose.isValidObjectId(playListId)){
        throw new ApiError(400, "Invalid id")
    }

    const playList = await Playlist.findById(playListId)
    if(!playList){
        throw new ApiError(404,"Playlist not found")
    }

    if(playList.owner.toString() != userId.toString()){
        throw new ApiError(400, "You are not allowed to delete this playlist")
    }

    await Playlist.findByIdAndDelete(playListId)

    return res.status(200)
    .json(
        new ApiResponse(200,{},"Playlist deleted successfully")
    )
})

const updatePlayList = asyncHandler(async (req,res)=>{
    const {playListId} = req.params
    const {name, description} = req.body
    const userId = req.user._id
    
    if(!mongoose.isValidObjectId(playListId)){
        throw new ApiError(400, "Invalid id")
    }

    if(!name?.trim() && !description?.trim()){
        throw new ApiError(200, "Atleast one thing is required")
    }

    const playList = await Playlist.findById(playListId)
    if(!playList) throw new ApiError(404, "PlayList not found")

    if(playList.owner.toString() != userId.toString()){
        throw new ApiError(400,"You are not allowed to update this playlist")
    }

    if(name && name.trim()!=""){
        playList.name = name.trim()
    }

    if(description && description.trim()!= ""){
        playList.description = description.trim()
    }

    const updatedPlayList = await playList.save()

    return res.status(200)
    .json(
        new ApiResponse(200, updatedPlayList ,"Playlist updated successfully")
    )

})

export {
    createPlayList,
    getUserPlayList,
    getPlayListById,
    addVideoToPlayList,
    removeVideoFromPlayList,
    removePlayList,
    updatePlayList
}