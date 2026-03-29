import { Router } from "express"
import {
    placeOrder,
    getMyOrders,
    getOrderById,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    deleteOrder
} from "../controllers/order.controller.js"
import { verifyJWT }   from "../middlewares/auth.middleware.js"
import { verifyAdmin } from "../middlewares/admin.middleware.js"

const router = Router()

// ── User Routes ───────────────────────────────────────
router.post("/place",       verifyJWT, placeOrder)
router.get("/",             verifyJWT, getMyOrders)
router.get("/:id",          verifyJWT, getOrderById)
router.patch("/:id/cancel", verifyJWT, cancelOrder)

// ── Admin Routes ──────────────────────────────────────
router.get("/admin/all",              verifyJWT, verifyAdmin, getAllOrders)
router.patch("/admin/:id/status",     verifyJWT, verifyAdmin, updateOrderStatus)
router.delete("/admin/:id",           verifyJWT, verifyAdmin, deleteOrder)

export default router