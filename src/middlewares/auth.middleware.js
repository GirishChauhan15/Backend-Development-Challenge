import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async(req, res, next)=>{
    try {
        const token = req.cookies?.AccessToken || req.headers?.authorization?.replace("Bearer ",'')
        if(token?.trim() === '' || token === undefined) {
            throw new ApiError(401, "Unauthorized Request.")
        }
        let decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        if(!decodedToken) {
            throw new ApiError(401, "Unauthorized Request.")
        }
        let user = await User.findById(decodedToken._id).select("-password -refreshToken")
        if(!user) {
            throw new ApiError(401, "Invalid access token.")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token.")
    }
})








// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import jwt from "jsonwebtoken"
// import { User } from "../models/user.model.js";

// export const verifyJWT = asyncHandler(async(req, _, next) => {
//     try {
//         const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
//         // console.log(token);
//         if (!token) {
//             throw new ApiError(401, "Unauthorized request")
//         }
    
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
//         if (!user) {
            
//             throw new ApiError(401, "Invalid Access Token")
//         }
    
//         req.user = user;
//         next()
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid access token")
//     }
    
// })