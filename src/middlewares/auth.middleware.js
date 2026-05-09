import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"

export const verifyJWT = async (req, res, next) => {
    try {
        // 1. Get token from header
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: No token provided"
            })
        }

       
        // 2. Verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // 3. Get user from DB
        const user = await User.findById(decoded?._id).select("-password -refreshToken")

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized: User not found"
            })
        }

        // 4. Attach user to request
        req.user = user

        next()
    } catch (error) {
        return res.status(401).json({
            message: "Unauthorized: Invalid token",
            error: error.message
        })
    }
}