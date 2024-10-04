import express from 'express';
import fs from 'fs';
import os from 'os'
// import { Dataset } from '../models/Class.js'; // 확장자 .js 추가

const router = express.Router();
const home = os.homedir();
// const { getNotes } =  require('../database.js');
import { getDatabases, getClasses , checkClassExist, addClass, delClass , getModels,  getImages, addBoxes,getBoxes,updateBoxes,
  setWorkingDirectory,checkUserModelExist,getUserTrainedModels,deleteUserTrainedModels ,getTrainedModelsUUID, getWorkingDirectory } from '../database.js';

router.get('/')

router.get('/api/db/projects', async (req, res) => {
  try {
    const notes = await getDatabases();
    console.log(notes);
    res.json(notes); // 결과를 응답으로 전송
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/db/trainedmodels/get', async (req, res) => {
  try {
    const models = await getUserTrainedModels();
    //console.log(models);
    res.json(models);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/api/db/trainedmodels/delete/:modelToDelete', async (req, res) => {
  const { modelToDelete } = req.params;
  console.log(modelToDelete);
  try {
  //get the model uuid from the db
    const modeluuid = await getTrainedModelsUUID(modelToDelete);
    console.log(modeluuid[0].uuid);
    //delete the model from the file system
    const modelPath2 = `${home}/server/models/usermodels/${modeluuid[0].uuid}.pth`;
    //actual delete
    try {
      fs.unlinkSync(modelPath2);
      console.log('File deleted successfully');
    } catch (err) {
      console.error(err);
    }
  }
  catch (error) {
  }


  //delete from the db
  deleteUserTrainedModels(modelToDelete);
  res.json({ message: 'Model deleted successfully' });
});


router.get('/api/db/models/get', async (req, res) => {
  try{
    const models = await getModels();
    console.log(models)
    res.json(models);
  }
  catch (error)
  {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/db/classes/get/:projectname', async (req, res) => {
  const id = req.params.projectname;
  try {
    const classes = await getClasses(id);
    
    if(!classes)
    {
      return res.status(404).json({ error: 'classes not found' });
    }

    res.json(classes);
  }
  catch (error)
  {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/db/images/get/:projectname', async (req, res) => {
  const id = req.params.projectname;
  try {
    const images = await getImages(id);
    res.json(images);
  }
  catch (error)
  {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

router.post('/api/db/classes/add/:projectname', async (req, res) => {
  const projectname = req.params.projectname;
  const dbtype = req.body.dbtype;
  const existArray = [];
  const { Name } = req.body;
  const home = os.homedir();
  const dataArray = Name.split(',');



  for (let i = 0; i < dataArray.length; i++) {
    const value = dataArray[i];
    const result = await checkClassExist(value,projectname);

    if(result != true && value != '')
    {
      existArray.push(value);
    }
  }
  if(existArray.length !== 0)
  {
    console.log('already exist')
    res.status(400).json({ 
      error: true, 
      message: 'Some classes already exist.', 
      array: existArray 
    });
  }
  else{
    for (let i = 0; i < dataArray.length; i++) {
      if(dataArray[i] != '')
      {
        const randomColor = getRandomColor();
        console.log('randomColor',randomColor);
        addClass(dataArray[i],projectname,randomColor);
        //Make folder to the target path
        if(dbtype == 'classification')
        {  
          const folderPath = `${home}/server/projects/${projectname}/databases/data/${dataArray[i]}`;
          try {
            fs.mkdirSync(folderPath);
            console.log('Directory created successfully!');
          } catch (err) {
            console.error(err);
          }
        }
      }
    }

    res.status(200).json({ message: 'class successfully added'});
  }
});


router.post('/api/db/boxes/add', async (req, res) => {
  const { Name, x, y, w, h, classname, color, num } = req.body;
  console.log(Name, x, y, w, h, classname, color, num);
  addBoxes(Name, x, y, w, h, classname, color, num);
  res.status(200).json({ message: 'box successfully added' });
});

router.post('/api/db/boxes/update', async (req, res) => {
  const { Name, x, y, w, h, classname, color, num } = req.body;
  console.log(Name, x, y, w, h, classname, color, num);
  updateBoxes(Name, x, y, w, h, classname, color, num);
  res.status(200).json({ message: 'box successfully updated' });
});

router.get('/api/db/boxes/get/:Name', async (req, res) => {
  const Name = req.params.Name;
  try {
    const boxes = await getBoxes(Name);
    res.json(boxes);
  }
  catch (error)
  {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/api/db/classes/del/:projectname', async (req, res) => {
  const projectname = req.params.projectname;
  const dbtype = req.body.dbtype;
  const existArray = [];
  const { Name } = req.body;
  const home = os.homedir();

  for (let i = 0; i < Name.length; i++) {
    const value = Name[i];
    console.log(value.Name);
    delClass(value.Name,projectname);

    //Delete folder to the target path
    if(dbtype == 'classification')
    {
      const folderPath = `${home}/server/projects/${projectname}/databases/data/${value.Name}`;
      try {
        fs.rmdirSync(folderPath,{ recursive: true, force: true });
        console.log('Directory deleted successfully!');
      } catch (err) {
        console.error(err);
      }
    }
  }

  res.status(200).json({ message: 'class successfully deleted'});
});

router.post('/api/db/set/WorkingDirectory', async (req, res) => {
  const { projectname, location } = req.body;
  console.log('Received:', projectname, location);
  // Add any logic needed to handle setting the working directory
  setWorkingDirectory(projectname, location);
  res.status(200).json({ message: 'Working Directory set successfully' });
});

router.get('/api/db/get/WorkingDirectory', async (req, res) => {

  // Add any logic needed to handle setting the working directory
  const dir = await getWorkingDirectory();
  console.log('Working Directory:', dir);
  res.status(200).json({ workingDirectory: dir, message: 'Working Directory retrieved successfully' });
});

router.post('/api/db/check/UserModel', async (req, res) => {
  const { modelname } = req.body;
  console.log('Received:', modelname);
  const location = await checkUserModelExist(modelname);
  console.log('location',location[0]);
  res.json(location);
});

// module.exports = router;

export default router;