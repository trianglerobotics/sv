import express from 'express';
import wifi from 'node-wifi';
import disk from 'diskusage';
import { exec } from 'child_process';
//import fs from 'fs';
import https from 'https';
import http from 'http';
import os from 'os';
import util from 'util';
import { promises as fs } from 'fs';
import { getImages,getClasses,getBoxesByClass,generateDatasets } from '../database.js';

const execAsync = util.promisify(exec);
const router = express.Router();
router.get('/')
const home = os.homedir();

// Initialize wifi module
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});


function checkWifiConnection() {
  return new Promise((resolve, reject) => {
    const command = `nmcli -t -f ACTIVE,SSID dev wifi`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error checking Wi-Fi connection: ${error.message}`);
            return reject(error);
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return reject(stderr);
        }

        const lines = stdout.trim().split('\n');
        const connectedWifi = lines.find(line => line.startsWith('yes'));
        
        if (connectedWifi) {
            const ssid = connectedWifi.split(':')[1]; // Get SSID
            console.log(`Connected to Wi-Fi: ${ssid}`);
            resolve(ssid); // Resolve with the SSID
        } else {
            console.log('Not connected to any Wi-Fi network.');
            resolve(false); // Resolve with false if not connected
        }
    });
});
}

function connectToWifi(ssid, password, sudoPassword) {
  return new Promise((resolve, reject) => {
    const command = `echo '${sudoPassword}' | sudo -S nmcli device wifi connect "${ssid}" password "${password}"`;

    console.log('Executing command:', command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error connecting to Wi-Fi: ${error.message}`);
        reject(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        reject(`Error: ${stderr}`);
        return;
      }

      // console.log(`Connected to Wi-Fi: ${stdout}`);
      resolve('Connected to Wi-Fi');
    });
  });
}

async function handleWifiConnection(ssid, password, sudoPassword) {
  try {
    const result = await connectToWifi(ssid, password, sudoPassword);
    console.log(result);

    // Wi-Fi is connected, now perform the next action
    console.log('Wi-Fi connection successful, proceeding with next steps...');
    // You can trigger the next action here after successful connection
  } catch (error) {
    console.error('Failed to connect to Wi-Fi:', error);
    // Handle the error case here (retry, show message, etc.)
  }
}

// const downloadFile = (url, dest) => {
//   return new Promise((resolve, reject) => {
//     const file = fs.createWriteStream(dest);

//     http.get(url, (response) => {
//       // Pipe the response to the file
//       response.pipe(file);

//       file.on('finish', () => {
//         file.close(() => {
//           console.log('Download complete.');
//           resolve(); // Resolve the promise when done
//         });
//       });
//     }).on('error', (err) => {
//       fs.unlink(dest, () => {
//         console.error('Error downloading the file:', err.message);
//         reject(err); // Reject the promise in case of error
//       });
//     });
//   });
// };

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', async () => {
        try {
          await fs.writeFile(dest, data);
          console.log('Download complete.');
          resolve();
        } catch (err) {
          console.error('Error writing the file:', err.message);
          reject(err);
        }
      });
    }).on('error', (err) => {
      console.error('Error downloading the file:', err.message);
      reject(err);
    });
  });
};

const changePermissions = async (savePath) => {
  try {
    // Run the chmod command to set permissions to 777
    const command_chmod = `chmod 777 ${savePath}`;
    const { stdout, stderr } = await execAsync(command_chmod);

    // Check for any stderr output
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout: ${stdout}`);
    console.log('Permissions changed successfully.');
  } catch (error) {
    console.error(`Error changing permissions: ${error.message}`);
  }
};

const executeUpdate = async (savePath) => {
  try {
    // Run the chmod command to set permissions to 777
    const command_chmod = `${savePath}`;
    const { stdout, stderr } = await execAsync(command_chmod);

    // Check for any stderr output
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout: ${stdout}`);
    console.log('update executed successfully.');
  } catch (error) {
    console.error(`Error update ${error.message}`);
  }
};

const removefolders = async () => {
  try {
    // Run the chmod command to set permissions to 777
    const command_chmod = `rm -rf ${home}/server/ui_host/build && rm -rf ${home}/server/sv_host`;
    const { stdout, stderr } = await execAsync(command_chmod);

    // Check for any stderr output
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    console.log(`stdout: ${stdout}`);
    console.log('old folders deleted successfully.');
  } catch (error) {
    console.error(`Error old folder delete ${error.message}`);
  }
};

// Endpoint to get available Wi-Fi networks
router.get('/api/control/get/networks', async (req, res) => {
  try {
    // Check if the device is connected to Wi-Fi
    const connectedWifi = await checkWifiConnection();

    // Scan for available networks, regardless of the connection status
    wifi.scan((error, networks) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to scan Wi-Fi networks' });
      } else {
        // Send both the connected Wi-Fi status and available networks
        return res.status(200).json({
          connected: connectedWifi ? true : false, // Indicates if connected to Wi-Fi
          connectedWifi: connectedWifi || null, // The SSID of the connected Wi-Fi, or null if not connected
          networks: networks // List of available networks
        });
      }
    });
  } catch (error) {
    console.error(`Error: ${error}`);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

router.get('/api/control/conn/networks/:selectedNetwork/:password', async (req, res) => {
  const network = req.params.selectedNetwork;
  const password = req.params.password;

  console.log('Trying to connect to:', network, password);

  try {
    // Wait for the Wi-Fi connection attempt
    const result = await handleWifiConnection(network, password, '1111'); // Replace '1111' with the actual sudo password if needed
    console.log('Connection result:', result);

    // Send the connection result back to the client
    res.status(200).json({ message: 'Wi-Fi connection successful', result });
  } catch (error) {
    console.error('Failed to connect to Wi-Fi:', error);

    // Send an error response to the client
    res.status(500).json({ message: 'Failed to connect to Wi-Fi', error: error.message });
  }
});

router.get('/api/control/disk', async (req, res) => {
  try {
    console.log('disk');
    disk.check('/', (error, info) => {
      if (error) {
        res.status(500).json({ error: 'Failed to check disk usage' });
      } else {
        res.json(info);
        console.log(info);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

router.get('/api/control/update', async (req, res) => {

  console.log('update');


  const fileUrl = 'http://141.164.60.140:3000/download'; // 서버의 다운로드 경로
  const savePath = `${home}/server/update/update.sh`; // 저장할 파일 경로


  (async () => {
    try {
      await downloadFile(fileUrl, savePath);
      await changePermissions(savePath);

      await removefolders();

      await executeUpdate(savePath);

      console.log('Update complete.');

      // Now you can run the update script
      // const command_run = `sh ${savePath}`;
      // exec(command, (error, stdout, stderr) => {
      //   if (error) {
      //     console.error(`Error running the update script: ${error.message}`);
      //     return;
      //   }
      //   if (stderr) {
      //     console.error(`stderr: ${stderr}`);
      //     return;
      //   }
      //   console.log(`stdout: ${stdout}`);
      // });

    } catch (err) {
      console.error('Download failed:', err.message);
    }
  })();


  res.status(200).json({'message': 'update success'});

});

export async function generateDataset(trainCount, testCount, validCount, images, classes, projectpath, trainImagesPath, trainLabelsPath, testImagesPath, testLabelsPath, validImagesPath, validLabelsPath) {
  // Helper function to process each image
  async function processImage(image, imagePath, newImagePath, newLabelPath) {
    try {
      // Copy the image to the new location
      await fs.copyFile(imagePath, newImagePath);

      let labelData = ''; 

      // Process each class and add bounding box data to the label file
      for (let j = 0; j < classes.length; j++) {
        const boxes = await getBoxesByClass(image.Name, classes[j].Name);
        if (boxes && boxes.length > 0) {
          boxes.forEach(box => {
            const { x, y, w, h } = box;
            // Format data in YOLO format: classIndex x y w h
            labelData += `${j} ${x} ${y} ${w} ${h}\n`;
          });
        }
      }

      // Write the label data to a file
      await fs.writeFile(newLabelPath, labelData);
    } catch (err) {
      console.error(`Error processing ${image.Name}:`, err);
    }
  }

  // Generate training images/labels
  for (let i = 0; i < trainCount; i++) {
    const image = images[i];
    const imagePath = `${projectpath}/data/${image.Name}`;
    const newImagePath = `${trainImagesPath}/${image.Name}`;
    const newLabelPath = `${trainLabelsPath}/${image.Name.replace('.jpg', '.txt')}`;

    await processImage(image, imagePath, newImagePath, newLabelPath);
  }

  // Generate test images/labels
  for (let i = trainCount; i < trainCount + testCount; i++) {
    const image = images[i];
    const imagePath = `${projectpath}/data/${image.Name}`;
    const newImagePath = `${testImagesPath}/${image.Name}`;
    const newLabelPath = `${testLabelsPath}/${image.Name.replace('.jpg', '.txt')}`;

    await processImage(image, imagePath, newImagePath, newLabelPath);
  }

  // Generate validation images/labels
  for (let i = trainCount + testCount; i < trainCount + testCount + validCount; i++) {
    const image = images[i];
    const imagePath = `${projectpath}/data/${image.Name}`;
    const newImagePath = `${validImagesPath}/${image.Name}`;
    const newLabelPath = `${validLabelsPath}/${image.Name.replace('.jpg', '.txt')}`;

    await processImage(image, imagePath, newImagePath, newLabelPath);
  }

  console.log("Dataset generation completed!");
}

async function resetDirectories(projectname) {

  const projectpath = `${home}/server/projects/${projectname}/databases`;
  const trainImagesPath = `${projectpath}/train/images`;
  const trainLabelsPath = `${projectpath}/train/labels`;
  const testImagesPath = `${projectpath}/test/images`;
  const testLabelsPath = `${projectpath}/test/labels`;
  const validImagesPath = `${projectpath}/valid/images`;
  const validLabelsPath = `${projectpath}/valid/labels`;

  try {
    // Remove directories if they exist
    await fs.rmdir(trainImagesPath, { recursive: true });
    await fs.rmdir(trainLabelsPath, { recursive: true });
    await fs.rmdir(testImagesPath, { recursive: true });
    await fs.rmdir(testLabelsPath, { recursive: true });
    await fs.rmdir(validImagesPath, { recursive: true });
    await fs.rmdir(validLabelsPath, { recursive: true });
    console.log("Folders removed successfully.");
  } catch (error) {
    // Catch any errors, including directories not existing
    console.log("Some directories may not exist. Skipping removal.");
  }

  try {
    // Recreate directories
    await fs.mkdir(trainImagesPath, { recursive: true });
    await fs.mkdir(trainLabelsPath, { recursive: true });
    await fs.mkdir(testImagesPath, { recursive: true });
    await fs.mkdir(testLabelsPath, { recursive: true });
    await fs.mkdir(validImagesPath, { recursive: true });
    await fs.mkdir(validLabelsPath, { recursive: true });
    console.log("Folders created successfully.");
  } catch (error) {
    // Catch errors related to directory creation
    console.error("Error creating directories:", error);
  }
}

router.post('/api/control/generate', async (req, res) => {
  try {
    const { projectname, trainratio, testratio, validratio ,imagenum } = req.body;

    const projectpath = `${home}/server/projects/${projectname}/databases`;
    const trainImagesPath = `${projectpath}/train/images`;
    const trainLabelsPath = `${projectpath}/train/labels`;
    const testImagesPath = `${projectpath}/test/images`;
    const testLabelsPath = `${projectpath}/test/labels`;
    const validImagesPath = `${projectpath}/valid/images`;
    const validLabelsPath = `${projectpath}/valid/labels`;

    resetDirectories(projectname);

    // //delete train test valid folders
    // try{
    // awaitfs.rmdirSync(trainImagesPath, { recursive: true });
    // fs.rmdirSync(trainLabelsPath, { recursive: true });
    // fs.rmdirSync(testImagesPath, { recursive: true });
    // fs.rmdirSync(testLabelsPath, { recursive: true });
    // fs.rmdirSync(validImagesPath, { recursive: true });
    // fs.rmdirSync(validLabelsPath, { recursive: true });
    // }
    // catch (error)
    // {
    //   console.log('no folders');
    // }


    // fs.mkdirSync(trainImagesPath, { recursive: true });
    // fs.mkdirSync(trainLabelsPath, { recursive: true });
    // fs.mkdirSync(testImagesPath, { recursive: true });
    // fs.mkdirSync(testLabelsPath, { recursive: true });
    // fs.mkdirSync(validImagesPath, { recursive: true });
    // fs.mkdirSync(validLabelsPath, { recursive: true });

    let trainCount = Math.floor(imagenum * (trainratio / 100));
    let testCount = Math.floor(imagenum * (testratio / 100));
    let validCount = Math.floor(imagenum * (validratio / 100));
  
    // 할당되지 않은 이미지의 개수 (소수점 때문에 발생하는 나머지 처리)
    let remainingImages = imagenum - (trainCount + testCount + validCount);
  
    // 남은 이미지를 훈련 세트에 우선적으로 할당
    trainCount += remainingImages;

    //copy train images
    const images = await getImages(projectname);
    const classes = await getClasses(projectname);

    console.log(0,trainCount);
    console.log(trainCount,trainCount+testCount);
    console.log(trainCount+testCount,trainCount+testCount+validCount);


    await generateDataset(trainCount, testCount, validCount, images, classes, projectpath, trainImagesPath, trainLabelsPath, testImagesPath, testLabelsPath, validImagesPath, validLabelsPath);
    //generate train images/labels
    // for (let i = 0; i < trainCount; i++) {
    //   //perimage
    //   const image = images[i];
    //   const imagepath = `${projectpath}/data/${image.Name}`;
    //   const newimagepath = `${trainImagesPath}/${image.Name}`;
    //   //const newlabelpath = `${trainLabelsPath}/${image.Name}.txt`;
    //   // Change the file extension from .jpg to .txt
    //   const newlabelpath = `${trainLabelsPath}/${image.Name.replace('.jpg', '.txt')}`;

    //   //copy images
    //   fs.copyFile(imagepath, newimagepath, (err) => {
    //     if (err) {
    //       console.error(`Error copying image for ${image.Name}:`, err);
    //     } else {
    //       //console.log(`Image copied: ${newimagepath}`);
    //     }
    //   });

    //   let labelData = ''; 

    //   //perclasses
    //   for (let j = 0; j < classes.length; j++) {
    //     const boxes = await getBoxesByClass(image.Name, classes[j].Name);
    //     if (boxes && boxes.length > 0) {
    //       boxes.forEach(box => {
    //         const { x, y, w, h } = box;
    //         // Assuming you want to format the data as: classIndex x y w h (standard YOLO format)
    //         labelData += `${j} ${x} ${y} ${w} ${h}\n`;
    //       });
    //     }
    //   }

    //   fs.writeFile(newlabelpath, labelData, function (err) {
    //     if (err) {
    //       console.error(`Error writing file for ${image.Name}:`, err);
    //     } else {
    //       //console.log(`Label file created: ${newlabelpath}`);
    //     }
    //   });
    // }

    // //generate test images/labels
    // for (let i = trainCount; i < trainCount+testCount; i++) {
    //   //perimage
    //   const image = images[i];
    //   const imagepath = `${projectpath}/data/${image.Name}`;
    //   const newimagepath = `${testImagesPath}/${image.Name}`;
    //   //const newlabelpath = `${testLabelsPath}/${image.Name}.txt`;
    //   // Change the file extension from .jpg to .txt
    //   const newlabelpath = `${trainLabelsPath}/${image.Name.replace('.jpg', '.txt')}`;


    //   //copy images
    //   fs.copyFile(imagepath, newimagepath, (err) => {
    //     if (err) {
    //       console.error(`Error copying image for ${image.Name}:`, err);
    //     } else {
    //       //console.log(`Image copied: ${newimagepath}`);
    //     }
    //   });

    //   let labelData = ''; 

    //   //perclasses
    //   for (let j = 0; j < classes.length; j++) {
    //     const boxes = await getBoxesByClass(image.Name, classes[j].Name);
    //     if (boxes && boxes.length > 0) {
    //       boxes.forEach(box => {
    //         const { x, y, w, h } = box;
    //         // Assuming you want to format the data as: classIndex x y w h (standard YOLO format)
    //         labelData += `${j} ${x} ${y} ${w} ${h}\n`;
    //       });
    //     }
    //   }

    //   fs.writeFile(newlabelpath, labelData, function (err) {
    //     if (err) {
    //       console.error(`Error writing file for ${image.Name}:`, err);
    //     } else {
    //       //console.log(`Label file created: ${newlabelpath}`);
    //     }
    //   });
    // }

    // //generate valid images/labels
    // for (let i = trainCount+testCount; i < trainCount+testCount+validCount; i++) {
    //   //perimage
    //   const image = images[i];
    //   const imagepath = `${projectpath}/data/${image.Name}`;
    //   const newimagepath = `${validImagesPath}/${image.Name}`;
    //   //const newlabelpath = `${validLabelsPath}/${image.Name}.txt`;
    //   // Change the file extension from .jpg to .txt
    //   const newlabelpath = `${trainLabelsPath}/${image.Name.replace('.jpg', '.txt')}`;

    //   //copy images
    //   fs.copyFile(imagepath, newimagepath, (err) => {
    //     if (err) {
    //       console.error(`Error copying image for ${image.Name}:`, err);
    //     } else {
    //       //console.log(`Image copied: ${newimagepath}`);
    //     }
    //   });

    //   let labelData = ''; 

    //   //perclasses
    //   for (let j = 0; j < classes.length; j++) {
    //     const boxes = await getBoxesByClass(image.Name, classes[j].Name);
    //     if (boxes && boxes.length > 0) {
    //       boxes.forEach(box => {
    //         const { x, y, w, h } = box;
    //         // Assuming you want to format the data as: classIndex x y w h (standard YOLO format)
    //         labelData += `${j} ${x} ${y} ${w} ${h}\n`;
    //       });
    //     }
    //   }

    //   fs.writeFile(newlabelpath, labelData, function (err) {
    //     if (err) {
    //       console.error(`Error writing file for ${image.Name}:`, err);
    //     } else {
    //       //console.log(`Label file created: ${newlabelpath}`);
    //     }
    //   });
    // }
    

    //generate yaml file
    const yamlData = `
    train: ${projectpath}/train/images
    val: ${projectpath}/valid/images
    test: ${projectpath}/test/images

    nc: ${classes.length}
    names: [${classes.map(c => `'${c.Name}'`).join(', ')}]`

    const yamlPath = `${projectpath}/data2.yaml`;

    // Write to a file named 'data.yaml'
    fs.writeFile(yamlPath, yamlData, (err) => {
      if (err) throw err;
      console.log('YAML file has been written');
    });



    // set generated to 1
    const result = await generateDatasets(projectname);


    res.status(200).json({'message': 'generate success'});
    
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }


  
  // try {
  //   console.log('disk');
  //   disk.check('/', (error, info) => {
  //     if (error) {
  //       res.status(500).json({ error: 'Failed to check disk usage' });
  //     } else {
  //       res.json(info);
  //       console.log(info);
  //     }
  //   });
  // } catch (error) {
  //   res.status(500).json({ error: 'An unexpected error occurred' });
  // }
});


export default router;
