import mongoose, { Schema } from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const addressSchema = new Schema({
    fullName:   { type: String, required: true },
    phone:      { type: String, required: true },
    street:     { type: String, required: true },
    city:       { type: String, required: true },
    province:   { type: String, required: true },
    postalCode: { type: String },
    country:    { type: String, default: "Pakistan" },
    isDefault:  { type: Boolean, default: false }
})

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required:[true,"username is required"],
            trim: true,
            unique: true,
            lowercase: true,
            index: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            unique: true,
            lowercase: true,
            index: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            required:[true,"rider will contact via phone number"]
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user"
        },
        avatar: {
            type: String,
            default: ""
        },
        // Future ke liye — abhi use nahi hoga
        avatarPublicId: {
            type: String,
            default: ""
        },
        addresses: [addressSchema],
        isActive: {
            type: Boolean,
            default: true
        },
        wishlist: [
            {
                type: Schema.Types.ObjectId,
                ref: "Book"
            }
        ],
        resetPasswordToken:  { type: String },
        resetPasswordExpiry: { type: Date },
        refreshToken:        { type: String }
    },
    { timestamps: true }
)

// ── Hooks ─────────────────────────────────────────────────────────────────────

// Hash password
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 12)
})

// Auto avatar from fullName
userSchema.pre("save", async function () {
    if (!this.isModified("fullName")) return
    if (!this.avatar) {
        const encodedName = this.fullName.split(" ").join("+")
        this.avatar = `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=128&bold=true&rounded=true`
    }
})

// ── Methods ───────────────────────────────────────────────────────────────────

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id:      this._id,
            email:    this.email,
            username: this.username,
            role:     this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const User = mongoose.model("User", userSchema)