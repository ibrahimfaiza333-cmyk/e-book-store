import { asyncHandler } from "../utils/asyncHandler.js"
import { Cart }  from "../models/cart.model.js"
import { Book }  from "../models/books.model.js"
import ApiError  from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const FREE_DELIVERY_THRESHOLD = 3000

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateDelivery = (totalAmount) => {
    return totalAmount >= FREE_DELIVERY_THRESHOLD ? 0 : 200
}

// ─── Controllers ──────────────────────────────────────────────────────────────

// GET /api/v1/cart
const getCart = asyncHandler(async (req, res) => {
    let cart = await Cart.findOne({ user: req.user._id })
        .populate("items.book", "title coverImage price discountPrice stock isActive")

    // Agar cart nahi hai toh empty cart return karo
    if (!cart) {
        return res.status(200).json(
            new ApiResponse(200, {
                items:           [],
                totalAmount:     0,
                totalItems:      0,
                deliveryCharges: 200,
                finalAmount:     200,
                freeDeliveryOn:  FREE_DELIVERY_THRESHOLD
            }, "Cart is empty")
        )
    }

    const deliveryCharges = calculateDelivery(cart.totalAmount)

    return res.status(200).json(
        new ApiResponse(200, {
            items:           cart.items,
            totalAmount:     cart.totalAmount,
            totalItems:      cart.totalItems,
            deliveryCharges,
            finalAmount:     cart.totalAmount + deliveryCharges,
            freeDeliveryOn:  FREE_DELIVERY_THRESHOLD,
            isFreeDelivery:  deliveryCharges === 0
        }, "Cart fetched successfully")
    )
})

// POST /api/v1/cart/add
const addToCart = asyncHandler(async (req, res) => {
    const { bookId, quantity = 1 } = req.body

    if (!bookId) {
        throw new ApiError(400, "Book ID is required")
    }

    if (quantity < 1) {
        throw new ApiError(400, "Quantity must be at least 1")
    }

    // Book check karo
    const book = await Book.findById(bookId)
    if (!book || !book.isActive) {
        throw new ApiError(404, "Book not found")
    }

    // Stock check karo
    if (book.stock < quantity) {
        throw new ApiError(400, `Only ${book.stock} items left in stock`)
    }

    // Price — discountPrice ho toh wo use karo
    const price = book.discountPrice > 0 ? book.discountPrice : book.price

    // Cart find karo ya naya banao
    let cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
        cart = await Cart.create({
            user:  req.user._id,
            items: []
        })
    }

    // Check karo book pehle se cart mein hai
    const existingItem = cart.items.find(
        item => item.book.toString() === bookId
    )

    if (existingItem) {
        // Quantity update karo
        const newQuantity = existingItem.quantity + quantity

        // Stock check
        if (book.stock < newQuantity) {
            throw new ApiError(
                400,
                `Only ${book.stock} items available. You already have ${existingItem.quantity} in cart`
            )
        }
        existingItem.quantity = newQuantity
    } else {
        // Naya item add karo
        cart.items.push({ book: bookId, quantity, price })
    }

    await cart.save()

    // Populate karke return karo
    await cart.populate("items.book", "title coverImage price discountPrice stock")

    const deliveryCharges = calculateDelivery(cart.totalAmount)

    return res.status(200).json(
        new ApiResponse(200, {
            items:           cart.items,
            totalAmount:     cart.totalAmount,
            totalItems:      cart.totalItems,
            deliveryCharges,
            finalAmount:     cart.totalAmount + deliveryCharges,
            isFreeDelivery:  deliveryCharges === 0
        }, "Item added to cart successfully")
    )
})

// PATCH /api/v1/cart/update
const updateQuantity = asyncHandler(async (req, res) => {
    const { bookId, quantity } = req.body

    if (!bookId || !quantity) {
        throw new ApiError(400, "Book ID and quantity are required")
    }

    if (quantity < 1) {
        throw new ApiError(400, "Quantity must be at least 1")
    }

    // Stock check
    const book = await Book.findById(bookId)
    if (!book || !book.isActive) {
        throw new ApiError(404, "Book not found")
    }

    if (book.stock < quantity) {
        throw new ApiError(400, `Only ${book.stock} items left in stock`)
    }

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) throw new ApiError(404, "Cart not found")

    const item = cart.items.find(
        item => item.book.toString() === bookId
    )
    if (!item) throw new ApiError(404, "Item not found in cart")

    item.quantity = quantity
    await cart.save()

    await cart.populate("items.book", "title coverImage price discountPrice stock")

    const deliveryCharges = calculateDelivery(cart.totalAmount)

    return res.status(200).json(
        new ApiResponse(200, {
            items:           cart.items,
            totalAmount:     cart.totalAmount,
            totalItems:      cart.totalItems,
            deliveryCharges,
            finalAmount:     cart.totalAmount + deliveryCharges,
            isFreeDelivery:  deliveryCharges === 0
        }, "Cart updated successfully")
    )
})

// DELETE /api/v1/cart/remove/:bookId
const removeFromCart = asyncHandler(async (req, res) => {
    const { bookId } = req.params

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) throw new ApiError(404, "Cart not found")

    const itemIndex = cart.items.findIndex(
        item => item.book.toString() === bookId
    )
    if (itemIndex === -1) {
        throw new ApiError(404, "Item not found in cart")
    }

    cart.items.splice(itemIndex, 1)
    await cart.save()

    await cart.populate("items.book", "title coverImage price discountPrice stock")

    const deliveryCharges = calculateDelivery(cart.totalAmount)

    return res.status(200).json(
        new ApiResponse(200, {
            items:           cart.items,
            totalAmount:     cart.totalAmount,
            totalItems:      cart.totalItems,
            deliveryCharges,
            finalAmount:     cart.totalAmount + deliveryCharges,
            isFreeDelivery:  deliveryCharges === 0
        }, "Item removed from cart successfully")
    )
})

// DELETE /api/v1/cart/clear
const clearCart = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) throw new ApiError(404, "Cart not found")

    cart.items = []
    await cart.save()

    return res.status(200).json(
        new ApiResponse(200, {
            items:       [],
            totalAmount: 0,
            totalItems:  0
        }, "Cart cleared successfully")
    )
})

export { getCart, addToCart, updateQuantity, removeFromCart, clearCart }