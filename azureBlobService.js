const { BlobServiceClient } = require('@azure/storage-blob');

// Create a BlobServiceClient using Managed Identity
const blobServiceClient = new BlobServiceClient(`https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`);

// Example usage: List containers in the storage account
async function listContainers() {
    try {
        for await (const container of blobServiceClient.listContainers()) {
            console.log(`Container: ${container.name}`);
        }
    } catch (error) {
        console.error('Error listing containers:', error.message);
    }
}

// Call the function to list containers (example)
listContainers();
