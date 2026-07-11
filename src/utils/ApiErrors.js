class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = "" //contains call history
    )
    {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this,this.constructor)//dynamic text generator that contains file methods lines of code
        }
    }
}

export {ApiError}