const asyncHandler = (requestHandeler) => {
    return  (req,res,next)=>{
        Promise.resolve(requestHandeler(req,res,next)).catch((err) => next(err))
    }
} 
export {asyncHandler}























// try catch
// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }