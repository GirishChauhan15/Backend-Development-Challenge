# Backend Development Challenge  

This repository contains my solution to the **Backend Development Challenge** created by [Hitesh Choudhary](https://github.com/hiteshchoudhary).  

## Overview  

This project demonstrates backend development skills, including API creation, database integration, and advanced features like aggregation pipelines. It covers user management, video management, playlists, subscriptions, likes, tweets, and more.  

---

## Features  

- User Authentication and Authorization (JWT-based).  
- CRUD operations for videos, tweets, playlists, and comments.  
- Advanced querying using MongoDB aggregation pipelines.  
- File uploads and management using `Multer` and `Cloudinary`.  
- Pagination and sorting for efficient data retrieval.  

---

## Tech Stack  

- **Node.js**: Backend runtime environment.  
- **Express.js**: Web framework for building APIs.  
- **MongoDB**: Database for storing and managing data.  
- **Cloudinary**: Media management and storage.  
- **Mongoose**: ODM library for MongoDB.  
- **Other Libraries**:  
  - `jsonwebtoken` for authentication.  
  - `bcrypt` for password hashing.  
  - `multer` for file handling.  
  - `cors` for cross-origin requests.  

---

## Installation  

1. Clone the repository:  
   ```bash  
   git clone 
 

2. Install dependencies:  
   ```bash  
   npm install
 

3. Set up environment variables:
    * Create a .env file and add the required variables (e.g., database URI, JWT secret, Cloudinary credentials).

4. Run the application:
    ```bash
    npm run dev
 

## API Endpoints  

### Health Check  
- **`GET /api/v1/healthcheck`**: Check the server's health.  

### Users  
- **`POST /api/v1/users/register`**: Register a new user.  
- **`POST /api/v1/users/login`**: Log in a user.  
- **`POST /api/v1/users/logout`**: Log out a user.  
- **`POST /api/v1/users/refresh-token`**: Refresh access tokens.  
- **`POST /api/v1/users/change-password`**: Change the user's password.  
- **`GET /api/v1/users/current-user`**: Fetch the current logged-in user's details.  
- **`PATCH /api/v1/users/update-account`**: Update user account details.  
- **`PATCH /api/v1/users/avatar`**: Update user avatar.  
- **`PATCH /api/v1/users/cover-image`**: Update cover image.  
- **`GET /api/v1/users/c/:userName`**: Get a user’s channel profile.  
- **`GET /api/v1/users/history`**: Get user watch history.  
- **`PATCH /api/v1/users/add-to-watchHistory/:videoId`**: Add a video to the watch history.  

### Videos  
- **`GET /api/v1/videos`**: Fetch all videos.  
- **`POST /api/v1/videos`**: Upload a new video.  
- **`GET /api/v1/videos/:videoId`**: Get video details by ID.  
- **`DELETE /api/v1/videos/:videoId`**: Delete a video by ID.  
- **`PATCH /api/v1/videos/:videoId`**: Update a video's details or thumbnail.  
- **`PATCH /api/v1/videos/toggle/publish/:videoId`**: Toggle video publish status.  

### Playlists  
- **`POST /api/v1/playlist`**: Create a new playlist.  
- **`GET /api/v1/playlist/:playlistId`**: Fetch a playlist by ID.  
- **`PATCH /api/v1/playlist/:playlistId`**: Update a playlist by ID.  
- **`DELETE /api/v1/playlist/:playlistId`**: Delete a playlist by ID.  
- **`PATCH /api/v1/playlist/add/:videoId/:playlistId`**: Add a video to a playlist.  
- **`PATCH /api/v1/playlist/remove/:videoId/:playlistId`**: Remove a video from a playlist.  
- **`GET /api/v1/playlist/user/:userId`**: Get all playlists of a user.  

### Comments  
- **`GET /api/v1/comments/:videoId`**: Fetch comments for a video.  
- **`POST /api/v1/comments/:videoId`**: Add a comment to a video.  
- **`DELETE /api/v1/comments/c/:commentId`**: Delete a comment by ID.  
- **`PATCH /api/v1/comments/c/:commentId`**: Update a comment by ID.  

### Likes  
- **`POST /api/v1/likes/toggle/v/:videoId`**: Toggle like for a video.  
- **`POST /api/v1/likes/toggle/c/:commentId`**: Toggle like for a comment.  
- **`POST /api/v1/likes/toggle/t/:tweetId`**: Toggle like for a tweet.  
- **`GET /api/v1/likes/videos`**: Fetch all liked videos.  

### Subscriptions  
- **`POST /api/v1/subscriptions/c/:channelId`**: Subscribe to or unsubscribe from a channel.  
- **`GET /api/v1/subscriptions/c/:channelId`**: Get all subscribers for a channel.  
- **`GET /api/v1/subscriptions/u/:subscriberId`**: Get all channels a user is subscribed to.  

### Tweets  
- **`POST /api/v1/tweets`**: Create a new tweet.  
- **`GET /api/v1/tweets/user/:userId`**: Fetch all tweets by a user.  
- **`PATCH /api/v1/tweets/:tweetId`**: Update a tweet by ID.  
- **`DELETE /api/v1/tweets/:tweetId`**: Delete a tweet by ID.  

### Dashboard  
- **`GET /api/v1/dashboard/stats`**: Fetch channel statistics.  
- **`GET /api/v1/dashboard/videos`**: Fetch channel videos.  


## Acknowledgments  

This project is part of the Backend Development Challenge designed by **Hitesh Choudhary**.  
**All rights for the course content and materials are reserved by Hitesh Choudhary.**  

Special thanks to Hitesh for creating such a valuable learning opportunity!  

---

## License  

This project is for educational purposes only, based on the course by Hitesh Choudhary.  
**All rights reserved by Hitesh Choudhary.**  

