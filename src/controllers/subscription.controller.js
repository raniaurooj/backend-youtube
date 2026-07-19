import mongoose, {mongoosePopulatedDocumentMarker, Schema} from "mongoose"
import {Subscriber} from "../models/subscription.model.js"
import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const toggleSubscription = asyncHandler(async (req,res)=>{
      const {channelId} = req.params
      const subscriberId = req.user._id

      if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid id format")
      }
      
      //prevent from subcribing you own channel
      if (channelId.toString() === subscriberId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
      }
      
      //finding the matching document 
      const existingSubscriber = await Subscriber.findOne({
        channel: channelId,
        subscriber : subscriberId
      });

      if(existingSubscriber){

        //delete that document id
        await Subscriber.findByIdAndDelete(existingSubscriber._id)

        res.status(200)
        .json(
            new ApiResponse(200,{},"Channel unsubscribed.")
        )
      }
      else{
        const subscriber = await Subscriber.create({
            channel: channelId,
            subscriber: subscriberId
        })

        res.status(200)
        .json(
            new ApiResponse(200,{},"Channel Subscribed.")
        )
      }

})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Id")
    }

    const subscribersList = await Subscriber.aggregate([
        {
            $match: new mongoose.Types.ObjectId(channelId)
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo"
            }
        },
        {
            $unwind: "$subscriberInfo"
        },
        {
            $project: {
                _id : 1,
                subscriber: {
                    avatar: "$subscriberInfo.avatar",
                    id: "$subscriberInfo._id",
                    fullName: "$subscriberInfo.fullName",
                    username: "$subscriberInfo.username"
                }
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200,{
            subscribers: subscribersList,
            subscriberCount: subscribersList.length
        },
        "Subscribers fetched successfully.")
    )
    
})


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!mongoose.isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid id")
    }

    const channelList = await Subscriber.aggregate([
        {
            $match: new mongoose.Types.ObjectId(subscriberId)
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as : "channelInfo"
            }
        },
        {
            $unwind: "$channelInfo"
        },
        {
            $project:{
                _id: 1,
                $channel:{
                   username: "$channelInfo.username",
                   avatar: "$channelInfo.avatar",
                   fullName: "$channelInfo.fullName",
                   id : "$channelInfo._id"
                }
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200,{
            channels: channelList,
            subscribed: channelList.length
        },"Channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers,
}