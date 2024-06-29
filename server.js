const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { uploadToBlob } = require('./azureBlobService');
const { listBlobs } = require('./azureBlobService');
const { downloadFromBlob} = require('./azureBlobService');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/submit-donor', async (req, res) => {
  const { name, email, phone, address, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const donorData = JSON.stringify({ name, email, phone, address, password: hashedPassword });
  const blobName = `${Date.now()}-${name.replace(/\s+/g, '-')}.json`;

  try {
    await uploadToBlob('donor-data', blobName, donorData);
    res.status(200).send({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error uploading to Blob:', error);
    res.status(500).send({ message: 'Error uploading data' });
  }
});
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const blobList = await listBlobs('donor-data');
    const donorData = await Promise.all(blobList.map(async (blob) => {
      return await downloadFromBlob('donor-data', blob.name);
    }));
    const user = donorData.find(data => JSON.parse(data).email === email);
    if (user) {
      const parsedData = JSON.parse(user);
      if (await bcrypt.compare(password, parsedData.password)) {
        res.status(200).send({ message: 'Login successful' });
      } else {
        res.status(401).send({ message: 'Invalid email or password' });
      }
    } else {
      res.status(401).send({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error downloading from Blob:', error);
    res.status(500).send({ message: 'Error logging in' });
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
