import axios from 'axios';
import fs from 'fs-extra';
import * as path from 'path';

// Load data from JSON
const data = fs.readJsonSync('visitedData.json');

// Function to download an image
async function downloadImage(url, folderPath) {
  try {
    const response = await axios({
      url,  
      method: 'GET',
      responseType: 'stream'
    });

    // Extract image name from URL
    const fileName = path.basename(url.split('?')[0]);
    const filePath = path.resolve(folderPath, fileName);

    // Save the image to the specified folder
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading image ${url}:`, error.message);
  }
}

// Create folder if it doesn't exist
const folder = './user_set';
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder);
}

// Download all images
async function downloadAllImages() {
  for (const url of data.images) {
    await downloadImage(url, folder);
  }
  console.log('All images downloaded successfully!');
}

downloadAllImages();