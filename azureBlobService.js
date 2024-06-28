const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

// Create a BlobServiceClient using Managed Identity
const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
    `https://blobsharemyfoodsa.blob.core.windows.net`,
    credential
);
async function uploadToBlob(containerName, blobName, data) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(data, data.length);
}

module.exports = { uploadToBlob };
