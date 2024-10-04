import fs from 'fs-extra';
import path  from 'path';
import {addUserProjNames} from "./database.js";

export async function copyAndRenameFolder(sourceDir ,destDir , projectName, exampleType, initsection) {
    try {
        await fs.copy(sourceDir, destDir);
        console.log('Folder copied successfully');

        //Add file ane type to the database
        addUserProjNames(projectName, exampleType, initsection);

    } catch (err) {
        console.error('Error copying folder:', err);
    }
}

export async function copyAndSaveFile(source, destination) {
    try {
      await fs.copy(source, destination);
      console.log('File copied successfully');
      return true;
    } catch (error) {
      console.error('Error copying file:', error);
    }
  }

export async function copyFilesAndFolders(source, destination) {
    try {
      // Read the files and folders from the source directory
      const files = await fs.readdir(source);
  
      // Loop through each file/folder
      for (const file of files) {
        const sourceFile = path.join(source, file);
        const destFile = path.join(destination, file);
  
        // Check if the current item is a directory or a file
        const stat = await fs.lstat(sourceFile);
  
        if (stat.isDirectory()) {
          // If it's a directory, recursively copy it
          await fs.mkdir(destFile, { recursive: true });
          await copyFilesAndFolders(sourceFile, destFile);
        } else {
          // If it's a file, copy it
          await fs.copyFile(sourceFile, destFile);
        }
      }
      return true;
    } catch (error) {
      console.error('Error copying files:', error);
    }
  }

  
export  async function deleteFilesAndFoldersExceptData(destination) {
    try {
      // Read the files and folders from the directory
      const files = await fs.readdir(destination);
  
      // Loop through each file/folder
      for (const file of files) {
        const filePath = path.join(destination, file);
  
        // Skip the "data" directory
        if (file === 'data') {
          continue;
        }
  
        // Check if the current item is a directory or a file
        const stat = await fs.lstat(filePath);
  
        if (stat.isDirectory()) {
          // If it's a directory, remove it recursively
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          // If it's a file, remove it
          await fs.unlink(filePath);
        }
      }
  
      console.log('Deletion completed, excluding the "data" directory.');
    } catch (error) {
      console.error('Error deleting files and folders:', error);
    }
  }
  
  
