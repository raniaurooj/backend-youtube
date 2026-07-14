class ApiResponse extends Response{
    constructor(
        statusCode,
        message = "success",
        data
    )
    { 
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.data = data
        this.success = statusCode < 400
    }
}

export {ApiResponse}