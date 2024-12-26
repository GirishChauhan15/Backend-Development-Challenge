import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const regex = /\/v[\w\d]+\/([^\/]+?)\.(jpg|jpeg|png|gif|bmp|tiff|webp|svg|mp4|mov|mkv|avi|flv|wmv|mp3|wav|ogg|webm|pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|txt|csv|json)(\?.*)?$/i;

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    if([sortBy, sortType].some(field=> !field?.trim())) throw new ApiError(400, "All Fields are required.")

    let matchQuery = {};

    if(query) {
        matchQuery.$or = [
            {title: {$regex: query, $options: 'i'}},
            {description :{$regex:query, $options: 'i'}}
        ]
    }

    if(userId) {
        if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID.")

        matchQuery.owner = new mongoose.Types.ObjectId(userId)
    }

    const sortStage = {}
    sortStage[sortBy] = Number(sortType)

    const aggregateQuery = Video.aggregate([
        {
            $match : matchQuery
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
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
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        }, 
        {
            $sort : sortStage
        }
    ])

    const options = {
        page : Number(page),
        limit: Number(limit)
    }

    const allVideos = await Video.aggregatePaginate(aggregateQuery, options)

    return res.status(200).json(new ApiResponse(200,{
        data: allVideos.docs,
        totalDocs: allVideos.totalDocs,
        totalPages: allVideos.totalPages,
        currentPage: allVideos.page,
        limit: allVideos.limit,
    }, "All Videos Info fetched successfully."));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;
    const userId = req.user?._id;

    if ([title, description, videoLocalPath, thumbnailLocalPath].some(field=> !field?.trim())) throw new ApiError(400, "All fields required.");

    const videoFile = await uploadOnCloudinary(videoLocalPath);

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if ([videoFile?.url, thumbnail?.url].some((field) => !field?.trim()))
        throw new ApiError(500, "Something went wrong while uploading files.");

    let video;

    try {
        video = await Video.create({
            title,
            description,
            videoFile: videoFile?.url,
            thumbnail: thumbnail?.url,
            duration: videoFile?.duration,
            owner: userId,
        });
    } catch (error) {
        let videoFileUrl = videoFile.url.match(regex)[1]
        let thumbnailFileUrl = thumbnail.url.match(regex)[1]
        await deleteFromCloudinary(videoFileUrl, "video")
        await deleteFromCloudinary(thumbnailFileUrl, "image")
    }
    if (!video)
        throw new ApiError(500, "Something went wrong while uploading video.");

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully."));
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video ID.");

    const videoInfo = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
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
                            userName: 1,
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
                owner: {
                    $first: "$owner",
                },
            },
        },
    ]);

    if (!videoInfo) throw new ApiError(404, "Video not found.");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoInfo[0],
                "Video info fetched successfully."
            )
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid Video ID.");

    const { title, description } = req.body;

    const thumbnailLocalPath = req.file?.path;

    if ([title, description, thumbnailLocalPath].some(field => !field?.trim()))
        throw new ApiError(400, "All fields are required.");

    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404,"Video not found.")

    if(String(userId) !== String(video?.owner)) {
        throw new ApiError(401, "Unauthorized Access!")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail?.url)
        throw new ApiError(500, "Something went wrong while uploading file.");

    let updatedVideo;

    try {
        updatedVideo = await Video.findByIdAndUpdate(
            {
                _id: videoId,
            },
            {
                $set: {
                    title,
                    description,
                    thumbnail: thumbnail?.url,
                },
            },
            { new: true }
        );
    } catch (error) {
        let thumbnailFileUrl = thumbnail.url.match(regex)[1]
        await deleteFromCloudinary(thumbnailFileUrl, "image")
    }

    if (!updatedVideo)
        throw new ApiError(500, "Something went wrong while Updating Video.");
    
    const oldVideoThumbnail = video.thumbnail.match(regex)[1]

    await deleteFromCloudinary(oldVideoThumbnail, 'image')

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video updated successfully.")
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID.");

    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404,"Video not found.")

    if(String(userId) !== String(video?.owner)) {
        throw new ApiError(401, "Unauthorized Access!")
    }

    const videoFile = video?.videoFile.match(regex)[1]

    const thumbnail = video?.thumbnail.match(regex)[1]

    const deleteVideoFile = await deleteFromCloudinary(videoFile, "video")

    const deleteThumbnailFile = await deleteFromCloudinary(thumbnail, "image")

    if(!deleteThumbnailFile || !deleteVideoFile) throw new ApiError(500, "Failed to delete Files from database.")

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if(!deletedVideo) throw new ApiError(404,"Video not found.")

    return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully."))
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID.");

    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404,"Video not found.")

    if(String(req.user?._id) !== String(video?.owner)) {
        throw new ApiError(401, "Unauthorized Access!")
    }

    let status = !video?.isPublished

    let togglePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished : status
            }
        },
        {new:true}
    )

    if(!togglePublish) throw new ApiError(404,"Video not found.")

    return res
    .status(200)
    .json(new ApiResponse(200, togglePublish, `Status changed successfully.`))
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
