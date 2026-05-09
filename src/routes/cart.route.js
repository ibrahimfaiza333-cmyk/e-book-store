import { Router } from "express"
import {
    getCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
} from "../controllers/cart.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Sab cart routes protected hain
router.use(verifyJWT)

router.get("/",                 getCart)
router.post("/add",             addToCart)
router.patch("/update",         updateQuantity)
router.delete("/remove/:bookId",removeFromCart)
router.delete("/clear",         clearCart)

export default Router