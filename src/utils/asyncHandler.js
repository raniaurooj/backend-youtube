//function that every times calls for the async await function it is just wrapper

const asyncHandler = (asyncHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(asyncHandler(req,res,next))
        .catch(( err ) => next( err ))
    }
}


export default asyncHandler