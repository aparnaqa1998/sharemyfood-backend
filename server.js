const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { uploadToBlob } = require('./azureBlobService');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/submit-donor', async (req, res) => {
  const { name, email, phone, address } = req.body;
  const donorData = JSON.stringify({ name, email, phone, address });
  const blobName = `${Date.now()}-${name.replace(/\s+/g, '-')}.json`;

  try {
    await uploadToBlob('donor-data', blobName, donorData);
    res.status(200).send({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error uploading to Blob:', error);
    res.status(500).send({ message: 'Error uploading data' });
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
