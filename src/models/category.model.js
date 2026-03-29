import mongoose, { Schema } from "mongoose"

const categorySchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Category name is required"],
            trim: true,
            unique: true,
            index: true
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        image: {
            type: String,
            default: ""
        },
        imagePublicId: {
            type: String,
            default: ""
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
)

categorySchema.pre("save", async function () {
    if (!this.isModified("name")) return
    this.slug = this.name.trim().toLowerCase().replace(/\s+/g, "-")
})

export const Category = mongoose.model("Category", categorySchema)