import dotenv from "dotenv"
dotenv.config();
import app from "./app.js";

import connectDB from "./db/index.js";

const startserver=async ()=>{
    try {

   await connectDB();

   app.on("error",(error)=>{
    console.log("server error");
    
   })
   
   app.listen(process.env.PORT||3000,()=>{
    console.log(`app is running on ${process.env.PORT}`)
   })
   
    } catch (error) {
        console.log(error);
        console.log("mongodb connection failed",error);
        process.exit(1);
        
    }
}

startserver();