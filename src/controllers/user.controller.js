import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  // passwoord
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;

  if (!email || !username) {
    throw new ApiError(400, "Username or password require");
  }

  //   eikhane email ba username hoite pare
  // case email hbe na hoi usename hbe
  const user = await User.findOne({
    $or: [{ username }, { email }], //email or use name jek ono 1 tya diye mail hbe
  });

  if (!user) {
    throw new ApiError(400, "User does not found exits ");
  }

  const isPawwordvalid = await user.isPasswordCorrect(password);

  if (!isPawwordvalid) {
    throw new ApiError(401, "Inavlid User credentials ");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );

  //   select er kaj hoilo je je firld ami db te chai na tadd korar jonno select use kore kaj korte hoi
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  //cookie send korar jonno options design lage 

  const options = {
   httpOnly: true, //server theke modify hoi , frontend theke hoi na 
   secure: true
  }

  return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200,
         {
            user: loggedInUser, accessToken,refreshToken
         },
         "User loggedIn Successfully!!"
      ))
});

export { registerUser, loginUser };
