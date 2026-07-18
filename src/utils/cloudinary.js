import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";


cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadOnCloudinary = async (localFilePath)=>{
       try {

          if(!localFilePath) return null
          //upload file on cloudinary 
          const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto", //detect file type by yourself
          })
          //uploded successfully
          fs.unlinkSync(localFilePath);
          return response

       } catch (error) {

          fs.unlinkSync(localFilePath) //remove the locally saved temporary file from the server as the upload got failed
          return null

       }
}

//default type image if we forget to specify
const deleteFromCloudinary = async (url, resourceType = "image") => {
    try {
        if (!url) return null;

        const parts = url.split('/');
        
        const versionIndex = parts.findIndex(part => part.startsWith('v') && !isNaN(part.substring(1)));
        
        const publicIdWithExtension = parts.slice(versionIndex + 1).join('/');
        
        const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType 
        });

        return response;

    } catch (error) {
        console.error("Cloudinary Deletion Error:", error);
        return null;
    }
}

export {uploadOnCloudinary,deleteFromCloudinary}