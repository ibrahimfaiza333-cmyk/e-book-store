import { Router } from "express"
import {
    createCategory, getAllCategories,
    getCategoryById, getCategoryBySlug,
    updateCategory, deleteCategory
} from "../controllers/category.controller.js"
import { verifyJWT }   from "../middlewares/auth.middleware.js"
import { verifyAdmin } from "../middlewares/admin.middleware.js"
import { upload }      from "../middlewares/multer.middleware.js"

const router = Router()

// ── Public ────────────────────────────────────────────
router.get("/",             getAllCategories)
router.get("/slug/:slug",   getCategoryBySlug)
router.get("/:id",          getCategoryById)

// ── Admin only ────────────────────────────────────────
router.post("/",     verifyJWT, verifyAdmin, upload.single("image"), createCategory)
router.patch("/:id", verifyJWT, verifyAdmin, upload.single("image"), updateCategory)
router.delete("/:id",verifyJWT, verifyAdmin, deleteCategory)

export default router