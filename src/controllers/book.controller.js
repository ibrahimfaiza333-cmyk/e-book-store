import { asyncHandler } from "../utils/asyncHandler.js"
import { Book } from "../models/books.model.js"
import { Category } from "../models/category.model.js"
import ApiError from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {
    uploadOnCloudinary,
    deleteFromCloudinary
} from "../utils/cloudinary.js"

// ─── Book CRUD ────────────────────────────────────────────────────────────────

// POST /api/v1/books
const createBook = asyncHandler(async (req, res) => {
    const {
        title, author, description, price, discountPrice,
        stock, isbn, language, pages, publisher,
        publishedYear, category, isFeatured,
        isBestseller, isPreOrder, dealEndsAt, tags
    } = req.body

    if (!title || !author || !price || stock === undefined || !category) {
        throw new ApiError(400, "Title, author, price, stock and category are required")
    }

    const categoryExists = await Category.findById(category)
    if (!categoryExists || !categoryExists.isActive) {
        throw new ApiError(404, "Category not found")
    }

    // Cover image upload
    let coverImage        = ""
    let coverImagePublicId = ""

    if (req.files?.coverImage?.[0]?.path) {
        const uploaded = await uploadOnCloudinary(req.files.coverImage[0].path)
        if (!uploaded) throw new ApiError(500, "Cover image upload failed")
        coverImage         = uploaded.secure_url
        coverImagePublicId = uploaded.public_id
    }

    // Multiple images upload
    let images = []
    if (req.files?.images?.length) {
        for (const file of req.files.images) {
            const uploaded = await uploadOnCloudinary(file.path)
            if (uploaded) {
                images.push({
                    url:      uploaded.secure_url,
                    publicId: uploaded.public_id
                })
            }
        }
    }

    const book = await Book.create({
        title, author, description, price, discountPrice,
        stock, isbn, language, pages, publisher,
        publishedYear, coverImage, coverImagePublicId,
        images, category, isFeatured, isBestseller,
        isPreOrder, dealEndsAt, tags
    })

    return res
        .status(201)
        .json(new ApiResponse(201, book, "Book created successfully"))
})

// GET /api/v1/books
const getAllBooks = asyncHandler(async (req, res) => {
    const {
        page     = 1,
        limit    = 10,
        search,
        category,
        language,
        minPrice,
        maxPrice,
        sort     = "-createdAt"
    } = req.query

    const filter = { isActive: true }

    if (search) {
        filter.$or = [
            { title:  { $regex: search, $options: "i" } },
            { author: { $regex: search, $options: "i" } }
        ]
    }

    if (category) filter.category = category
    if (language) filter.language = language

    if (minPrice || maxPrice) {
        filter.price = {}
        if (minPrice) filter.price.$gte = Number(minPrice)
        if (maxPrice) filter.price.$lte = Number(maxPrice)
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [books, total] = await Promise.all([
        Book.find(filter)
            .populate("category", "name slug")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit)),
        Book.countDocuments(filter)
    ])

    return res.status(200).json(
        new ApiResponse(200, {
            books,
            total,
            page:       Number(page),
            totalPages: Math.ceil(total / Number(limit))
        }, "Books fetched successfully")
    )
})

// GET /api/v1/books/:id
const getBookById = asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id)
        .populate("category", "name slug")
        .populate("reviews.user", "fullName avatar")

    if (!book || !book.isActive) {
        throw new ApiError(404, "Book not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, book, "Book fetched successfully"))
})

// PATCH /api/v1/books/:id
const updateBook = asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id)
    if (!book) throw new ApiError(404, "Book not found")

    // Cover image update
    if (req.files?.coverImage?.[0]?.path) {
        if (book.coverImagePublicId) {
            await deleteFromCloudinary(book.coverImagePublicId)
        }
        const uploaded = await uploadOnCloudinary(req.files.coverImage[0].path)
        if (!uploaded) throw new ApiError(500, "Cover image upload failed")
        book.coverImage         = uploaded.secure_url
        book.coverImagePublicId = uploaded.public_id
    }

    // Extra images update
    if (req.files?.images?.length) {
        // Purani images delete karo
        for (const img of book.images) {
            if (img.publicId) {
                await deleteFromCloudinary(img.publicId)
            }
        }
        // Nai images upload karo
        book.images = []
        for (const file of req.files.images) {
            const uploaded = await uploadOnCloudinary(file.path)
            if (uploaded) {
                book.images.push({
                    url:      uploaded.secure_url,
                    publicId: uploaded.public_id
                })
            }
        }
    }

    const allowedFields = [
        "title", "author", "description", "price", "discountPrice",
        "stock", "isbn", "language", "pages", "publisher",
        "publishedYear", "category", "isFeatured", "isBestseller",
        "isPreOrder", "dealEndsAt", "tags", "isActive"
    ]

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            book[field] = req.body[field]
        }
    })

    await book.save()

    return res
        .status(200)
        .json(new ApiResponse(200, book, "Book updated successfully"))
})

// DELETE /api/v1/books/:id
const deleteBook = asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id)
    if (!book) throw new ApiError(404, "Book not found")

    // Cloudinary se images delete karo
    if (book.coverImagePublicId) {
        await deleteFromCloudinary(book.coverImagePublicId)
    }
    for (const img of book.images) {
        if (img.publicId) await deleteFromCloudinary(img.publicId)
    }

    book.isActive = false
    await book.save()

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Book deleted successfully"))
})

// ─── Special Sections ─────────────────────────────────────────────────────────

// GET /api/v1/books/featured
const getFeaturedBooks = asyncHandler(async (req, res) => {
    const books = await Book.find({ isFeatured: true, isActive: true })
        .populate("category", "name slug")
        .sort("-createdAt")
        .limit(10)

    return res
        .status(200)
        .json(new ApiResponse(200, books, "Featured books fetched successfully"))
})

// GET /api/v1/books/deals
const getDealsBooks = asyncHandler(async (req, res) => {
    const now = new Date()

    const books = await Book.find({
        isActive:      true,
        discountPrice: { $gt: 0 },
        $or: [
            { dealEndsAt: null },
            { dealEndsAt: { $gt: now } }
        ]
    })
        .populate("category", "name slug")
        .sort("-discountPrice")
        .limit(20)

    return res
        .status(200)
        .json(new ApiResponse(200, books, "Deal books fetched successfully"))
})

// GET /api/v1/books/preorder
const getPreOrderBooks = asyncHandler(async (req, res) => {
    const books = await Book.find({ isPreOrder: true, isActive: true })
        .populate("category", "name slug")
        .sort("-createdAt")

    return res
        .status(200)
        .json(new ApiResponse(200, books, "Pre-order books fetched successfully"))
})

// GET /api/v1/books/top-rated
const getTopRatedBooks = asyncHandler(async (req, res) => {
    const books = await Book.find({
        isActive:     true,
        totalReviews: { $gt: 0 }
    })
        .populate("category", "name slug")
        .sort("-averageRating -totalReviews")
        .limit(10)

    return res
        .status(200)
        .json(new ApiResponse(200, books, "Top rated books fetched successfully"))
})

// GET /api/v1/books/tag/:tag
const getBooksByTag = asyncHandler(async (req, res) => {
    const validTags = [
        "trending", "new-arrival", "deals",
        "ramadan", "recommended", "top-rated"
    ]

    if (!validTags.includes(req.params.tag)) {
        throw new ApiError(400, "Invalid tag")
    }

    const books = await Book.find({
        tags:     req.params.tag,
        isActive: true
    })
        .populate("category", "name slug")
        .sort("-createdAt")

    return res
        .status(200)
        .json(new ApiResponse(200, books, `${req.params.tag} books fetched`))
})

// ─── Reviews ──────────────────────────────────────────────────────────────────

// POST /api/v1/books/:id/reviews
const addReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body

    if (!rating) throw new ApiError(400, "Rating is required")
    if (rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5")
    }

    const book = await Book.findById(req.params.id)
    if (!book || !book.isActive) throw new ApiError(404, "Book not found")

    const alreadyReviewed = book.reviews.find(
        r => r.user.toString() === req.user._id.toString()
    )
    if (alreadyReviewed) {
        throw new ApiError(409, "You have already reviewed this book")
    }

    book.reviews.push({ user: req.user._id, rating, comment })
    await book.save()

    return res
        .status(201)
        .json(new ApiResponse(201, book, "Review added successfully"))
})

// PATCH /api/v1/books/:id/reviews/:reviewId
const editReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body

    const book = await Book.findById(req.params.id)
    if (!book || !book.isActive) throw new ApiError(404, "Book not found")

    const review = book.reviews.id(req.params.reviewId)
    if (!review) throw new ApiError(404, "Review not found")

    if (review.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only edit your own review")
    }

    if (rating) {
        if (rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating must be between 1 and 5")
        }
        review.rating = rating
    }
    if (comment !== undefined) review.comment = comment

    await book.save()

    return res
        .status(200)
        .json(new ApiResponse(200, book, "Review updated successfully"))
})

// DELETE /api/v1/books/:id/reviews/:reviewId
const deleteReview = asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id)
    if (!book || !book.isActive) throw new ApiError(404, "Book not found")

    const review = book.reviews.id(req.params.reviewId)
    if (!review) throw new ApiError(404, "Review not found")

    if (
        review.user.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
    ) {
        throw new ApiError(403, "You can only delete your own review")
    }

    review.deleteOne()
    await book.save()

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Review deleted successfully"))
})

export {
    createBook, getAllBooks, getBookById,
    updateBook, deleteBook,
    getFeaturedBooks, getDealsBooks,
    getPreOrderBooks, getTopRatedBooks,
    getBooksByTag,
    addReview, editReview, deleteReview
}