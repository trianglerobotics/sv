import express from 'express';

import { getUserProjects,deleteUserProject,setModel,getUserModel,checkImported, importModel, resetModel,addProj,saveUserModel,updateProjectSection} from '../database.js';
import {copyAndRenameFolder,copyFilesAndFolders,deleteFilesAndFoldersExceptData,copyAndSaveFile} from '../filecontrol.js';  
import fs from 'fs';
import path  from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import os from 'os';

//For the watch the file changes
import WebSocket from 'ws';
import chokidar from 'chokidar';

import { promisify } from 'util';

const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const home  = os.homedir();

// For the file watch
const directoryPath = path.join(__dirname,'..','..','projects');

router.get('/')

router.use(bodyParser.json());

//Get project names
router.get('/api/user/project/info', async (req, res) => {
    try {
      const notes = await getUserProjects();
      res.json(notes); // 결과를 응답으로 전송
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

//Create new project
router.post('/api/user/project/create', async (req, res) => {
try {
    const { projectName, exampleType, initsection } = req.body;

    copyAndRenameFolder(`../examples/${exampleType}`, `../projects/${projectName}`, projectName, exampleType, initsection);

} catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
}
});

router.post('/api/user/dataset/create', async (req, res) => {
  try {
      const { datasetName, datasetType } = req.body;

      //send to the db
      addProj(datasetName,1,datasetType);
      // id Name Type func dbtype

      const dirPath = path.join(home,'server','projects',datasetName,'databases','data');
      fs.mkdirSync(dirPath, { recursive: true });

      res.status(200).json({ message: 'Project created successfully' });
      //send copy and handle file and folder

  } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
  });

//set user project model
router.post('/api/user/project/set/model', async (req, res) => {
  try {
      const { userprojname, selectedmodel } = req.body;
      res.status(200).json({ message: 'Model selected successfully' });
      setModel(userprojname, selectedmodel);
  } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

//get user project model
router.get('/api/user/project/get/model/:projectname', async (req, res) => {
  try {
    const {projectname} = req.params;
    const model = await getUserModel(projectname);
    res.json(model);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//get imported status
router.get('/api/user/project/check/imported/:projectname', async (req, res) => { 
  try {
    const {projectname} = req.params;
    const imported = await checkImported(projectname);
    res.json(imported);
  } catch (error) {
    
  }
});

router.post('/api/user/project/import/model', async (req, res) => {
  try {
    const { projectname, model } = req.body;

    //Model Import sequence
    // 1. Actual file transfer , success -> 2. DB update
    // 1. Actual file transfer, fail -> 2. ERROR

    //1. Actual file transfer
    const source = path.join(home, 'server','models', model);
    const destination = path.join(home, 'server','projects', projectname, 'databases');

    if(copyFilesAndFolders(source, destination) === true)
    {
      //2. DB update
      importModel(projectname, model);
      res.status(200).json({ message: 'Model imported successfully' });
    };

    //2. DB update
    importModel(projectname, model);
    res.status(200).json({ message: 'Model imported successfully' });

  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/api/user/project/reset/model', async (req, res) => {
  try {
    const { projectname, model } = req.body; 
    const destination = path.join(home, 'server','projects', projectname, 'databases');

    //Delete File except for the data folder
    deleteFilesAndFoldersExceptData(destination);

    resetModel(projectname, model);
    res.status(200).json({ message: 'Model Reset successfully' });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




//Delete user project
router.delete('/api/user/project/delete/:projectname', async (req, res) => {
  try {
    const {projectname} = req.params;
    //delete projectname folder
    const projectPath = path.join(__dirname, '../../projects', projectname);
    // Check if the folder exists
    if (fs.existsSync(projectPath)) {
      // Delete the folder and its contents
      fs.rmdir(projectPath, { recursive: true }, (err) => {
        if (err) {
          console.error('Error deleting project folder:', err);
          return res.status(500).json({ error: 'Failed to delete project folder' });
        }

        res.json({ message: `Project folder '${projectname}' deleted successfully` });
      });
    } else {
      res.status(404).json({ error: 'Project folder not found' });
    }

    //remove file from the database
    deleteUserProject(projectname);

  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Get the file contents
router.post('/api/user/project/new-file', async (req, res) => {
  try {
      const { userprojname, target , newFileName } = req.body;

      const filePath = path.join(__dirname, target, newFileName);

      fs.writeFile(filePath, '', (err) => {
        if (err) {
          console.error('Error creating file:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json({ message: 'File created successfully' });
      });
  } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
  });

// router.post('/api/user/project/delete/file', (req, res) => {
//   try {
//     const { projectname, projectlocation , targetfile } = req.body;

//     const filePath = path.join(home,'server','projects', projectname, projectlocation,targetfile);
//     console.log('delete file',filePath);
//     res.status(200).json({ message: 'File deleted successfully' });
//     fs.access(filePath, fs.constants.F_OK, (err) => {
//       if (err) {
//         console.error('File does not exist:', err);
//         return res.status(404).json({ error: 'File not found' });
//       }

//       fs.unlink(filePath, (err) => {
//         if (err) {
//           console.error('Error deleting file:', err);
//           return res.status(500).json({ error: 'Internal Server Error' });
//         }
//         res.status(200).json({ message: 'File deleted successfully' });
//       });
//     });
// } catch (error) {
//     console.error('Error fetching notes:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
// }
// });

router.post('/api/user/project/delete/file', (req, res) => {
  try {
    const { projectname, projectlocation, targetfile } = req.body;

    const filePath = path.join(home, 'server', 'projects', projectname, projectlocation, targetfile);
    console.log('Attempting to delete file:', filePath);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error('File does not exist:', err);
        return res.status(404).json({ error: 'File not found' });
      }

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        console.log('File deleted successfully:', filePath);
        res.status(200).json({ message: 'File deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Error handling file deletion:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/api/user/project/file-content', async (req, res) => {
  try {
      const { userprojname, userchapter, selectedFile  } = req.body;
      const filePath = path.join('../', userprojname, userchapter, selectedFile);
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return res.status(500).send('Error reading file');
        }
        res.send(data);
      });
  
  } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
  });

router.post('/api/user/project/save-file-content', async (req, res) => {
  try {
      const { userprojname, userchapter, selectedFile, fileContent  } = req.body;
      const filePath = path.join( selectedFile);
    
      fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
          return res.status(500).send('Error writing file');
        }
        res.send('File saved');
      });
  
  } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
  });


router.post('/api/user/model/save', async (req, res) => {
  const {projectname,filename,uuid,newname} = req.body;

  //save model to the models/usermodel/uuid.pth
  const source = path.join(home, 'server','projects', projectname, 'databases', 'checkpoints', filename);
  const destination = path.join(home, 'server', 'models', 'usermodels', `${uuid}.pth`);

  const model = await getUserModel(projectname);

  copyAndSaveFile(source, destination)
  
  const result = await saveUserModel(newname,model[0].model,uuid)
});

router.post('/api/user/project/save/update/section', async (req, res) => {
  const {projectname,section,subsection} = req.body;
  console.log('update section',projectname,section,subsection);
  updateProjectSection(projectname,section,subsection);
  //update db
  return res.status(200).json({ message: 'section updated successfully' });

});

export default router; 