// order.routes.js
import { Router } from "express"
import {
    createOrder,
    getMyOrders,
    getSingleOrder,
    cancelOrder,
    trackOrder,
    getAllOrders,
    updateOrderStatus
} from "../controllers/order.controller.js"
import { verifyJWT }   from "../middlewares/auth.middleware.js"
import { verifyAdmin } from "../middlewares/admin.middleware.js"

const router = Router()

// User routes
router.post("/place",           verifyJWT, createOrder)
router.get("/",                 verifyJWT, getMyOrders)
router.get("/:id",              verifyJWT, getSingleOrder)
router.patch("/:id/cancel",     verifyJWT, cancelOrder)
router.get("/:id/track",        verifyJWT, trackOrder)

// Admin routes
router.get("/admin/all",              verifyJWT, verifyAdmin, getAllOrders)
router.patch("/admin/:id/status",     verifyJWT, verifyAdmin, updateOrderStatus)

export default router