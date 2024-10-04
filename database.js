import mysql from 'mysql2';
// const mysql = require('mysql2');
import dotenv from 'dotenv';
// const dotenv = require('dotenv');

dotenv.config()

const pool = mysql.createPool(
    {
        host: '127.0.0.1',
        user: 'root',
        password: '1111',
        database: 'datasets'
    }).promise()

export async function getDatabases() {
    const [rows] = await pool.query("select Name,Type,func,dbtype from Projects where func >=0")
    return rows
    }

export async function addUserProjNames(projectName, exampleType, initsection) {
    const insertQuery = "INSERT INTO Projects (Name, Type, section, subsection,func) VALUES (?, ?, ?, ?, ?)";
    const typeQuery = "SELECT func FROM Examples WHERE Name = ?";
    const [type] = await pool.query(typeQuery, [exampleType]);
    const [result] = await pool.query(insertQuery, [projectName, exampleType, initsection, initsection, parseInt(type[0].func, 10)]);
    return result
}

export async function updateProjectSection(projectName, section, subsection) {
    const insertQuery = "UPDATE Projects SET section = ?, subsection = ? WHERE Name = ?";
    const [result] = await pool.query(insertQuery, [section, subsection, projectName]);
    return result
}

export async function addProj(projectName, projectType,databasetype) {
    const projtype = 'database';
    const [result] = await pool.query("INSERT INTO Projects (Name,func,dbtype,Type) values(?,?,?,?)",[projectName,projectType,databasetype,projtype]);
    return result
}

export async function setWorkingDirectory(projectname, location) {
    const [result] = await pool.query("UPDATE WorkingDirectory SET projectname = ? , location = ? WHERE id = 1", [projectname, location]);
    return result
}

export async function getWorkingDirectory() {
    const [result] = await pool.query("SELECT location from WorkingDirectory WHERE id = 1");
    return result
}

export async function getUserProjects() {
    const [rows] = await pool.query("SELECT * FROM Projects")
    return rows
}

export async function deleteUserProject(projectname) {
    const [result] = await pool.query("DELETE FROM Projects WHERE Name = ?", [projectname]);
    const [result2] = await pool.query("DELETE FROM Classes WHERE project = ?", [projectname]);
    return result;
  }

export async function getExamples() {
    const [rows] = await pool.query("SELECT * FROM Examples")
    return rows
    }

export async function getProjects() {
    const [rows] = await pool.query("SELECT * FROM UserProjects")
    return rows
    }

export async function getModels() {
    const [rows] = await pool.query("SELECT * FROM Models")
    return rows
    }

export async function setModel(projectname, selectedmodel) {
    const [result] = await pool.query("UPDATE Projects SET model = ? WHERE Name = ?", [selectedmodel, projectname]);
    return result
    }

export async function getUserModel(projectname) {
    const [rows] = await pool.query("SELECT model FROM Projects WHERE Name = ?", [projectname]);
    return rows
}

export async function checkImported(projectname) {
    const [rows] = await pool.query("SELECT imported FROM Projects WHERE Name = ?", [projectname]);
    return rows
}

export async function importModel(projectname, model) {
    const [result] = await pool.query("UPDATE Projects SET imported = 1 WHERE Name = ?", [projectname]);
    return result
}

export async function resetModel(projectname, model) {
    const [result] = await pool.query("UPDATE Projects SET imported = NULL WHERE Name = ?", [projectname]);
    return result
}

export async function checkUserModelExist(modelname) {
    const [rows] = await pool.query("SELECT Location FROM UserModels WHERE Name = ?", [modelname]);
    return rows
}

export async function getUserTrainedModels(modelname) {
    const [rows] = await pool.query("SELECT * FROM UserModels ");
    return rows
}

export async function deleteUserTrainedModels(modelname) {
    const [rows] = await pool.query("DELETE FROM UserModels WHERE Name = ?", [modelname]);
    return rows
}

export async function getTrainedModelsUUID(modelname) {
    const [rows] = await pool.query("SELECT uuid FROM UserModels WHERE Name = ?", [modelname]);
    return rows
}

export async function saveUserModel(newname,model,uuid) {
    const [result] = await pool.query("INSERT INTO UserModels (Name, Location ,Model,uuid) VALUES (?, ?, ? ,?)", [newname,'server/models/usermodels', model , uuid]);
    return result
}

export async function getClasses(projectname) 
{
    const [rows] = await pool.query("select Name,color from Classes where project=? ORDER BY Name ASC", [projectname])
    return rows
}

export async function getImages(projectname) 
{
    const [rows] = await pool.query("select Name from YoloImage where project=? ORDER BY Name ASC", [projectname])
    return rows
}

export async function addClass(classname,projectname,randomColor)
{
    const rows = await pool.query("insert into Classes (project,Name,color) values (?,?,?)",[projectname,classname,randomColor])
}

export async function addBoxes(Name,x,y,w,h,classname,color ,num)
{
    const rows = await pool.query("insert into YoloBoxes (Name,x,y,w,h,class,color,num) values (?,?,?,?,?,?,?,?)",[Name,x,y,w,h,classname,color,num])
}

//get boxes
export async function getBoxes(Name) 
{
    const [rows] = await pool.query("select * from YoloBoxes where Name=? ORDER BY Name ASC", [Name])
    return rows
}

export async function updateBoxes(Name,x,y,w,h,classname,color,num)
{
    const [rows] = await pool.query("update YoloBoxes set x=?,y=?,w=?,h=?,class=?,color=? where Name=? and num=?",[x,y,w,h,classname,color,Name,num])
}

export async function delClass(classname,projectname)
{
    const rows = await pool.query("delete from Classes where Name=? and project=?",[classname,projectname])
}

export async function checkClassExist(classname,projectname)
{
    const rows = await pool.query("select Name from Classes where Name=? and project=?",[classname,projectname]);
    try{
        const ret = rows[0][0].Name;
        return false
    }
    catch (error)
    {
        return true
    }
}

export async function createNote(title,content) {
    const result =  await pool.query(
        `INSERT INTO notes (title,contents)
         VALUES (?,?)`,[title, content]
    )
    return result
}
    