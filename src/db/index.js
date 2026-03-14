import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB=async ()=>{
    try {
      const Connectioninstance=  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
      console.log("mongodb connected !! DB HOST :",Connectioninstance.connection.host)
    } catch (error) {
         console.log("errror",error);
         process.exit(1);
    }
}

export default connectDB