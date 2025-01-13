const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const s3Util = {
    async deleteImage(imageUrl) {
        if (!imageUrl || !imageUrl.includes('amazonaws.com')) {
            console.log('Skipping delete - invalid image URL:', imageUrl);
            return;
        }

        try {
            // Extract the key from the S3 URL
            const key = imageUrl.split('.com/')[1];
            console.log('Attempting to delete S3 object with key:', key);
            
            const deleteCommand = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key
            });

            await s3Client.send(deleteCommand);
            console.log('Successfully deleted image from S3:', key);
        } catch (error) {
            console.error('Error deleting image from S3:', error);
            console.error('Failed URL:', imageUrl);
            // Don't throw error - we don't want to break the main operation if cleanup fails
        }
    }
};

module.exports = s3Util; 