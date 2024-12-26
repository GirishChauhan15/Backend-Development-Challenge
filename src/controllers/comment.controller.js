import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid or non-existent Video ID.");

    let options = {
        page: Number(page),
        limit: Number(limit)
    }

    const commentList = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
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
            $unwind: "$owner",
        },
    ]);
    if (!commentList)
        throw new ApiError(500, "Failed to fetch comment(s) on video.");

    const listCommentsPage = await Comment.aggregatePaginate(commentList, options)

    if (!listCommentsPage)
        throw new ApiError(500, "Failed to fetch comment(s) on video.");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    data:listCommentsPage.docs,
                    totalDocs : listCommentsPage.totalDocs,
                    totalPages : listCommentsPage.totalPages,
                    currentPage : listCommentsPage.page,
                    limit : listCommentsPage.limit
                },
                "Comment list fetched successfully."
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const content = req.body?.content;
    const userId = req.user?._id;
    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Invalid or non-existent Video ID.");
    if (!content?.trim()) throw new ApiError(400, "All fields required.");

    const createComment = await Comment.create({
        content,
        owner: userId,
        video: videoId,
    });
    if (!createComment) throw new ApiError(500, "Failed to comment on video.");

    return res
        .status(200)
        .json(new ApiResponse(200, createComment, "Commented successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const content = req.body?.content;
    const userId = req.user?._id;
    if (!isValidObjectId(commentId))
        throw new ApiError(400, "Invalid or non-existent Comment ID.");
    if (!content?.trim()) throw new ApiError(400, "All fields required.");

    let updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: userId,
        },
        {
            $set:{
                content
            }
        },
        { new: true }
    );
    if(!updatedComment) throw new ApiError(500, "Failed to update comment.")

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully."))
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;
    if (!isValidObjectId(commentId))
        throw new ApiError(400, "Invalid or non-existent Comment ID.");

    let deletedComment = await Comment.findOneAndDelete(
        {
            _id: commentId,
            owner: userId,
        }
    );
    if(!deletedComment) throw new ApiError(500, "Failed to delete comment.")

    return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully."))
});
export { getVideoComments, addComment, updateComment, deleteComment };
