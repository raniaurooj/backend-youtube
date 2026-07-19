import Router from "express"

import {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers
}
from "../controllers/subscription.controller"
import verifyJWT from "../middlewares/auth.middleware.js"

const router = Router()
router.use(verifyJWT)

router.route("/channel/:channelId")
    .post(toggleSubscription)
    .get(getUserChannelSubscribers)

router.route("/user/:subscriberId").get(getSubscribedChannels)


export default router