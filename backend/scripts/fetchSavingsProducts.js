require('dotenv').config();

const { CACHE_FILE_PATH, refreshSavingsProducts } = require('../services/fssSavingsService');

async function main() {
  const data = await refreshSavingsProducts({
    topFinGrpNo: process.env.FSS_TOP_FIN_GRP_NO,
    financeCd: process.env.FSS_FINANCE_CD,
  });

  console.log(`적금 상품 ${data.meta.totalCount}개, 금리 옵션 ${data.meta.optionCount}개를 저장했습니다.`);
  console.log(`저장 위치: ${CACHE_FILE_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
