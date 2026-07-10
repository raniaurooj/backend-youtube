//function that every times calls for the async await function it is just wrapper

const asyncHandler = (asyncHandler)=>{
    (req,res,next)=>{
        Promise.resolve(asyncHandler())
        .catch(( err ) => next( err ))
    }
}


export default asyncHandler