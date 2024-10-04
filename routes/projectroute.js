import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/')

function listFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).map(dirent => {
      const fullPath = path.join(directoryPath, dirent.name);
      return dirent.isDirectory() 
          ? { name: dirent.name, type: 'directory', children: listFiles(fullPath) }
          : { name: dirent.name, type: 'file' };
  });
}

router.post('/api/example/tree', (req, res) => {
  console.log("filecalled");
  const { userprojname } = req.body;
  console.log(userprojname);

  // Resolve the target location to an absolute path
  const directoryPath = path.resolve(__dirname, "../../projects", userprojname,'learning', "filetree.json");
  console.log(directoryPath);

  // Function to read and parse JSON file
  const parseJsonFromFile = (filePath) => {
    try {
      // Read the file synchronously
      const jsonString = fs.readFileSync(filePath, 'utf8');
      
      // Parse the JSON string
      const jsonArray = JSON.parse(jsonString);
      
      // Return the parsed JSON array
      return jsonArray;
    } catch (error) {
      throw new Error('Error reading or parsing JSON file: ' + error.message);
    }
  };

  try {
    const parsedContent = parseJsonFromFile(directoryPath);

    // Send the parsed JSON content as a response
    res.json(parsedContent);
  } catch (err) {
    console.error('Error reading JSON file', err);
    res.status(500).send({ error: err.message });
  }
});


router.get('/api/update/section/:name/:section/:subsection', (req, res) => {
  const { name, section, subsection } = req.params;
  console.log(name, section, subsection);


  
});

router.use(express.static(path.join(__dirname, 'public')));
router.use(express.static(path.join(__dirname, '../../projects')));

router.get('/api/markdown/:name/:section/:subsection', (req, res) => {
  const { name,section,subsection } = req.params;
  const markdownFile = path.join(__dirname, `../../projects/${name}/learning/${section}/${subsection}/${subsection}.html`);
   console.log(markdownFile); 
   
  fs.readFile(markdownFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading markdown file:', err);
      res.status(500).send('Error reading markdown file');
      return;
    }
    res.json({ content: data });
    // res.send(data);
  });
});

router.use('/images', express.static(path.join(__dirname, 'images')));
router.use('/css', express.static(path.join(__dirname, 'css')));
router.use('/js', express.static(path.join(__dirname, 'js')));

router.post('/api/user/project/file-lists', (req, res) => {
  console.log("filecalled");
  const { targetLocation } = req.body;
  console.log(targetLocation);

  // Resolve the target location to an absolute path
  const directoryPath = path.resolve(__dirname, targetLocation);

  try {
    let files = listFiles(directoryPath);
    
    // Filter out hidden files and `.ipynb_checkpoints` directories recursively
    const filterFiles = (files) => {
      return files
        .filter(file => !file.name.startsWith('.') && file.name !== '.ipynb_checkpoints')
        .map(file => ({
          ...file,
          children: file.type === 'directory' ? filterFiles(file.children) : []
        }));
    };

    const visibleFiles = filterFiles(files);

    res.json(visibleFiles);
  } catch (err) {
    console.error('Error reading directory', err);
    res.status(500).send({ error: err.message });
  }
});



export default router;