import mongoose, { Schema } from "mongoose"

const reviewSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true,
            default: ""
        }
    },
    { timestamps: true }
)

const bookSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Book title is required"],
            trim: true,
            index: true
        },
        author: {
            type: String,
            required: [true, "Author is required"],
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"]
        },
        discountPrice: {
            type: Number,
            default: 0,
            min: 0
        },
        stock: {
            type: Number,
            required: [true, "Stock is required"],
            min: [0, "Stock cannot be negative"],
            default: 0
        },
        isbn: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        language: {
            type: String,
            enum: ["English", "Urdu"],
            default: "English"
        },
        pages: {
            type: Number,
            min: 1
        },
        publisher: {
            type: String,
            trim: true,
            default: ""
        },
        publishedYear: {
            type: Number
        },

        // ── Images ───────────────────────────────────────
        coverImage: {
            type: String,
            default: ""
        },
        coverImagePublicId: {
            type: String,
            default: ""
        },
        images: [
            {
                url:      { type: String },
                publicId: { type: String }
            }
        ],

        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Category is required"]
        },

        // ──  Features ───────────────────────────
        isFeatured: {
            type: Boolean,
            default: false
        },
        isBestseller: {
            type: Boolean,
            default: false
        },
        isPreOrder: {
            type: Boolean,
            default: false
        },
        dealEndsAt: {
            type: Date,
            default: null
        },
        tags: [
            {
                type: String,
                enum: [
                    "trending",
                    "new-arrival",
                    "deals",
                    "recommended",
                    "top-rated"
                ]
            }
        ],

        // ── Reviews ──────────────────────────────────────
        reviews: [reviewSchema],
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
)

// Recalculate averageRating when reviews change
bookSchema.pre("save", async function () {
    if (!this.isModified("reviews")) return
    if (this.reviews.length === 0) {
        this.averageRating = 0
        this.totalReviews  = 0
        return
    }
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0)
    this.averageRating = parseFloat((sum / this.reviews.length).toFixed(1))
    this.totalReviews  = this.reviews.length
})

export const Book = mongoose.model("Book", bookSchema)