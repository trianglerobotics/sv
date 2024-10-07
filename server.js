import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
// import { Dataset } from './models/Class.js'; // 확장자 .js 추가
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import chokidar from 'chokidar';

// 라우트 및 기타 모듈 가져오기
import ClassRoute from './routes/databaseroute.js';
import ImageRoute from './routes/imageroute.js';
import ExamRoute from './routes/examroute.js';
import UserProjRoute from './routes/userprojroute.js';
import ProjectRoute from './routes/projectroute.js';

// route to control jajucha
import ControlRoute from "./routes/controlroute.js";
import dgram from 'dgram';

import session from 'express-session';

import disk from 'diskusage';
// 데이터베이스 모듈 가져오기
// import { getDatabases } from './database.js';

const motorserver = dgram.createSocket('udp4');

// Define the IP address and port to listen on
const HOST = '127.0.0.1';
const PORT = 33333;

// Event listener for incoming messages
motorserver.on('message', (msg, rinfo) => {
  console.log(`${msg.toString()}`);
});

// Event listener for handling errors
motorserver.on('error', (err) => {
  console.log(`Server error:\n${err.stack}`);
  server.close();
});

// Event listener when the server starts listening
motorserver.on('listening', () => {
  const address = server.address();
  console.log(`Server listening on ${address.address}:${address.port}`);
});

// Bind the server to the specified address and port
// motorserver.bind(PORT, HOST, () => {
//   console.log(`Server is binding to ${HOST}:${PORT}`);
// });


const app = express();
const server = http.createServer(app);
const port = 4000;

const version = 1.0;

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const directoryPath = path.join(__dirname,'..','projects');

const io = new Server(server, {
    cors: {
      origin: "*", // Allow access from this origin
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

const allowedOrigins = [
  'http://121.184.63.113:3000'
];
  
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      // If the origin isn't in the allowed list, block the request
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    // If the origin is in the allowed list, allow the request
    return callback(null, true);
  },
  credentials: true,          // Allow credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 200   // For legacy browser support
}));

console.log("started");

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Middleware
app.use(bodyParser.json());

app.use('/', ClassRoute);
app.use('/', ImageRoute);
app.use('/', ExamRoute);
app.use('/', ControlRoute);
app.use('/', UserProjRoute);
app.use('/', ProjectRoute);

app.use(
  session({
    secret: 'your_secret_key', // Replace with your own secret key
    resave: false,
    saveUninitialized: false,
    //store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/your_database' }), // Replace with your MongoDB URL
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
  })
);

app.get('/api/version', (req, res) => {
  res.send({ version });
});

app.post('/api/login', async (req, res) => {
  // const { email, password } = req.body;
  // const user = await User.findOne({ where: { email } });

  // if (!user) return res.status(400).send('Invalid email or password.');

  // const validPassword = await bcrypt.compare(password, user.password);
  // if (!validPassword) return res.status(400).send('Invalid email or password.');

  // // Store user info in session
  // req.session.userId = user.id;

  // res.send({ message: 'Logged in successfully' });
  if (req.session.num === undefined)
    {
      req.session.num = 1; // 세션 등록
    } // 세션이 없다면
  else
  {
    req.session.num += 1;
  }
  console.log(req.session.num); 
  res.send(`${req.session.num}번 접속`);
});

io.on('connection', (socket) => {
    // console.log('A client connected');
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

app.post('/center', (req, res) => {
    const image = req.body.image;
    io.emit('center', image);
    res.sendStatus(200);
    // console.log("image received");
});

app.post('/left', (req, res) => {
  const image = req.body.image;
  io.emit('left', image);
  res.sendStatus(200);
  // console.log("image received");
});

app.post('/right', (req, res) => {
  const image = req.body.image;
  io.emit('right', image);
  res.sendStatus(200);
  // console.log("image received");
});

app.post('/depth', (req, res) => {
  const image = req.body.image;
  io.emit('depth', image);
  res.sendStatus(200);
  // console.log("image received");
});

app.get('/stop', (req, res) => {

  const destIP = '121.184.63.113';
  const destPort = 22222;
  //send udp signal to stop
  const message = Buffer.from('45455009');
  motorserver.send(message, 0, message.length, destPort, destIP, (err) => {
    if (err) {
        console.log('Error sending message:', err);
    } else {
        console.log(`Message sent to ${destIP}:${destPort}`);
        res.sendStatus(200);
    }
    //motorserver.close(); // Close the socket after sending the message
  });

  console.log("stop signal sent");
});

//Watch the file changes
const wss = new WebSocket.Server({ port: 1122 });
wss.on('connection', ws => {
  });

function broadcast(message) {
  wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      }
  });
}

// Initialize watcher
const watcher = chokidar.watch(directoryPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: false,
    followSymlinks: true,
    depth: 99, // Watch all subdirectories
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 30
    }
  });
  
  // Add event listeners
  watcher
    .on('add', filePath => {
      //console.log(`File ${filePath} has been added`);
      broadcast('file-added');
    })
    .on('change', filePath => {
      //console.log(`File ${filePath} has been changed`);
      broadcast('file-changed');
    })
    .on('unlink', filePath => {
      //console.log(`File ${filePath} has been removed`);
      broadcast('file-removed');
    })
    .on('addDir', dirPath => {
      //console.log(`Directory ${dirPath} has been added`);
      broadcast('dir-added');
    })
    .on('unlinkDir', dirPath => {
      //console.log(`Directory ${dirPath} has been removed`);
      broadcast('dir-removed');
    })
    .on('error', error => console.log(`Watcher error: ${error}`));


server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

