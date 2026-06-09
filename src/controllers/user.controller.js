import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessandRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Somthing went wronh while generating refresh and access Token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user from details form frontend
  //validation - not emphty
  //check user if already exits (check username and email)
  //check for images , check fro avatar
  //upload the cloudinary , avatar
  //create a user Object - create in entry in db
  //remove password and refresh token friels from token
  //check for user cretation
  //return res

  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "ALl Fields are required");
  }

  const existedUser = await User.findOne({
    // $ opeartor r modhe ase
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already Exits!");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath =  req.files?.coverImage[0]?.path ;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(404, "Avatar file is Required!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(404, "Avatar file is Required!");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Register Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //find user
  // password
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Username or password require");
  }

  //   eikhane email ba username hoite pare

  // alternative email or username jek ono 1 ta diye login korte parbe , email ba username jek ono 1 ta diye login korte parbe
  if (!(username && email)) {
    throw new ApiError(400, "Username or password require");
  }

  // case email hbe na hoi usename hbe
  const user = await User.findOne({
    $or: [{ username }, { email }], //email or user name jek ono 1 tya diye mail hbe
  });

  if (!user) {
    throw new ApiError(404, "User does not found exits ");
  }

  const isPasswordvalid = await user.isPasswordCorrect(password);

  if (!isPasswordvalid) {
    throw new ApiError(401, "Invalid User credentials ");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );

  //   select er kaj hoilo je je firld ami db te chai na tadd korar jonno select use kore kaj korte hoi
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //cookie send korar jonno options design lage

  const options = {
    httpOnly: true, //server theke modify hoi , frontend theke hoi na
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn Successfully!!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true, //server theke modify hoi , frontend theke hoi na
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user Logout Succesfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: true, //server theke modify hoi , frontend theke hoi na
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessandRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldpassword, newpassword } = req.body;
  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldpassword); //old password ta thik kina check korbe

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Old Password");
  }
  user.password = newpassword; //new password set korbe
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched Succesfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});


const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {username} = req.params;
    if(!username?.trim()){
        throw new ApiError(400, 'Username is missing')
    }

   const channel =   await User.aggregate([
        {
          $match: {
            username: username?.toLowerCase()
          }
        },
        {
          $lookup: {
            from:"subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
          }
        },
        {
          $lookup: {
            from:"subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
          }
        },
        {
          $addFields: {
            subscribersCount: {
                $size: "$subscribers"
            },
            ChannelsubscribedToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
              $cond: {
                 if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                  then: true,
                  else: false
              }
            }
          }
        },

        {
          $project: {
            fullName: 1, //projection dimu shb value eksathe dimu apanar kase onk filed aswe tao ja proyon jon oi ta  return korbe
            username: 1,
            subscribersCount: 1,
            ChannelsubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
          }
        }


    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched Successfully!")
    )
})


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile
};
