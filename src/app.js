import express from "express"
import cors from "cors"
import morgan from "morgan"
import cookieParser from "cookie-parser"
const app=express();



app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({ limit:"16kb"}))
 app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))   
app.use(cookieParser())


//routes
import userRouter from "./routes/user.route.js" 
import bookRouter from "./routes/book.route.js"
import orderRouter from "./routes/order.route.js"
import  categoryRouter from "./models/category.routes.js";
import cartRouter from "./models/cart.model.js"
//routes decalration

app.use("/api/v1/users", userRouter)
app.use("api/v1/book",bookRouter)
app.use("api/v1/category",categoryRouter)
app.use("api/v1/cart",cartRouter)
app.use("api/v1/order",orderRouter)

export default app;