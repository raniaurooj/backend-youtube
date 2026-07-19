import express, { urlencoded } from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

//configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit: "16kb"
}))

app.use(urlencoded({extended:true,limit:"16kb"}))
//to store some assests like image
app.use(express.static("public"))

app.use(cookieParser())


//router import
import userRouter  from "./routes/user.route.js"

//routedeclaration
app.use("/api/v1/users",userRouter)

import videoRouter from "./routes/video.route.js"

app.use("/api/v1/videos", videoRouter);

import subscriptionRoute from "./routes/subscription.route.js"

app.use("/api/v1/subscription",subscriptionRoute)

import playListRoute from "./routes/playlist.route.js"

app.use("/api/v1/playlist",playListRoute)


export default app