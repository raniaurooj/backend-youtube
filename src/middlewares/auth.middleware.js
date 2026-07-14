import { ApiError } from "../utils/ApiErrors.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const verifyJWT = asyncHandler(async (req,res, next) =>{
    try {
        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401,"Unautorized request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user = user; //add new object to the request
        next()
    } catch (error) {
        throw new ApiError(400, error?.message || "invalid Access Token")
    }

})

export default verifyJWT