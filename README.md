# munsu

서문수 코덱스용 리포

## 백엔드: 금융감독원 적금 상품 수집

금융감독원 금융상품통합비교공시의 적금 API(`savingProductsSearch.json`)를 호출해 상품 기본정보와 금리 옵션을 합친 JSON 캐시를 생성합니다.
프론트엔드 목록 화면에서 정렬·필터링하기 쉽도록 `products` 배열 안에 상품별 금리 요약(`rateSummary`), 가입 방법 배열(`joinWays`), 저축기간 배열(`termMonths`), 금리 옵션 배열(`options`)을 함께 저장합니다.

## API 키 안전 사용 원칙

- `FINLIFE_API_KEY`는 **절대 프론트엔드 코드, GitHub 커밋, README 예시 값에 실제 키로 넣지 않습니다.** 백엔드 `.env` 또는 배포 서비스의 비밀 환경변수에만 저장합니다.
- `.env`, `backend/.env`, 생성된 JSON 캐시(`backend/data/*.json`)는 `.gitignore`에 포함되어 GitHub에 올라가지 않도록 했습니다.
- 프론트엔드는 `GET /api/savings`로 저장된 캐시만 조회합니다. 금융감독원 API를 직접 호출하거나 `FINLIFE_API_KEY`를 들고 있으면 안 됩니다.
- 금융감독원 API를 새로 호출하는 `POST /api/savings/refresh`는 `SAVINGS_REFRESH_TOKEN`이 있어야만 동작합니다. 이 토큰도 관리자/서버 작업용으로만 사용하고 프론트엔드 공개 코드에 넣지 않습니다.
- 배포 환경에서는 가능하면 주기 작업(cron, GitHub Actions secret, 서버 스케줄러 등)이나 관리자 도구에서만 갱신 API를 호출해 API 호출량과 키 노출 위험을 줄입니다.

## 환경변수 설정

```bash
cd backend
cp .env.example .env
# .env 파일의 FINLIFE_API_KEY에 금융감독원 인증키 입력
# SAVINGS_REFRESH_TOKEN에는 긴 랜덤 문자열 입력
```

랜덤 갱신 토큰 생성 예시:

```bash
openssl rand -hex 32
```

필수 환경변수:

- `FINLIFE_API_KEY`: 금융감독원 금융상품통합비교공시 인증키입니다. 호환을 위해 `FSS_API_KEY`도 인식하지만, 새 설정에는 `FINLIFE_API_KEY`를 권장합니다.
- `SAVINGS_REFRESH_TOKEN`: `POST /api/savings/refresh` 호출에 필요한 관리자 토큰입니다.

선택 환경변수:

- `CORS_ORIGIN`: 운영 프론트엔드 주소만 허용하려면 `http://localhost:3000,https://your-frontend.example.com`처럼 쉼표로 구분해 입력합니다. 비워두면 개발 편의를 위해 모든 origin을 허용합니다.
- `SAVINGS_AUTO_REFRESH_ON_MISS`: 저장된 캐시가 없을 때 `GET /api/savings`가 `FINLIFE_API_KEY`로 자동 수집을 시도할지 정합니다. 기본값은 자동 수집이며, `false`로 끌 수 있습니다.
- `FSS_TOP_FIN_GRP_NO`: 권역코드. 기본값은 은행(`020000`)입니다.
- `FSS_FINANCE_CD`: 특정 금융회사 코드 또는 이름으로 수집 범위를 좁힙니다.


## 코드스페이스에서 백엔드와 프론트엔드 함께 실행

터미널 1에서 백엔드를 실행합니다. 백엔드는 코드스페이스 외부 접속과 Vite 프록시가 모두 접근할 수 있도록 `0.0.0.0:5000`에서 실행됩니다.

```bash
cd backend
npm start
```

터미널 2에서 프론트엔드를 실행합니다. Vite 개발 서버는 `/api/*` 요청을 기본적으로 `http://127.0.0.1:5000` 백엔드로 프록시하므로, 프론트엔드 코드에 코드스페이스의 긴 5000번 포트 URL을 직접 적지 않아도 됩니다.

```bash
cd frontend
npm run dev
```

다른 백엔드 주소로 프록시해야 하면 프론트엔드 실행 전에 `VITE_BACKEND_URL`을 설정합니다. 브라우저에서 프록시를 거치지 않고 직접 API를 호출해야 하는 배포 환경에서는 `VITE_API_BASE_URL`에 공개 백엔드 주소를 설정합니다.

```bash
VITE_BACKEND_URL=https://your-codespace-5000.app.github.dev npm run dev
VITE_API_BASE_URL=https://your-api.example.com npm run build
```

연결 확인은 다음 주소로 할 수 있습니다.

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/savings
```

## 수집 실행

CLI로 수집하면 프론트엔드가 볼 JSON 캐시가 `backend/data/savings-products.json`에 저장됩니다.

```bash
cd backend
npm run fetch:savings
```

## 서버 API

서버 실행:

```bash
cd backend
npm start
```

### 저장된 적금 목록 조회

프론트엔드는 이 API만 호출하면 됩니다.

```bash
curl http://localhost:5000/api/savings
```

### 적금 데이터 수동 갱신

관리자나 서버 작업에서만 호출하세요. `SAVINGS_REFRESH_TOKEN`과 같은 값을 `x-refresh-token` 헤더 또는 `Authorization: Bearer ...` 헤더로 전달해야 합니다.

```bash
curl -X POST http://localhost:5000/api/savings/refresh \
  -H "Content-Type: application/json" \
  -H "x-refresh-token: $SAVINGS_REFRESH_TOKEN"
```

특정 권역이나 금융회사만 갱신하고 싶으면 body에 값을 넣을 수 있습니다.

```bash
curl -X POST http://localhost:5000/api/savings/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SAVINGS_REFRESH_TOKEN" \
  -d '{"topFinGrpNo":"020000","financeCd":"국민"}'
```

응답 구조는 다음 형태입니다.

```json
{
  "meta": {
    "source": "금융감독원 금융상품통합비교공시 적금 API",
    "fetchedAt": "2026-06-03T00:00:00.000Z",
    "totalCount": 0,
    "optionCount": 0
  },
  "products": [
    {
      "id": "금융회사코드:상품코드",
      "companyName": "은행명",
      "productName": "상품명",
      "joinWays": ["인터넷"],
      "termMonths": [6, 12, 24],
      "rateSummary": {
        "minBasicRate": 2.5,
        "maxBasicRate": 3.0,
        "maxPreferentialRate": 4.0
      },
      "options": []
    }
  ]
}
```
