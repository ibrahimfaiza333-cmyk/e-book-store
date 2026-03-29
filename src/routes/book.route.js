import { Router } from "express"
import {
    createBook, getAllBooks, getBookById,
    updateBook, deleteBook,
    getFeaturedBooks, getDealsBooks,
    getPreOrderBooks, getTopRatedBooks,
    getBooksByTag,
    addReview, editReview, deleteReview
} from "../controllers/book.controller.js"
import { verifyJWT }   from "../middlewares/auth.middleware.js"
import { verifyAdmin } from "../middlewares/admin.middleware.js"
import { upload }      from "../middlewares/multer.middleware.js"

const router = Router()

const bookImageUpload = upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "images",     maxCount: 5 }
])

// ── Public ────────────────────────────────────────────
router.get("/featured",  getFeaturedBooks)
router.get("/deals",     getDealsBooks)
router.get("/preorder",  getPreOrderBooks)
router.get("/top-rated", getTopRatedBooks)
router.get("/tag/:tag",  getBooksByTag)
router.get("/",          getAllBooks)
router.get("/:id",       getBookById)

// ── Admin only ────────────────────────────────────────
router.post("/",     verifyJWT, verifyAdmin, bookImageUpload, createBook)
router.patch("/:id", verifyJWT, verifyAdmin, bookImageUpload, updateBook)
router.delete("/:id",verifyJWT, verifyAdmin, deleteBook)

// ── Reviews ───────────────────────────────────────────
router.post("/:id/reviews",             verifyJWT, addReview)
router.patch("/:id/reviews/:reviewId",  verifyJWT, editReview)
router.delete("/:id/reviews/:reviewId", verifyJWT, deleteReview)

export default router