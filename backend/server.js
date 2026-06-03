const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // 비밀 키 사용 준비

const {
  readSavingsProducts,
  refreshSavingsProducts,
} = require('./services/fssSavingsService');

const app = express();
const PORT = process.env.PORT || 5000; // 백엔드 서버는 5000번 포트에서 실행
const REFRESH_TOKEN = process.env.SAVINGS_REFRESH_TOKEN || '';
const AUTO_REFRESH_ON_MISS = process.env.SAVINGS_AUTO_REFRESH_ON_MISS !== 'false';
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// 내 크롬 브라우저에서 오는 신호를 막지 않도록 CORS 허용
// 운영환경에서는 CORS_ORIGIN에 실제 프론트엔드 주소만 쉼표로 구분해 넣어 제한할 수 있습니다.
app.use(cors({
  origin(origin, callback) {
    if (!origin || CORS_ALLOWED_ORIGINS.length === 0 || CORS_ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('허용되지 않은 CORS origin입니다.'));
  },
}));
app.use(express.json());

// 제대로 작동하는지 테스트용 주소 (http://localhost:5000/api/test)
app.get('/api/test', (req, res) => {
  res.json({ message: '백엔드 서버가 성공적으로 연결되었습니다!' });
});

// 코드스페이스/배포 상태 확인용 주소
app.get('/api/health', async (req, res) => {
  try {
    const data = await readSavingsProducts();

    res.json({
      ok: true,
      cacheReady: true,
      totalCount: data.meta?.totalCount ?? data.products?.length ?? 0,
      fetchedAt: data.meta?.fetchedAt ?? null,
    });
  } catch (error) {
    res.status(error.code === 'ENOENT' ? 200 : 500).json({
      ok: error.code === 'ENOENT',
      cacheReady: false,
      message: error.code === 'ENOENT'
        ? '적금 상품 캐시가 아직 없습니다. FINLIFE_API_KEY가 있으면 GET /api/savings에서 자동 생성할 수 있습니다.'
        : '적금 상품 캐시 상태를 확인하지 못했습니다.',
      detail: error.message,
    });
  }
});

// 프론트엔드 목록 화면에서 바로 쓰기 좋은 적금 상품 캐시 조회
// 저장된 캐시가 없고 FINLIFE_API_KEY가 있으면 코드스페이스 첫 실행 편의를 위해 1회 자동 갱신합니다.
app.get('/api/savings', async (req, res) => {
  try {
    const data = await readSavingsProducts();
    res.json(data);
  } catch (error) {
    if (error.code === 'ENOENT' && AUTO_REFRESH_ON_MISS && hasFinlifeApiKey()) {
      try {
        const data = await refreshSavingsProducts();
        res.json(data);
        return;
      } catch (refreshError) {
        res.status(502).json({
          message: '저장된 적금 상품 데이터가 없어 금융감독원 API에서 자동 갱신을 시도했지만 실패했습니다.',
          detail: refreshError.message,
        });
        return;
      }
    }

    const statusCode = error.code === 'ENOENT' ? 404 : 500;
    res.status(statusCode).json({
      message: statusCode === 404
        ? '저장된 적금 상품 데이터가 없습니다. 먼저 인증된 POST /api/savings/refresh 또는 npm run fetch:savings를 실행하세요.'
        : '적금 상품 데이터를 불러오지 못했습니다.',
      detail: error.message,
    });
  }
});

// 금융감독원 API에서 최신 적금 상품을 가져와 JSON 파일로 저장
// 이 엔드포인트는 SAVINGS_REFRESH_TOKEN으로 보호되어야 하며, 프론트엔드 공개 코드에서 호출하지 않습니다.
app.post('/api/savings/refresh', requireRefreshToken, async (req, res) => {
  try {
    const data = await refreshSavingsProducts({
      topFinGrpNo: req.body.topFinGrpNo || req.query.topFinGrpNo,
      financeCd: req.body.financeCd || req.query.financeCd,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: '금융감독원 적금 API 동기화에 실패했습니다.',
      detail: error.message,
    });
  }
});

function requireRefreshToken(req, res, next) {
  if (!REFRESH_TOKEN) {
    res.status(503).json({
      message: '관리자 갱신 토큰이 설정되지 않았습니다. SAVINGS_REFRESH_TOKEN 환경변수를 설정하세요.',
    });
    return;
  }

  const requestToken = getRefreshTokenFromRequest(req);
  if (!requestToken || !safeEqual(requestToken, REFRESH_TOKEN)) {
    res.status(401).json({ message: '적금 상품 갱신 권한이 없습니다.' });
    return;
  }

  next();
}

function getRefreshTokenFromRequest(req) {
  const headerToken = req.get('x-refresh-token');
  const authorization = req.get('authorization') || '';

  if (headerToken) {
    return headerToken;
  }

  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim();
  }

  return '';
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hasFinlifeApiKey() {
  return Boolean(process.env.FINLIFE_API_KEY || process.env.FSS_API_KEY);
}

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 백엔드 서버가 ${PORT}번 포트에서 신나게 돌아가는 중!`);
  });
}

module.exports = app;
