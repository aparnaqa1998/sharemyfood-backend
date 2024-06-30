//require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING environment variable");
}
const blobServiceClient = BlobServiceClient.fromConnectionString(
  connectionString
);
const uploadToBlob = async (containerName, blobName, content) => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(content, Buffer.byteLength(content));
};
async function listBlobs(containerName) {
    // Implement this function to list all blobs in a container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobList = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobList.push(blob);
    }
    return blobList;
}
const downloadFromBlob = async (containerName, blobName) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    const downloaded = (await streamToBuffer(downloadBlockBlobResponse.readableStreamBody)).toString();
    return downloaded;
}
const streamToBuffer = async (readableStream) => {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on("error", reject);
    });
  };
module.exports = { uploadToBlob, listBlobs ,downloadFromBlob};
