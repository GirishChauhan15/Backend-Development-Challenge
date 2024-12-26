import { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    if(!content?.trim()) throw new ApiError(400,"All fields required.")

    const tweet = await Tweet.create(
        {
            content,
            owner: req.user?._id
        }
    )
    if(!tweet) throw new ApiError(400, "Something went wrong while creating tweet.")

    return res
    .status(200)
    .json(new ApiResponse(200,tweet,"Tweet created successfully."))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid user.")

    const userTweets = await Tweet.find({owner:userId})

    if(!userTweets) throw new ApiError(500, "Something went wrong fetching.")

    return res
    .status(200)
    .json(new ApiResponse(200,userTweets, "Tweets fetched successfully."))
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id
    const {content} = req.body

    if(!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID.")
    
    if(!content?.trim()) throw new ApiError(400, "All fields required.")

    const tweet = await Tweet.findById(tweetId)

    if(!tweet) throw new ApiError(404,"Tweet not found.")

    if(String(userId) !== String(tweet?.owner)) {
        throw new ApiError(401, "Unauthorized Access!")
    }

    const updateTweetInfo = await Tweet.findByIdAndUpdate(
        {_id:tweetId, owner:userId},
        {
            $set:{
                content
            }
        },
        {new:true}
    )

    if(!updateTweetInfo) throw new ApiError(500,"Something went wrong while updating tweet.")

    return res
    .status(200)
    .json(new ApiResponse(200, updateTweetInfo, "Tweet updated successfully."))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id

    if(!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID.")
    const tweet = await Tweet.findById(tweetId)

    if(!tweet) throw new ApiError(404,"Tweet not found.")
    if(String(userId) !== String(tweet?.owner)) {
        throw new ApiError(401, "Unauthorized Access!")
    }

    let deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    
    if(!deletedTweet) throw new ApiError(500, "Something went wrong while deleting tweet.")

    return res
    .status(200)
    .json(new ApiResponse(200,deletedTweet,"Tweet deleted successfully."))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
