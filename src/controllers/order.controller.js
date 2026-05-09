import { asyncHandler } from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"              // ✅ fixed
import { ApiResponse } from "../utils/ApiResponse.js"
import { Order } from "../models/order.model.js"
import { Cart } from "../models/cart.model.js"
import { Book } from "../models/books.model.js"           // ✅ fixed
import { Coupon } from "../models/coupon.model.js"

const FREE_DELIVERY_THRESHOLD = 3000                     // ✅ fixed
const DELIVERY_CHARGES = 200

// ✅ Place Order
const createOrder = asyncHandler(async (req, res) => {
    const { shippingAddress, paymentMethod, couponCode, note } = req.body

    if (
        !shippingAddress?.fullName ||
        !shippingAddress?.phone    ||
        !shippingAddress?.street   ||
        !shippingAddress?.city     ||
        !shippingAddress?.province
    ) {
        throw new ApiError(400, "Complete shipping address is required")
    }

    const cart = await Cart.findOne({ user: req.user._id })
        .populate("items.book")

    if (!cart || cart.items.length === 0) {
        throw new ApiError(400, "Cart is empty")
    }

    // Stock check
    for (const item of cart.items) {
        if (!item.book) {
            throw new ApiError(404, "Book not found")
        }
        if (item.book.stock < item.quantity) {
            throw new ApiError(
                400,
                `${item.book.title} mein sirf ${item.book.stock} copies available hain`
            )
        }
    }

    // Order items
    const orderItems = cart.items.map(item => ({
        book:       item.book._id,
        quantity:   item.quantity,
        price:      item.book.discountPrice > 0
                        ? item.book.discountPrice
                        : item.book.price,
        title:      item.book.title,
        coverImage: item.book.coverImage || ""
    }))

    // Total
    let totalAmount = orderItems.reduce(
        (total, item) => total + item.price * item.quantity, 0
    )

    // Delivery charges
    let deliveryCharges = totalAmount >= FREE_DELIVERY_THRESHOLD
        ? 0
        : DELIVERY_CHARGES

    // Coupon
    let discount      = 0
    let appliedCoupon = ""

    if (couponCode) {
        const coupon = await Coupon.findOne({
            code:     couponCode.toUpperCase(),
            isActive: true
        })

        if (!coupon) throw new ApiError(400, "Invalid coupon code")

        if (coupon.expiryDate < new Date()) {
            throw new ApiError(400, "Coupon expired")
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new ApiError(400, "Coupon usage limit reached")
        }

        if (coupon.usedBy.includes(req.user._id)) {
            throw new ApiError(400, "You have already used this coupon")
        }

        if (totalAmount < coupon.minOrderAmount) {
            throw new ApiError(
                400,
                `Minimum order amount must be Rs.${coupon.minOrderAmount}`
            )
        }

        if (coupon.discountType === "percentage") {
            discount = (totalAmount * coupon.discountValue) / 100
            if (coupon.maxDiscountAmount) {
                discount = Math.min(discount, coupon.maxDiscountAmount)
            }
        } else {
            discount = coupon.discountValue
        }

        appliedCoupon = couponCode.toUpperCase()

        await Coupon.findByIdAndUpdate(coupon._id, {
            $inc:  { usedCount: 1 },
            $push: { usedBy: req.user._id }
        })
    }

    const finalAmount = totalAmount + deliveryCharges - discount

    // Order create
    const order = await Order.create({
        user:            req.user._id,
        items:           orderItems,
        shippingAddress: {
            ...shippingAddress,
            country: shippingAddress.country || "Pakistan"
        },
        totalAmount,
        deliveryCharges,
        discount,
        couponCode:    appliedCoupon,
        finalAmount,
        paymentMethod: paymentMethod || "cod",
        note:          note || ""
    })

    // Stock reduce
    for (const item of cart.items) {
        await Book.findByIdAndUpdate(
            item.book._id,
            { $inc: { stock: -item.quantity } }
        )
    }

    // Cart clear        ✅ fixed
    await Cart.findOneAndUpdate(
        { user: req.user._id },
        { items: [], totalAmount: 0, totalItems: 0 }
    )

    return res.status(201).json(
        new ApiResponse(201, order, "Order placed successfully!")
    )
})

// ✅ Get My Orders
const getMyOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query

    const filter = { user: req.user._id }
    if (status) filter.orderStatus = status

    const skip = (Number(page) - 1) * Number(limit)

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .sort("-createdAt")
            .skip(skip)
            .limit(Number(limit)),
        Order.countDocuments(filter)
    ])

    return res.status(200).json(
        new ApiResponse(200, {
            orders,
            total,
            page:       Number(page),
            totalPages: Math.ceil(total / Number(limit))
        }, "Orders fetched successfully")
    )
})

// ✅ Get Single Order
const getSingleOrder = asyncHandler(async (req, res) => {
    const order = await Order.findOne({
        _id:  req.params.id,
        user: req.user._id
    }).populate("items.book", "title coverImage")

    if (!order) throw new ApiError(404, "Order not found")

    return res.status(200).json(
        new ApiResponse(200, order, "Order fetched successfully")
    )
})

// ✅ Cancel Order
const cancelOrder = asyncHandler(async (req, res) => {
    const { cancelReason } = req.body

    const order = await Order.findOne({
        _id:  req.params.id,
        user: req.user._id
    })

    if (!order) throw new ApiError(404, "Order not found")

    if (!["pending", "confirmed"].includes(order.orderStatus)) {
        throw new ApiError(
            400,
            "Order cannot be cancelled — already shipped or delivered"
        )
    }

    // Stock wapas karo
    for (const item of order.items) {
        await Book.findByIdAndUpdate(
            item.book,
            { $inc: { stock: item.quantity } }
        )
    }

    order.orderStatus  = "cancelled"
    order.cancelReason = cancelReason || "Cancelled by user"
    order.cancelledAt  = new Date()   // ✅ Order model mein add karna hoga
    await order.save()

    return res.status(200).json(
        new ApiResponse(200, order, "Order cancelled successfully")
    )
})

// ✅ Track Order
const trackOrder = asyncHandler(async (req, res) => {
    const order = await Order.findOne({
        _id:  req.params.id,
        user: req.user._id
    }).select("orderNumber orderStatus paymentStatus createdAt updatedAt")

    if (!order) throw new ApiError(404, "Order not found")

    const trackingSteps = [
        {
            step:        "pending",
            title:       "Order Placed",
            description: "Your order has been placed successfully",
            completed:   true
        },
        {
            step:        "confirmed",
            title:       "Order Confirmed",
            description: "Your order has been confirmed",
            completed:   ["confirmed", "processing", "shipped", "delivered"]
                            .includes(order.orderStatus)
        },
        {
            step:        "processing",
            title:       "Processing",
            description: "Your order is being packed",
            completed:   ["processing", "shipped", "delivered"]
                            .includes(order.orderStatus)
        },
        {
            step:        "shipped",
            title:       "Shipped",
            description: "Your order is on the way",
            completed:   ["shipped", "delivered"]
                            .includes(order.orderStatus)
        },
        {
            step:        "delivered",
            title:       "Delivered",
            description: "Your order has been delivered",
            completed:   order.orderStatus === "delivered"
        }
    ]

    return res.status(200).json(
        new ApiResponse(200, { order, trackingSteps },
        "Order tracking fetched successfully")
    )
})

// ✅ Admin — Get All Orders
const getAllOrders = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 10,
        orderStatus, paymentStatus, paymentMethod
    } = req.query

    const filter = {}
    if (orderStatus)   filter.orderStatus   = orderStatus
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (paymentMethod) filter.paymentMethod = paymentMethod

    const skip = (Number(page) - 1) * Number(limit)

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate("user", "fullName email phone")
            .sort("-createdAt")
            .skip(skip)
            .limit(Number(limit)),
        Order.countDocuments(filter)
    ])

    return res.status(200).json(
        new ApiResponse(200, {
            orders,
            total,
            page:       Number(page),
            totalPages: Math.ceil(total / Number(limit))
        }, "All orders fetched successfully")
    )
})

// ✅ Admin — Update Order Status
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderStatus } = req.body

    const validStatuses = [
        "pending", "confirmed", "processing",
        "shipped", "delivered", "cancelled"
    ]

    if (!validStatuses.includes(orderStatus)) {
        throw new ApiError(400, "Invalid order status")
    }

    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, "Order not found")

    order.orderStatus = orderStatus

    if (orderStatus === "delivered") {
        order.isDelivered   = true
        order.deliveredAt   = new Date()
        order.paymentStatus = "paid"
        order.isPaid        = true
        order.paidAt        = new Date()
    }

    if (orderStatus === "cancelled") {
        for (const item of order.items) {
            await Book.findByIdAndUpdate(
                item.book,
                { $inc: { stock: item.quantity } }
            )
        }
    }

    await order.save()

    return res.status(200).json(
        new ApiResponse(200, order, "Order status updated successfully")
    )
})

export {
    createOrder,
    getMyOrders,
    getSingleOrder,
    cancelOrder,
    trackOrder,
    getAllOrders,
    updateOrderStatus
}