import mongoose, { Schema } from "mongoose"

const orderItemSchema = new Schema({
    book: {
        type: Schema.Types.ObjectId,
        ref: "Book",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true  // price at time of order
    },
    title: {
        type: String,
        required: true  // book title at time of order
    },
    coverImage: {
        type: String,
        default: ""
    }
})

const orderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        orderNumber: {
            type: String,
            unique: true
        },
        items: [orderItemSchema],
        shippingAddress: {
            fullName:   { type: String, required: true },
            phone:      { type: String, required: true },
            street:     { type: String, required: true },
            city:       { type: String, required: true },
            province:   { type: String, required: true },
            postalCode: { type: String },
            country:    { type: String, default: "Pakistan" }
        },
        totalAmount: {
            type: Number,
            required: true
        },
        deliveryCharges: {
            type: Number,
            default: 0
        },
        finalAmount: {
            type: Number,
            required: true
        },
        couponCode: {
            type: String,
            default: ""
        },
        discount: {
            type: Number,
            default: 0
        },
        paymentMethod: {
            type: String,
            enum: ["cod", "jazzcash", "easypaisa"],
            default: "cod"
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending"
        },
        orderStatus: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled"
            ],
            default: "pending"
        },
        isPaid:      { type: Boolean, default: false },
        paidAt:      { type: Date },
        isDelivered: { type: Boolean, default: false },
        deliveredAt: { type: Date },
        cancelReason: {
            type: String,
            default: ""
        },
        note: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
)

// Auto generate order number
orderSchema.pre("save", async function () {
    if (!this.isNew) return
    const timestamp = Date.now().toString().slice(-6)
    const random    = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
    this.orderNumber = `BV-${timestamp}-${random}`
})

export const Order = mongoose.model("Order", orderSchema)