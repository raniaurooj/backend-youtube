import { Router } from "express";
import {
    createPlayList,
    getUserPlayList,
    getPlayListById,
    addVideoToPlayList,
    removeVideoFromPlayList,
    removePlayList,
    updatePlayList
} from "../controllers/playlist.controller.js"; 
import  verifyJWT  from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlayList);

router
    .route("/:playListId")
    .get(getPlayListById)
    .patch(updatePlayList)
    .delete(removePlayList);

router.route("/add/:videoId/:playListId").patch(addVideoToPlayList);
router.route("/remove/:videoId/:playListId").patch(removeVideoFromPlayList);

router.route("/user/:userId").get(getUserPlayList);

export default router;
