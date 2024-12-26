import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user?._id;

    if ([name, description].some((field) => !field?.trim()))
        throw new ApiError(400, "All fields are required.");

    const createNewPlaylist = await Playlist.create({
        name,
        description,
        owner: userId,
    });
    if (!createNewPlaylist)
        throw new ApiError(500, "Failed to create playlist.");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                createNewPlaylist,
                "Playlist created successfully."
            )
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!isValidObjectId(userId))
        throw new ApiError(400, "Invalid or non-existent User ID.");

    const userPlaylists = await Playlist.aggregate([ {
        $match: {
            owner: new mongoose.Types.ObjectId(userId),
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
        $lookup: {
            from: "videos",
            localField: "videos",
            foreignField: "_id",
            as: "videos",
            pipeline: [
                {
                    $project:{
                        videoFile: 1,
                        title: 1,
                        thumbnail: 1,
                    }
                }
            ],
        },
    },
    {
        $unwind:"$owner"
    },
]);
    if (!userPlaylists)
        throw new ApiError(500, "Failed to fetch user playlists.");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userPlaylists,
                "User playlists fetched successfully."
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!isValidObjectId(playlistId))
        throw new ApiError(400, "Invalid or non-existent Playlist ID.");

    const playlistInfo = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
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
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project:{
                            videoFile: 1,
                            title: 1,
                            thumbnail: 1,
                        }
                    }
                ],
            },
        },
        {
            $unwind:"$owner"
        }
]);

    if (!playlistInfo) throw new ApiError(500, "Failed to fetch playlist.");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistInfo,
                "Playlist information fetched successfully."
            )
        );
});


const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(400, "Invalid or non-existent Playlist ID or Video ID.");

    const updatePlaylistVideos = await Playlist.findById(playlistId)

    if(!updatePlaylistVideos) throw new ApiError(500, "Failed to fetch playlist.")
    
    if(String(updatePlaylistVideos.owner) === String(userId)) {

        updatePlaylistVideos.videos.push(videoId)
        await updatePlaylistVideos.save({validateBeforeSave:false})

    let playlistInfo = await Playlist.findById(updatePlaylistVideos?._id)

    if(!playlistInfo) throw new ApiError(500, "Failed to fetch playlist info.")
    return res.status(200).json(new ApiResponse(200, playlistInfo, "Video added successfully."))

    } else {
        throw new ApiError(401, 'Unauthorized access.')
    }

});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(400, "Invalid or non-existent Playlist ID or Video ID.");

    let playlistInfo = await Playlist.findById(playlistId)

    if(!playlistInfo) throw new ApiError(500, "Failed to fetch playlist.")
    
        if(String(playlistInfo?.owner) === String(userId)) {
            if(playlistInfo.videos.indexOf(videoId) !== -1) {
                let index = playlistInfo.videos.indexOf(videoId)
                playlistInfo.videos.splice(index,1)
                await playlistInfo.save({validateBeforeSave:false})

            } else {
                throw new ApiError(400, "Invalid or non-existent Video ID.")
            }

    
        let newlyGeneratedPlaylist = await Playlist.findById(playlistInfo?._id)
    
        if(!newlyGeneratedPlaylist) throw new ApiError(500, "Failed to fetch playlist info.")
        return res.status(200).json(new ApiResponse(200, newlyGeneratedPlaylist, "Video removed successfully."))
    
        } else {
            throw new ApiError(401, 'Unauthorized access.')
        }
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const userId = req.user?._id

    if(!isValidObjectId(playlistId)) throw new ApiError(400,"Invalid or non-existent Playlist ID.")

    const deletedPlaylist = await Playlist.findOneAndDelete({owner: userId, _id:playlistId })

    if(!deletedPlaylist) throw new ApiError(500, "Failed to delete playlist.")
    
    return res
    .status(200)
    .json(new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully."))
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    const userId = req.user?._id

    if(!isValidObjectId(playlistId)) throw new ApiError(400,"Invalid or non-existent Playlist ID.")

    if([name, description].some(field=>field?.trim() === '') || !name || !description) throw new ApiError(400, "All fields are required.")

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {owner: userId, _id:playlistId },
        {
            $set:{
                name,
                description
            }
        },
        {new:true})

    if(!updatedPlaylist) throw new ApiError(500, "Failed to update playlist.")
    
    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully."))

});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
