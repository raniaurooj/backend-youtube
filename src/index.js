import dotenv from "dotenv"
import connectDB from "./db/index.js"
import app from "./app.js"

dotenv.config({
    path: "./.env"
})


connectDB() // it returns promise
.then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log("server is running on the port: ",process.env.PORT)
    })
})
.catch((err)=>{
    console.log("MONGODB connection error: ", err)
})