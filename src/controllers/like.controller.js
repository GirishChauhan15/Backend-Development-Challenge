import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid or non-existent Video ID.")

    const likeVideo = await Like.findOne({video:videoId, likedBy: userId})

    if(!likeVideo) {
        const like = await Like.create(
            {
                video:videoId,
                likedBy:userId
            }
        )
        if(!like) throw new ApiError(500, "Failed to like a video.")

        return res
        .status(200)
        .json(new ApiResponse(200, like, "Video liked successfully."))
    } else {
        const disLike = await Like.findByIdAndDelete(likeVideo?._id)

        if(!disLike) throw new ApiError(500, "Failed to dislike a video.")

        return res
        .status(200)
        .json(new ApiResponse(200, disLike, "Video disliked successfully."))

    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(commentId)) throw new ApiError(400, "Invalid or non-existent Comment ID.")

    const likeComment = await Like.findOne({comment:commentId, likedBy: userId})

    if(!likeComment) {
        const like = await Like.create(
            {
                comment:commentId,
                likedBy:userId
            }
        )
        if(!like) throw new ApiError(500, "Failed to like a comment.")

        return res
        .status(200)
        .json(new ApiResponse(200, like, "Comment liked successfully."))
    } else {
        const disLike = await Like.findByIdAndDelete(likeComment?._id)

        if(!disLike) throw new ApiError(500, "Failed to dislike a comment.")

        return res
        .status(200)
        .json(new ApiResponse(200, disLike, "Comment disliked successfully."))

    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid or non-existent Tweet ID.")

    const likeTweet = await Like.findOne({tweet:tweetId, likedBy: userId})

    if(!likeTweet) {
        const like = await Like.create(
            {
                tweet:tweetId,
                likedBy:userId
            }
        )
        if(!like) throw new ApiError(500, "Failed to like a tweet.")

        return res
        .status(200)
        .json(new ApiResponse(200, like, "Tweet liked successfully."))
    } else {
        const disLike = await Like.findByIdAndDelete(likeTweet?._id)

        if(!disLike) throw new ApiError(500, "Failed to dislike a tweet.")

        return res
        .status(200)
        .json(new ApiResponse(200, disLike, "Tweet disliked successfully."))

    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    const likeVideos = await Like.aggregate([
        {
            $match:{
                likedBy:userId,'video' :{$exists:true}
            }
        }, 
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
                pipeline:[
                    {
                        $project:{
                            videoFile: 1,
                            title: 1,
                            thumbnail: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"likedBy",
                foreignField:"_id",
                as:"likedBy",
                pipeline:[
                    {
                        $project:{
                            avatar: 1,
                            fullName: 1,
                            userName: 1,
                            coverImage: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $unwind: "$likedBy"
        }
    ]) 
    if(!likeVideos) throw new ApiError(400, "Failed to fetch liked videos.")

    return res
    .status(200)
    .json(new ApiResponse(200,likeVideos, "All liked videos fetched successfully."))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}