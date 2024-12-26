import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { unlinkFiles } from "../utils/unlinkFiles.js";
import jwt from "jsonwebtoken";

const options = {
    httpOnly: true,
    secure: true
}

const regex = /\/v[\w\d]+\/([^\/]+?)\.(jpg|jpeg|png|gif|bmp|tiff|webp|svg|mp4|mov|mkv|avi|flv|wmv|mp3|wav|ogg|webm|pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|txt|csv|json)(\?.*)?$/i;

const generateAccessTokenAndRefreshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)

        let accessToken = await user.generateAccessToken()

        let refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return { accessToken, refreshToken }

    } catch (error) {
        return false
    }
}

const registerUser = asyncHandler( async(req,res)=>{
    const { fullName, email, password, userName } = req.body

    if([fullName, email, password, userName].some((field)=> !field?.trim())) {
        throw new ApiError(400, "All fields are required.")
    }

    let avatarLocalPath = req.files?.avatar[0].path;
    let coverImageLocalPath;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.")
    }

    if(req.files && Array.isArray(req.files?.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    let existingUser = await User.findOne({
        $or:[
            {email},
            {userName}
        ]
    })

    if(existingUser) {
        unlinkFiles(avatarLocalPath)
        if(coverImageLocalPath){
            unlinkFiles(coverImageLocalPath)
        }
        throw new ApiError(400, "User with email or username already exists.")
    }

    let avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar?.url) {
        throw new ApiError(400, "Avatar file is required.")
    }

    let user;

    try {
        user = await User.create({
            userName: userName.toLowerCase(),
            fullName,
            email,
            password,
            avatar: avatar?.url,
            coverImage : coverImage?.url || ''
        })
    } catch (error) {
        if(avatar?.url) {
            let newImagePublicId = avatar?.url.match(regex)[1]
            await deleteFromCloudinary(newImagePublicId, "image")
        }
        if(coverImage?.url){
            let newImagePublicId = coverImage?.url.match(regex)[1]
            await deleteFromCloudinary(newImagePublicId, "image")
        }   
    }

    if(!user) throw new ApiError(500, "Failed to create a user.")
    
    let createdUser = await User.findById(user._id).select('-password -refreshToken')

    if(!createdUser) {
        throw new ApiError(500, "Something want wrong while creating user.")
    }
    return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully."))

})

const loginUser = asyncHandler( async(req,res)=>{
    const { email, password } = req.body

    if([email,password].some(field=> !field?.trim())) {
        throw new ApiError(400, "All fields required.")
    }

    const user = await User.findOne({email})

    if(!user) throw new ApiError(400, "User does not exist.")
        
    let checkUser = await user.isPasswordCorrect(password)

    if(!checkUser) throw new ApiError(400, "Invalid user credentials.")
        
    let { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    let loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    if(!loggedInUser) throw new ApiError(400, "Something went wrong during login.")
    
    return res
    .status(200)
    .cookie('AccessToken', accessToken, options)
    .cookie('RefreshToken', refreshToken, options)
    .json(new ApiResponse(200,{user:loggedInUser,refreshToken,accessToken}, "User logged in successfully."))
})

const logoutUser = asyncHandler( async(req,res)=>{
    let user = await User.findByIdAndUpdate(req.user?._id, {$unset: {refreshToken:1}}, {new:true})
    return res.status(200).clearCookie("AccessToken", options).clearCookie("RefreshToken", options).json(new ApiResponse(200,{},"User logged out successfully."))
})

const refreshTokens = asyncHandler(async(req,res)=>{
    const incomingToken = req.cookies?.RefreshToken || req.body?.RefreshToken

    if(!incomingToken?.trim()) {
        throw new ApiError(400,"Unauthorized request.")
    }
    const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET)

    if(!decodedToken) {
        throw new ApiError(400, "Invalid token.")
    }

    let user = await User.findById(decodedToken._id)

    if(!user) {
        throw new ApiError(400, "Invalid token.")
    }

    if(incomingToken !== user?.refreshToken) {
        throw new ApiError(400, "Token is expired or used.")
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    return res
    .status(200)
    .cookie('AccessToken', accessToken, options)
    .cookie('RefreshToken', refreshToken, options)
    .json(new ApiResponse(200,{accessToken,refreshToken},"Token refreshed successfully."))

})

const changeUserPassword = asyncHandler(async (req,res)=>{
    const { oldPassword, newPassword } = req.body

    if([oldPassword, newPassword].some(field=> !field?.trim())) throw new ApiError(400, "All fields are required.")
    
    let user = await User.findById(req.user?._id)

    let isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password.")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password updated successfully."))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully."))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body;
    if([fullName, email].some(field=> !field?.trim())) throw new ApiError(400, "All fields are required.")
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullName,
                    email
                }
            },
            {new:true}
        ).select('-password -refreshToken')
    
    if(!user) throw new ApiError(400, "Unauthorized access.")

    return res.status(200).json(new ApiResponse(200, user, "User information updated successfully."))
    
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    
    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is missing!")
        
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        
        if(!avatar.url) throw new ApiError(500, "Error while uploading file.")

        if(avatar?.url) {
            let user = await User.findById(req.user._id)

            if(!user) throw new ApiError(500, "Failed to fetch user information.")

            let avatarPublicId = user.avatar.match(regex)[1]

            const deleteFromCloudinaryFiles = await deleteFromCloudinary(avatarPublicId, "image")
         
            if(deleteFromCloudinaryFiles) {
                const updatedUser = await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set:{
                            avatar : avatar?.url
                        }
                    },
                    {new:true}
                ).select('-password -refreshToken')
    
                if(!updatedUser) {
                    let newImagePublicId = avatar?.url.match(regex)[1]
                    await deleteFromCloudinary(newImagePublicId, "image")
                     throw new ApiError(500, "Failed to fetch user information.")
                }
                
                return res.status(200).json(new ApiResponse(200, updatedUser,"Avatar updated successfully."))
            } else {
                let newImagePublicId = avatar?.url.match(regex)[1]
                await deleteFromCloudinary(newImagePublicId, "image")
                throw new ApiError(500, "Failed to delete old avatar from the database.")
            }
        }
        })

const updateUserCoverImage = asyncHandler(async(req,res)=>{

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) throw new ApiError(400, "Cover image file is missing!")
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) throw new ApiError(500, "Error while uploading file.")

    if(coverImage?.url) {
        let user = await User.findById(req.user._id)

        if(!user) throw new ApiError(500, "Failed to fetch user information.")

        let coverImagePublicId = user.coverImage.match(regex)[1]

        const deleteFromCloudinaryFiles = await deleteFromCloudinary(coverImagePublicId, "image")
     
        if(deleteFromCloudinaryFiles) {
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                {
                    $set:{
                        coverImage : coverImage?.url
                    }
                },
                {new:true}
            ).select('-password -refreshToken')

            if(!updatedUser) {
                let newImagePublicId = coverImage?.url.match(regex)[1]
                await deleteFromCloudinary(newImagePublicId, "image")
                throw new ApiError(500, "Failed to fetch user information.")
            }
            return res.status(200).json(new ApiResponse(200, updatedUser,"Cover image updated successfully."))
        } else {
            let newImagePublicId = coverImage?.url.match(regex)[1]
            await deleteFromCloudinary(newImagePublicId, "image")
            throw new ApiError(500, "Failed to delete old cover image from the database.")
        }
        
    }
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
    const { userName } = req.params

    if(!userName?.trim()) throw new ApiError(400, "Username is missing.")

    let channel = await User.aggregate([
        {
            $match : {
                userName:userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers",
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo",
            }
        },
        {
            $addFields:{
                subscribersCount : {
                    $size: '$subscribers'
                },
                channelsSubToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond: {
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project :{
                fullName:1,
                userName:1,
                email:1,
                coverImage:1,
                avatar:1,
                subscribersCount:1,
                channelsSubToCount:1,
                isSubscribed:1,
            }
        }
    ])
    if(!channel?.length < 0){
        throw new ApiError(400, "Channel does not exist.")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully."))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                     $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    userName:1,
                                    avatar:1,
                                    _id:1
                                }
                            },
                            {
                                $addFields:{
                                    owner: {
                                        $first:"$owner"
                                    }
                                }
                            }
                        ]
                     }   
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory, "Watch history fetched successfully."))
})

const addVideoToWatchHistory = asyncHandler(async (req,res)=>{
    const {videoId} = req.params
    const userId = req.user?._id

    if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid or non-existent video ID.")

    const user = await User.findById(userId)

    if(!user) throw new ApiError(500, "Failed to fetch user information.")
    
    if(user?.watchHistory.length > 0) {
        let index = user.watchHistory.indexOf(videoId)

        if(index !== -1) {
            user.watchHistory.splice(index, 1)        
        }
    }

    user.watchHistory.unshift(videoId)
    await user.save({validateBeforeSave:false})

    const updatedUser = await User.findById(user?._id).select('-password -refreshToken')

    if(!updatedUser) throw new ApiError(500, "Failed to fetch UserInfo")

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Video added successfully."))

})


export { registerUser, loginUser, logoutUser, 
refreshTokens, changeUserPassword, getCurrentUser, 
updateAccountDetails, updateUserAvatar, updateUserCoverImage, 
getUserChannelProfile, getWatchHistory, addVideoToWatchHistory }
