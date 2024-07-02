const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { uploadToBlob } = require('./azureBlobService');
const { listBlobs } = require('./azureBlobService');
const { downloadFromBlob,deleteUserBlobs} = require('./azureBlobService');
const { uploadFile, listFiles , downloadFile} = require('./azureFileShare');
const multer = require('multer'); // Ensure multer is imported
const authMiddleware = require('./authMiddleware');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Set up multer for handling file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

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
        const token = jwt.sign({ email: parsedData.email }, "sharejwt", { expiresIn: '1h' });
        res.status(200).send({token, message: 'Login successful' });
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
  app.post('/upload-file', authMiddleware, upload.single('file'), async (req, res) => {
    const { email } = req.user;
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded.' });
    }
    try {
      const blobList = await listBlobs('donor-data');
      const donorDataPromises = blobList.map(async (blob) => {
        return await downloadFromBlob('donor-data', blob.name);
      });
      const donorData = await Promise.all(donorDataPromises);
      const user = donorData.map(data => JSON.parse(data)).find(data => data.email === email);
      const filePath = req.file.path; 
      const userName = user.name;
      const originalFileName = req.file.originalname;
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const fileName = `${timestamp}_${userName}_${originalFileName}`;
      // Upload the file to Azure File Share
      await uploadFile(filePath, fileName);
      // Clean up temporary file
      fs.unlinkSync(filePath);
  
      res.status(200).send({ message: 'File uploaded successfully' });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).send({ message: 'Error uploading file' });
    }
  });
  app.get('/list-files', authMiddleware, async (req, res) => {
    try {
      const { email } = req.user;
      const blobList = await listBlobs('donor-data');
      const donorDataPromises = blobList.map(async (blob) => {
        return await downloadFromBlob('donor-data', blob.name);
      });
      const donorData = await Promise.all(donorDataPromises);
      const user = donorData.map(data => JSON.parse(data)).find(data => data.email === email);
        const userIdentifier = user.name; // or req.user.userId depending on your JWT payload
        const files = await listFiles(userIdentifier);
        res.status(200).send({ files });
    } catch (error) {
        console.error('Error fetching user files:', error);
        res.status(500).send({ message: 'Error fetching files' });
    }
});
  
  app.get('/food-banks', async (req, res) => {
    const { location } = req.query; // Get location from query parameter
    if (!location) {
      return res.status(400).send({ message: 'Location query parameter is required' });
    }
  
    try {
      // List all blobs in the food bank container
      const blobList = await listBlobs('food-bank-data');
      // Filter blobs related to the specified location
      const relevantBlobs = blobList.filter(blob => blob.name.includes(location.toLowerCase()));
  
      // Download and compile the relevant JSON data
      const foodBankData = await Promise.all(relevantBlobs.map(async (blob) => {
        return await downloadFromBlob('food-bank-data', blob.name);
      }));
  
      // Combine data into a single response
      const combinedData = foodBankData.map(data => JSON.parse(data));
  
      res.status(200).send(combinedData);
    } catch (error) {
      console.error('Error fetching food bank data:', error);
      res.status(500).send({ message: 'Error fetching food bank data' });
    }
  });
  
  app.get('/get-user', authMiddleware, async (req, res) => {
    const { email } = req.user;
    try {
      const blobList = await listBlobs('donor-data');
      const donorDataPromises = blobList.map(async (blob) => {
        return await downloadFromBlob('donor-data', blob.name);
      });
      const donorData = await Promise.all(donorDataPromises);
      const user = donorData.map(data => JSON.parse(data)).find(data => data.email === email);
      if (user) {
        res.status(200).send(user);
      } else {
        res.status(404).send({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).send({ message: 'Error fetching user data' });
    }
  });
  app.get('/download/:filename', authMiddleware, async (req, res) => {
    const filename = req.params.filename;

    try {
        const fileStream = await downloadFile(filename); // Modify downloadFile to stream the file
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).send({ message: 'Error downloading file' });
    }
});
app.post('/delete-account',authMiddleware, async (req, res) => {
  const { userName } = req.body;
  try {
    // Fetch user from the blob storage
    const blobList = await listBlobs('donor-data');
    const userBlob = blobList.find(blob => blob.name.includes(userName));
    if (!userBlob) {
      return res.status(404).send({ message: 'User data not found' });
    }
    const userData = await downloadFromBlob('donor-data', userBlob.name);

    // Upload user data to the archive container
    const archiveBlobName = `deleted/${userBlob.name}`;
    await uploadToBlob('deleted-data', archiveBlobName, userData);
    await deleteUserBlobs('donor-data', userName);
    res.status(200).send({ message: 'Account marked for deletion. Data will be permanently deleted after 5 days.' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).send({ message: 'Error deleting account' });
  }
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
