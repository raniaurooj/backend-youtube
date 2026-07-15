import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { 
    registerUser,
    loginUser,
    logoutUser,
    updatePassword,
    getUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
} from "../controllers/user.controller.js";

import verifyJWT from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount : 1
        },
        {
            name:"coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)

router.route("/login").post(upload.none(),loginUser)

//secure routes
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/current-user").get(verifyJWT,getUser)

router.route("/update-password").post(verifyJWT,upload.none(),updatePassword)

router.route("/update-account-details").patch(verifyJWT,upload.none(),updateAccountDetails)

router.route("/update-avatar").patch(verifyJWT,
   upload.single("avatar"),
   updateAvatar)

router.route("/update-coverImage").patch(verifyJWT,
    upload.single("coverImage"),
    updateCoverImage)

router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)

router.route("/watch-history").get(verifyJWT,getWatchHistory)

export default router