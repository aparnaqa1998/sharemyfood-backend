require('dotenv').config();
const { ShareServiceClient } = require('@azure/storage-file-share');
const fs = require('fs');
const path = require('path');

// Azure Storage Connection String
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING; // Connection string should be stored in environment variables
const shareName = process.env.AZURE_FILE_SHARE_NAME;

// Create a ShareServiceClient with the connection string
const serviceClient = ShareServiceClient.fromConnectionString(connectionString);

// Function to upload a file to Azure File Share
async function uploadFile(filePath, fileName) {
    try {
        // Get a reference to the file share
        const shareClient = serviceClient.getShareClient(shareName);
        const directoryClient = shareClient.getDirectoryClient('uploads'); // You can use different directories
        const fileClient = directoryClient.getFileClient(fileName);

        // Upload the file to Azure File Share
        const fileContent = fs.createReadStream(filePath);
        const fileSize = fs.statSync(filePath).size;
        await fileClient.uploadStream(fileContent,fileSize);

        // Return the URL of the uploaded file
        return fileClient.url;
    } catch (error) {
        console.error('Error uploading file to Azure File Share:', error);
        throw error;
    }
}
const listFiles = async (userIdentifier) => {
    try {
      const shareClient = serviceClient.getShareClient(shareName);
      const directoryClient = shareClient.getDirectoryClient('uploads');
      const fileList = [];
  
      for await (const item of directoryClient.listFilesAndDirectories()) {
        if (item.kind === 'file') {
          // Check if the file name includes the userIdentifier
          if (item.name.includes(userIdentifier)) {
            fileList.push(item.name);
          }
        }
      }
  
      return fileList;
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
      }
    };
    const downloadFile = async (filename) => {
        const shareClient = serviceClient.getShareClient(shareName);
        const fileClient = shareClient.getDirectoryClient('uploads').getFileClient(filename); // Specify the directory if needed
        const downloadResponse = await fileClient.download(0); // This should return a stream
    
        if (downloadResponse.readableStreamBody) {
            return downloadResponse.readableStreamBody;
        } else {
            throw new Error('File stream is not available');
        }
    };
module.exports = {
    uploadFile,listFiles,downloadFile
};
