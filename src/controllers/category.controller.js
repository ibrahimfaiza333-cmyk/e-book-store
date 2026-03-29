import { asyncHandler } from "../utils/asyncHandler.js"
import { Category } from "../models/category.model.js"
import ApiError from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

// POST /api/v1/categories
const createCategory = asyncHandler(async (req, res) => {
    const { name, description, image } = req.body

    if (!name) {
        throw new ApiError(400, "Category name is required")
    }

    const existing = await Category.findOne({ 
        name: name.toLowerCase().trim() 
    })
    if (existing) {
        throw new ApiError(409, "Category already exists")
    }

    const category = await Category.create({ name, description, image })

    return res
        .status(201)
        .json(new ApiResponse(201, category, "Category created successfully"))
})

// GET /api/v1/categories
const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({ isActive: true })
        .sort({ name: 1 })

    return res
        .status(200)
        .json(new ApiResponse(200, categories, "Categories fetched successfully"))
})

// GET /api/v1/categories/:id
const getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)

    if (!category || !category.isActive) {
        throw new ApiError(404, "Category not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, category, "Category fetched successfully"))
})

// GET /api/v1/categories/slug/:slug
const getCategoryBySlug = asyncHandler(async (req, res) => {
    const category = await Category.findOne({ 
        slug: req.params.slug, 
        isActive: true 
    })

    if (!category) {
        throw new ApiError(404, "Category not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, category, "Category fetched successfully"))
})

// PATCH /api/v1/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, image, isActive } = req.body

    const category = await Category.findById(req.params.id)
    if (!category) {
        throw new ApiError(404, "Category not found")
    }

    if (name) category.name = name
    if (description !== undefined) category.description = description
    if (image !== undefined) category.image = image
    if (isActive !== undefined) category.isActive = isActive

    await category.save()

    return res
        .status(200)
        .json(new ApiResponse(200, category, "Category updated successfully"))
})

// DELETE /api/v1/categories/:id  (soft delete)
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)

    if (!category) {
        throw new ApiError(404, "Category not found")
    }

    category.isActive = false
    await category.save()

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Category deleted successfully"))
})

export { 
    createCategory, 
    getAllCategories, 
    getCategoryById,
    getCategoryBySlug,
    updateCategory, 
    deleteCategory 
}