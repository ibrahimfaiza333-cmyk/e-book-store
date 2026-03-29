import { Router } from "express"
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// ── Public ────────────────────────────────────────────
router.post("/register",      registerUser)
router.post("/login",         loginUser)
router.post("/refresh-token", refreshAccessToken)

// ── Auth Protected ────────────────────────────────────
router.post("/logout",          verifyJWT, logoutUser)
router.post("/change-password", verifyJWT, changeUserPassword)
router.get("/current-user",     verifyJWT, getCurrentUser)
router.patch("/update-profile", verifyJWT, updateProfile)

// ── Addresses ─────────────────────────────────────────
router.get("/addresses",    verifyJWT, getAddresses)
router.post("/addresses",   verifyJWT, addAddress)
router.patch(
    "/addresses/:addressId",
    verifyJWT,
    updateAddress
)
router.delete(
    "/addresses/:addressId",
    verifyJWT,
    deleteAddress
)
router.patch(
    "/addresses/:addressId/set-default",
    verifyJWT,
    setDefaultAddress
)

export default router