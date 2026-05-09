import mongoose, { Schema } from "mongoose"

const couponSchema = new Schema(
    {
        code: {
            type: String,
            required: [true, "Coupon code is required"],
            unique: true,
            uppercase: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        discountType: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true
        },
        discountValue: {
            type: Number,
            required: true
        },
        minOrderAmount: {
            type: Number,
            default: 0
        },
        maxDiscountAmount: {
            type: Number,
            default: null
        },
        expiryDate: {
            type: Date,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        usageLimit: {
            type: Number,
            default: null
        },
        usedCount: {
            type: Number,
            default: 0
        },
        usedBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    { timestamps: true }
)

export const Coupon = mongoose.model("Coupon", couponSchema)