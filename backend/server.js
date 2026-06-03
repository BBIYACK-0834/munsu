const express = require('express');
const cors = require('cors');
require('dotenv').config(); // 비밀 키 사용 준비

const app = express();
const PORT = 5000; // 백엔드 서버는 5000번 포트에서 실행

// 내 크롬 브라우저에서 오는 신호를 막지 않도록 CORS 허용
app.use(cors());
app.use(express.json());

// 제대로 작동하는지 테스트용 주소 (http://localhost:5000/api/test)
app.get('/api/test', (req, res) => {
    res.json({ message: "백엔드 서버가 성공적으로 연결되었습니다!" });
    });

    app.listen(PORT, () => {
        console.log(`🚀 백엔드 서버가 ${PORT}번 포트에서 신나게 돌아가는 중!`);
        });
        