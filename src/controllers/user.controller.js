import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from  "../utils/cloudinary.js"
import {ApiResponse} from  "../utils/ApiResponse.js"


const registerUser = asyncHandler(async(req,res) => {
    // get user from details form frontend
    //validation - not emphty
    //check user if already exits (check username and email)
    //check for images , check fro avatar
    //upload the cloudinary , avatar
    //create a user Object - create in entry in db 
    //remove password and refresh token friels from token 
    //check for user cretation
    //return res

   const {fullName,email,username,password} =  req.body ;
   
   if ([fullName,email,username,password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "ALl Fields are required")
   }

  const existedUser =  User.findOne({
    // $ opeartor r modhe ase
        $or: [{username},{email}]
   })

   if(existedUser){
        throw new ApiError(409, "User with email or username already Exits!")
   }

  const avatarLocalPath =  req.files?.avatar[0]?.path ;
  const coverImageLocalPath =  req.files?.coverImage[0]?.path ;

  if(!avatarLocalPath) {
    throw new ApiError(404, "Avatar file is Required!")
  }

   const avatar =  await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!avatar) {
    throw new ApiError(404, "Avatar file is Required!")
   }

 const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowercase()
   })

   const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
   ) 

   if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering the user")
   }

   return res.status(201).json(
      new ApiResponse(200, createdUser, "User Register Successfully")
   )


})

export {registerUser}