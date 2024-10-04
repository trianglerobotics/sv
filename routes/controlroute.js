import express from 'express';
import wifi from 'node-wifi';
import disk from 'diskusage';
import { exec } from 'child_process';

const router = express.Router();

router.get('/')

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

// function connectToWifi(ssid, password, sudoPassword) {
//   const command = `echo '${sudoPassword}' | sudo -S nmcli device wifi connect "${ssid}" password "${password}"`;

//   console.log('Executing command:', command);

//   exec(command, (error, stdout, stderr) => {
//       if (error) {
//           console.error(`Error connecting to Wi-Fi: ${error.message}`);
//           return false;
//       }
//       if (stderr) {
//           console.error(`stderr: ${stderr}`);
//           return true;
//       }

//       console.log(`Connected to Wi-Fi: ${stdout}`);
//   });
// }
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

// Initialize wifi module
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});

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


// router.get('/api/control/conn/networks/:selectedNetwork/:password', async (req, res) => {
//   const network = req.params.selectedNetwork;
//   const password = req.params.password;
//   console.log('aaaa');
//   // res.status(200).json('hello');

//   //const status = checkWifiConnection();

//     console.log('try to connect',network, password);
//     //console.log(handleWifiConnection(network, password,'1111'));
//     res.status(200).json(handleWifiConnection(network, password,'1111'));
// });

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

export default router;
