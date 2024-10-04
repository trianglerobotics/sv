import express from 'express';
// import { Dataset } from '../models/Class.js'; // 확장자 .js 추가

const router = express.Router();
// const { getNotes } =  require('../database.js');
import { getExamples,getProjects } from '../database.js';

router.get('/')

// 예시 라우트
router.get('/api/exam/examples', async (req, res) => {
  try {
    const examples = await getExamples();
    console.log(examples);
    res.json(examples); // 결과를 응답으로 전송
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;