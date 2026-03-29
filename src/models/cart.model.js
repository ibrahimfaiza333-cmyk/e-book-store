import mongoose, { Schema } from "mongoose"

const cartItemSchema = new Schema({
    book: {
        type: Schema.Types.ObjectId,
        ref: "Book",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"],
        default: 1
    },
    price: {
        type: Number,
        required: true
    }
})

const cartSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true  // ek user ka ek hi cart
        },
        items: [cartItemSchema],
        totalAmount: {
            type: Number,
            default: 0
        },
        totalItems: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
)

// Total calculate karo automatically
cartSchema.pre("save", async function () {
    if (!this.isModified("items")) return

    this.totalAmount = this.items.reduce(
        (acc, item) => acc + item.price * item.quantity, 0
    )
    this.totalItems = this.items.reduce(
        (acc, item) => acc + item.quantity, 0
    )
})

export const Cart = mongoose.model("Cart", cartSchema)