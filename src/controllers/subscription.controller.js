import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user?._id;

    if (!isValidObjectId(channelId))
        throw new ApiError(400, "Invalid Channel.");
    if (String(channelId) === String(userId))
        throw new ApiError(401, "Invalid access.");

    const channel = await Subscription.findOne({
        channel: channelId,
        subscriber: userId,
    });

    if (!channel) {
        const subscribeToChannel = await Subscription.create({
            subscriber: userId,
            channel: channelId,
        });
        if (!subscribeToChannel) throw new ApiError(400, "Invalid channelId.");
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    subscribeToChannel,
                    "Subscribed successfully."
                )
            );
    } else {
        const unsubscribeToChannel = await Subscription.findByIdAndDelete(
            channel._id
        );
        if (!unsubscribeToChannel)
            throw new ApiError(
                500,
                "Something went wrong while unsubscribing."
            );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    unsubscribeToChannel,
                    "Unsubscribed successfully."
                )
            );
    }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId))
        throw new ApiError(404, "Channel not found!");

    const channelSubscriberInfo = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscriber: {
                    $first: "$subscriber",
                },
            },
        },
    ]);

    if (!channelSubscriberInfo) throw new ApiError(404, "Channel not found!");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelSubscriberInfo,
                "Channel's subscriber list fetched successfully."
            )
        );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId))
        throw new ApiError(404, "Channel not found!");

    const channelSubList = await Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel",
                },
            },
        },
    ])

    if (!channelSubList) throw new ApiError(404, "Channel not found!");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelSubList,
                "Subscribed channel info fetched successfully."
            )
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
