import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import ApiError from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

// ─── Constants ────────────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   7 * 24 * 60 * 60 * 1000,
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateAccessAndRefreshToken = async (userId) => {
    const user = await User.findById(userId)
    if (!user) throw new ApiError(404, "User not found")

    const accessToken  = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// POST /api/v1/users/register
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, username, phone, address } = req.body

    if (!fullName || !email || !password || !username || !phone || !address) {
        throw new ApiError(400, "All fields are required")
    }
 if(!address?.street || !address?.city ||!address?.province){
    throw new ApiError(400,"complete address is required")
 }
    if (!EMAIL_REGEX.test(email)) {
        throw new ApiError(400, "Invalid email format")
    }

    if (String(phone).length !== 11) {
        throw new ApiError(400, "Phone number must be exactly 11 digits")
    }

    if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters")
    }

    const existingUser = await User.findOne({
        $or: [
            { email:    email.toLowerCase()    },
            { username: username.toLowerCase() }
        ]
    })

    if (existingUser) {
        const conflictField =
            existingUser.email === email.toLowerCase() ? "email" : "username"
        throw new ApiError(
            409,
            `An account with this ${conflictField} already exists`
        )
    }

    const user = await User.create({
        fullName,
        email:    email.toLowerCase(),
        password,
        username: username.toLowerCase(),
        addresses: [
            {
                fullName,
                phone,
                street: address?.street || "",
                city: address?.city || "",
                province: address?.province || "",
                postalCode: address?.postalCode || "",
                country: address?.country || "Pakistan",
                isDefault: true
            }
        ],
        phone
    })

    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "User registration failed — please try again")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, "User registered successfully"))
})

// POST /api/v1/users/login
const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body

    if ((!email && !username) || !password) {
        throw new ApiError(400, "Email or username, and password are required")
    }

    const user = await User.findOne({
        $or: [
            ...(email    ? [{ email:    email.toLowerCase()    }] : []),
            ...(username ? [{ username: username.toLowerCase() }] : [])
        ]
    })

    if (!user) {
        throw new ApiError(404, "No account found — please register first")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials")

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    return res
        .status(200)
        .cookie("accessToken",  accessToken,  COOKIE_OPTIONS)
        .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, "Logged in successfully"))
})

// POST /api/v1/users/logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    )

    return res
        .status(200)
        .clearCookie("accessToken",  COOKIE_OPTIONS)
        .clearCookie("refreshToken", COOKIE_OPTIONS)
        .json(new ApiResponse(200, {}, "Logged out successfully"))
})

// POST /api/v1/users/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token required")
    }

    let decodedToken
    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token")
    }

    const user = await User.findById(decodedToken._id)

    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token mismatch — please log in again")
    }
    if(!user){
        throw new ApiError(401,"user not found")
    }

    if(!user.isActive){
        throw new ApiError(403,"account banned")
    }

    if(user.refreshToken !== incomingRefreshToken){
        await generateAccessAndRefreshToken(user._id)
    }

    const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessAndRefreshToken(user._id)

    return res
        .status(200)
        .cookie("accessToken",  accessToken,     COOKIE_OPTIONS)
        .cookie("refreshToken", newRefreshToken,  COOKIE_OPTIONS)
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed"))
})

// POST /api/v1/users/change-password
const changeUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both passwords are required")
    }

    const user = await User.findById(req.user?._id)
    if (!user) throw new ApiError(404, "User not found")

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password")
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters")
    }

    user.password = newPassword
    await user.save()

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

// GET /api/v1/users/current-user
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

// ─── Profile ──────────────────────────────────────────────────────────────────

// PATCH /api/v1/users/update-profile
const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, phone, username } = req.body

    if (!fullName && !phone && !username) {
        throw new ApiError(400, "At least one field is required")
    }

    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, "User not found")

    // Username uniqueness check
    if (username && username.toLowerCase() !== user.username) {
        const existingUsername = await User.findOne({
            username: username.toLowerCase()
        })
        if (existingUsername) {
            throw new ApiError(409, "Username already taken")
        }
        user.username = username.toLowerCase()
    }

    if (fullName) user.fullName = fullName

    if (phone) {
        if (String(phone).length !== 11) {
            throw new ApiError(400, "Phone number must be exactly 11 digits")
        }
        user.phone = phone
    }

    await user.save()

    const updatedUser = await User.findById(user._id)
        .select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"))
})

// ─── Addresses ────────────────────────────────────────────────────────────────

// GET /api/v1/users/addresses
const getAddresses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("addresses")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user.addresses,
            "Addresses fetched successfully"
        ))
})

// POST /api/v1/users/addresses
const addAddress = asyncHandler(async (req, res) => {
    const {
        fullName, phone, street,
        city, province, postalCode,
        country, isDefault
    } = req.body

    if (!fullName || !phone || !street || !city || !province) {
        throw new ApiError(
            400,
            "fullName, phone, street, city and province are required"
        )
    }

    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, "User not found")

    if (user.addresses.length >= 5) {
        throw new ApiError(400, "Maximum 5 addresses allowed")
    }

    // Agar isDefault true hai toh baaki sab false karo
    if (isDefault) {
        user.addresses.forEach(addr => (addr.isDefault = false))
    }

    // Pehla address automatically default
    const shouldBeDefault = user.addresses.length === 0 ? true : !!isDefault

    user.addresses.push({
        fullName,
        phone,
        street,
        city,
        province,
        postalCode,
        country:   country || "Pakistan",
        isDefault: shouldBeDefault
    })

    await user.save()

    return res
        .status(201)
        .json(new ApiResponse(
            201,
            user.addresses,
            "Address added successfully"
        ))
})

// PATCH /api/v1/users/addresses/:addressId
const updateAddress = asyncHandler(async (req, res) => {
    const {
        fullName, phone, street,
        city, province, postalCode,
        country, isDefault
    } = req.body

    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, "User not found")

    const address = user.addresses.id(req.params.addressId)
    if (!address) throw new ApiError(404, "Address not found")

    if (isDefault) {
        user.addresses.forEach(addr => (addr.isDefault = false))
    }

    if (fullName   !== undefined) address.fullName   = fullName
    if (phone      !== undefined) address.phone      = phone
    if (street     !== undefined) address.street     = street
    if (city       !== undefined) address.city       = city
    if (province   !== undefined) address.province   = province
    if (postalCode !== undefined) address.postalCode = postalCode
    if (country    !== undefined) address.country    = country
    if (isDefault  !== undefined) address.isDefault  = isDefault

    await user.save()

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user.addresses,
            "Address updated successfully"
        ))
})

// DELETE /api/v1/users/addresses/:addressId
const deleteAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, "User not found")

    const address = user.addresses.id(req.params.addressId)
    if (!address) throw new ApiError(404, "Address not found")

    const wasDefault = address.isDefault
    address.deleteOne()

    // Agar default address delete hua toh pehle wale ko default banao
    if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true
    }

    await user.save()

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user.addresses,
            "Address deleted successfully"
        ))
})

// PATCH /api/v1/users/addresses/:addressId/set-default
const setDefaultAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, "User not found")

    const address = user.addresses.id(req.params.addressId)
    if (!address) throw new ApiError(404, "Address not found")

    user.addresses.forEach(addr => (addr.isDefault = false))
    address.isDefault = true

    await user.save()

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user.addresses,
            "Default address updated"
        ))
})

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
    // Auth
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    // Profile
    updateProfile,
    // Addresses
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
}