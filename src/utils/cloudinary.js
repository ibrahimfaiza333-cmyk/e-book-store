import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "sulemanbookstore"
        })

        // Local file delete karo upload ke baad
        fs.unlinkSync(localFilePath)

        return response

    } catch (error) {
        // Upload fail ho toh bhi local file delete karo
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)
        }
        return null
    }
}

// Delete file from cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null
        const response = await cloudinary.uploader.destroy(publicId)
        return response
    } catch (error) {
        return null
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }