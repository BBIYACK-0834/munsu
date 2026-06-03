const fs = require('fs/promises');
const path = require('path');

const FINLIFE_API_BASE_URL = 'https://finlife.fss.or.kr/finlifeapi/savingProductsSearch.json';
const DEFAULT_TOP_FIN_GRP_NO = '020000'; // 020000: 은행
const CACHE_FILE_PATH = path.join(__dirname, '..', 'data', 'savings-products.json');
const JOIN_DENY_LABELS = {
  1: '제한없음',
  2: '서민전용',
  3: '일부제한',
};

function getFinlifeApiKey() {
  return process.env.FINLIFE_API_KEY || process.env.FSS_API_KEY;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function buildRequestUrl({ apiKey, topFinGrpNo, pageNo, financeCd }) {
  const url = new URL(FINLIFE_API_BASE_URL);
  url.searchParams.set('auth', apiKey);
  url.searchParams.set('topFinGrpNo', topFinGrpNo);
  url.searchParams.set('pageNo', String(pageNo));

  if (financeCd) {
    url.searchParams.set('financeCd', financeCd);
  }

  return url;
}

async function fetchSavingsPage({ apiKey, topFinGrpNo, pageNo, financeCd }) {
  const url = buildRequestUrl({ apiKey, topFinGrpNo, pageNo, financeCd });
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`금융감독원 API 요청 실패: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const result = payload.result;

  if (!result) {
    throw new Error('금융감독원 API 응답에 result가 없습니다.');
  }

  if (result.err_cd && result.err_cd !== '000') {
    throw new Error(`금융감독원 API 오류(${result.err_cd}): ${result.err_msg || '알 수 없는 오류'}`);
  }

  return result;
}

async function fetchAllSavingsProducts({
  apiKey = getFinlifeApiKey(),
  topFinGrpNo = process.env.FSS_TOP_FIN_GRP_NO || DEFAULT_TOP_FIN_GRP_NO,
  financeCd,
} = {}) {
  if (!apiKey) {
    throw new Error('FINLIFE_API_KEY 환경변수가 필요합니다. 호환을 위해 FSS_API_KEY도 사용할 수 있습니다.');
  }

  const firstPage = await fetchSavingsPage({ apiKey, topFinGrpNo, pageNo: 1, financeCd });
  const maxPageNo = toNumber(firstPage.max_page_no) || 1;
  const pages = [firstPage];

  for (let pageNo = 2; pageNo <= maxPageNo; pageNo += 1) {
    pages.push(await fetchSavingsPage({ apiKey, topFinGrpNo, pageNo, financeCd }));
  }

  return normalizeSavingsProducts({ pages, topFinGrpNo, financeCd });
}

function normalizeSavingsProducts({ pages, topFinGrpNo, financeCd }) {
  const baseList = pages.flatMap((page) => page.baseList || []);
  const optionList = pages.flatMap((page) => page.optionList || []);
  const optionsByProductKey = new Map();

  for (const option of optionList) {
    const productKey = createProductKey(option.fin_co_no, option.fin_prdt_cd);
    const normalizedOption = normalizeOption(option);

    if (!optionsByProductKey.has(productKey)) {
      optionsByProductKey.set(productKey, []);
    }

    optionsByProductKey.get(productKey).push(normalizedOption);
  }

  const products = baseList.map((base) => {
    const productKey = createProductKey(base.fin_co_no, base.fin_prdt_cd);
    const options = (optionsByProductKey.get(productKey) || []).sort(compareOptions);
    const rates = options.map((option) => option.maxRate).filter((rate) => rate !== null);
    const basicRates = options.map((option) => option.basicRate).filter((rate) => rate !== null);
    const terms = [...new Set(options.map((option) => option.termMonths).filter(Boolean))].sort((a, b) => a - b);

    return {
      id: productKey,
      disclosureMonth: sanitizeText(base.dcls_month),
      companyCode: sanitizeText(base.fin_co_no),
      companyName: sanitizeText(base.kor_co_nm),
      productCode: sanitizeText(base.fin_prdt_cd),
      productName: sanitizeText(base.fin_prdt_nm),
      joinWays: splitCommaText(base.join_way),
      joinWayText: sanitizeText(base.join_way),
      maturityInterest: sanitizeText(base.mtrt_int),
      preferentialCondition: sanitizeText(base.spcl_cnd),
      joinRestrictionCode: toNumber(base.join_deny),
      joinRestriction: JOIN_DENY_LABELS[base.join_deny] || sanitizeText(base.join_deny),
      joinMembers: sanitizeText(base.join_member),
      etcNote: sanitizeText(base.etc_note),
      maxLimit: toNumber(base.max_limit),
      disclosureStartDay: sanitizeText(base.dcls_strt_day),
      disclosureEndDay: sanitizeText(base.dcls_end_day),
      companySubmitDay: sanitizeText(base.fin_co_subm_day),
      termMonths: terms,
      rateSummary: {
        minBasicRate: basicRates.length ? Math.min(...basicRates) : null,
        maxBasicRate: basicRates.length ? Math.max(...basicRates) : null,
        maxPreferentialRate: rates.length ? Math.max(...rates) : null,
      },
      options,
    };
  });

  products.sort((a, b) => {
    const rateDiff = (b.rateSummary.maxPreferentialRate || 0) - (a.rateSummary.maxPreferentialRate || 0);
    if (rateDiff !== 0) {
      return rateDiff;
    }

    return `${a.companyName}${a.productName}`.localeCompare(`${b.companyName}${b.productName}`, 'ko');
  });

  return {
    meta: {
      source: '금융감독원 금융상품통합비교공시 적금 API',
      endpoint: FINLIFE_API_BASE_URL,
      topFinGrpNo,
      financeCd: financeCd || null,
      fetchedAt: new Date().toISOString(),
      totalCount: products.length,
      optionCount: optionList.length,
    },
    products,
  };
}

function normalizeOption(option) {
  return {
    disclosureMonth: sanitizeText(option.dcls_month),
    companyCode: sanitizeText(option.fin_co_no),
    productCode: sanitizeText(option.fin_prdt_cd),
    interestRateType: sanitizeText(option.intr_rate_type),
    interestRateTypeName: sanitizeText(option.intr_rate_type_nm),
    reserveType: sanitizeText(option.rsrv_type),
    reserveTypeName: sanitizeText(option.rsrv_type_nm),
    termMonths: toNumber(option.save_trm),
    basicRate: toNumber(option.intr_rate),
    maxRate: toNumber(option.intr_rate2),
  };
}

function compareOptions(a, b) {
  return (
    (a.termMonths || 0) - (b.termMonths || 0) ||
    a.reserveTypeName.localeCompare(b.reserveTypeName, 'ko') ||
    a.interestRateTypeName.localeCompare(b.interestRateTypeName, 'ko')
  );
}

function createProductKey(companyCode, productCode) {
  return `${sanitizeText(companyCode)}:${sanitizeText(productCode)}`;
}

function splitCommaText(value) {
  return sanitizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function saveSavingsProducts(data, filePath = CACHE_FILE_PATH) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);
  return data;
}

async function readSavingsProducts(filePath = CACHE_FILE_PATH) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function refreshSavingsProducts(options = {}) {
  const data = await fetchAllSavingsProducts(options);
  return saveSavingsProducts(data, options.filePath || CACHE_FILE_PATH);
}

module.exports = {
  CACHE_FILE_PATH,
  fetchAllSavingsProducts,
  refreshSavingsProducts,
  readSavingsProducts,
  saveSavingsProducts,
};
