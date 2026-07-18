import { Router } from "express";
import { 
    deleteVideo,
    getAllVideos, 
    getVideoById, 
    publishVideo,
    togglePublishStatus,
    updateVideoDetails
 } from "../controllers/video.controller";
import verifyJWT from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { de } from "zod/locales";

const router = Router()

router.route("/get-videos").get(getAllVideos)
router.route("/publish-video").post(verifyJWT,upload,publishVideo)
router.route("/:videoId").get(getVideoById)
router.route("/:videoId/update-video").post(verifyJWT,upload,updateVideoDetails)
router.route("/:videoId/delete-video").delete(verifyJWT,deleteVideo)
router.route("/:videoId/toggle-publish-status").patch(verifyJWT,togglePublishStatus)

export default router