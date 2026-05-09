import { Router } from "express"
import {
    validateCoupon,
    getAllCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
} from "../controllers/coupon.controller.js"
import { isAuth, verifyJWT } from "../middlewares/auth.middleware.js"
import { isAdmin, verifyAdmin } from "../middlewares/admin.middleware.js"

const router = Router()

// User routes
router.route("/validate").post(isAuth, validateCoupon)

// Admin routes
router.route("/").get(verifyJWT, verifyAdmin, getAllCoupons)
router.route("/").post(verifyJWT, verifyAdmin, createCoupon)
router.route("/:id").patch(verifyJWT,verifyAdmin, updateCoupon)
router.route("/:id").delete(verifyJWT, verifyAdmin, deleteCoupon)
router.route("/:id/toggle").patch(verifyJWT, verifyAdmin, toggleCouponStatus)

export default router