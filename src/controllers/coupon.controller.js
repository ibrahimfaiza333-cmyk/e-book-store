import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Coupon } from "../models/coupon.model.js"

// ✅ Validate / Apply Coupon
const validateCoupon = asyncHandler(async (req, res) => {
    const { code, orderAmount } = req.body

    if (!code) {
        throw new ApiError(400, "Coupon code required hai")
    }

    const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
    })

    if (!coupon) {
        throw new ApiError(404, "Invalid coupon code")
    }

    // Expiry check
    if (coupon.expiryDate < new Date()) {
        throw new ApiError(400, "Coupon expired")
    }

    // Usage limit check
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ApiError(400, "Coupon limit exceed")
    }

    // Already used check
    if (coupon.usedBy.includes(req.user._id)) {
        throw new ApiError(400, "coupon already used")
    }

    // Min order check
    if (orderAmount && orderAmount < coupon.minOrderAmount) {
        throw new ApiError(
            400,
            `Minimum order must be Rs.${coupon.minOrderAmount} `
        )
    }

    // Discount calculate
    let discount = 0
    if (coupon.discountType === "percentage") {
        discount = (orderAmount * coupon.discountValue) / 100
        if (coupon.maxDiscountAmount) {
            discount = Math.min(discount, coupon.maxDiscountAmount)
        }
    } else {
        discount = coupon.discountValue
    }

    return res.status(200).json(
        new ApiResponse(200, {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discount: Math.round(discount),
            finalAmount: orderAmount - discount
        }, "Coupon is  valid ")
    )
})

// ✅ Admin - Get All Coupons
const getAllCoupons = asyncHandler(async (req, res) => {
    const coupons = await Coupon.find()
        .sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(200, coupons, "Coupons fetched successfully")
    )
})

// ✅ Admin - Create Coupon
const createCoupon = asyncHandler(async (req, res) => {
    const {
        code,
        description,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        expiryDate,
        usageLimit
    } = req.body

    // Required fields check
    if (!code || !discountType || !discountValue || !expiryDate) {
        throw new ApiError(400, "Sab required fields bharo")
    }

    // Already exists check
    const existing = await Coupon.findOne({
        code: code.toUpperCase()
    })

    if (existing) {
        throw new ApiError(409, "this coupon code already exists")
    }

    // Expiry future mein honi chahiye
    if (new Date(expiryDate) < new Date()) {
        throw new ApiError(400, "Expiry date must be in future")
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || 0,
        maxDiscountAmount: maxDiscountAmount || null,
        expiryDate,
        usageLimit: usageLimit || null
    })

    return res.status(201).json(
        new ApiResponse(201, coupon, "Coupon created successfully")
    )
})

// ✅ Admin - Update Coupon
const updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
    )

    if (!coupon) {
        throw new ApiError(404, "Coupon not found")
    }

    return res.status(200).json(
        new ApiResponse(200, coupon, "Coupon updated successfully")
    )
})

// ✅ Admin - Delete Coupon
const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id)

    if (!coupon) {
        throw new ApiError(404, "Coupon not found ")
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Coupon deleted successfully")
    )
})

// ✅ Admin - Toggle Active Status
const toggleCouponStatus = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id)

    if (!coupon) {
        throw new ApiError(404, "Coupon not found")
    }

    coupon.isActive = !coupon.isActive
    await coupon.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            coupon,
            `Coupon ${coupon.isActive ? "active" : "inactive"} ho gaya`
        )
    )
})

export {
    validateCoupon,
    getAllCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
}