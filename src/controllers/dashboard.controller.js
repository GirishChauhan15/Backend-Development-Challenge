import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    let userId = req.user?._id;

    let totalVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
    ]);

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId),
            },
        },
    ]);

    const totalViews = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $group: { _id: null, views: { $sum: "$views" } },
        },
    ]);

    const totalLikesOnVideo = await Like.aggregate([
        {
            $match: {
                video: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            owner: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
                },
            },
        },
        {
            $match: {
                "video.owner": new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $count: "totalLikes",
        },
    ]);


    if (!totalVideos)
        throw new ApiError(400, "Failed to fetch User information");
    if (!totalSubscribers)
        throw new ApiError(400, "Failed to fetch Subscribers information");
    if (!totalViews)
        throw new ApiError(400, "Failed to fetch Views information");
    if (!totalLikesOnVideo)
        throw new ApiError(400, "Failed to fetch Likes information");

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videoCount: totalVideos?.length || 0,
                SubscriberCount: totalSubscribers?.length || 0,
                totalViewsCount: totalViews[0]?.views || 0,
                totalLikes: totalLikesOnVideo[0]?.totalLikes || 0,
            },
            "All stats fetched successfully."
        )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    let userId = req.user?._id;

    let videosInfo = await Video.aggregate([
        {
            $match: {
                owner: userId,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            fullName: 1,
                            userName: 1,
                            coverImage: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
    ]);

    if (!videosInfo) throw new ApiError(500, "Failed to fetch Videos.");

    return res
        .status(200)
        .json(
            new ApiResponse(200, videosInfo, "All videos fetched successfully.")
        );
});

export { getChannelStats, getChannelVideos };