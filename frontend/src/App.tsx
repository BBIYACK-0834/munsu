import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const SAVINGS_ENDPOINT = `${API_BASE_URL}/api/savings`
const MAX_MONTHLY_DEPOSIT = 10_000_000
const DEFAULT_MONTHLY_DEPOSIT = 200_000

interface SavingsOption {
  termMonths: number | null
  basicRate: number | null
  maxRate: number | null
  interestRateTypeName?: string
  reserveTypeName?: string
}

interface SavingsProduct {
  id: string
  companyName: string
  productName: string
  maturityInterest: string
  preferentialCondition?: string
  joinRestriction?: string
  joinWayText: string
  termMonths: number[]
  rateSummary: {
    maxPreferentialRate: number | null
    maxBasicRate: number | null
  }
  options: SavingsOption[]
}

interface SavingsResponse {
  meta?: {
    fetchedAt?: string
    totalCount?: number
  }
  products?: SavingsProduct[]
}

interface OptionItem {
  label: string
  value: string
}

interface BankFilterItem extends OptionItem {
  aliases: string[]
}

const BANK_FILTERS: BankFilterItem[] = [
  { label: '전체', value: '전체', aliases: [] },
  { label: '국민은행', value: '국민은행', aliases: ['국민은행', 'KB국민'] },
  { label: '신한은행', value: '신한은행', aliases: ['신한은행'] },
  { label: '우리은행', value: '우리은행', aliases: ['우리은행'] },
  { label: '하나은행', value: '하나은행', aliases: ['하나은행'] },
  { label: '농협은행', value: '농협은행', aliases: ['농협은행', 'NH농협'] },
  { label: '기업은행', value: '기업은행', aliases: ['기업은행', 'IBK'] },
  { label: '카카오뱅크', value: '카카오뱅크', aliases: ['카카오뱅크'] },
  { label: '케이뱅크', value: '케이뱅크', aliases: ['케이뱅크'] },
  { label: '토스뱅크', value: '토스뱅크', aliases: ['토스뱅크'] },
  { label: 'SC제일은행', value: 'SC제일은행', aliases: ['SC제일은행', '스탠다드차타드'] },
  { label: '수협은행', value: '수협은행', aliases: ['수협은행', '수협'] },
  { label: '부산은행', value: '부산은행', aliases: ['부산은행'] },
  { label: '대구은행', value: '대구은행', aliases: ['대구은행', 'iM뱅크', '아이엠뱅크'] },
  { label: '광주은행', value: '광주은행', aliases: ['광주은행'] },
  { label: '전북은행', value: '전북은행', aliases: ['전북은행'] },
  { label: '경남은행', value: '경남은행', aliases: ['경남은행'] },
  { label: '제주은행', value: '제주은행', aliases: ['제주은행'] },
] as const

const TERM_OPTIONS = [1, 3, 6, 12, 24, 36]
const FINANCIAL_GROUP_OPTIONS: OptionItem[] = [
  { label: '전체', value: '전체' },
  { label: '은행', value: '은행' },
  { label: '저축은행', value: '저축은행' },
  { label: '신협조합', value: '신협조합' },
]
const RESERVE_TYPE_OPTIONS: OptionItem[] = [
  { label: '전체', value: '전체' },
  { label: '정액적립식', value: '정액적립식' },
  { label: '자유적립식', value: '자유적립식' },
]
const INTEREST_TYPE_OPTIONS: OptionItem[] = [
  { label: '전체', value: '전체' },
  { label: '단리', value: '단리' },
  { label: '복리', value: '복리' },
]
const REGION_OPTIONS: OptionItem[] = [
  { label: '전체', value: '전체' },
  { label: '서울', value: '서울' },
  { label: '부산', value: '부산' },
  { label: '대구', value: '대구' },
  { label: '인천', value: '인천' },
  { label: '광주', value: '광주' },
  { label: '대전', value: '대전' },
  { label: '울산', value: '울산' },
  { label: '세종', value: '세종' },
  { label: '경기', value: '경기' },
  { label: '강원', value: '강원' },
  { label: '충북', value: '충북' },
  { label: '충남', value: '충남' },
  { label: '전북', value: '전북' },
  { label: '전남', value: '전남' },
  { label: '경북', value: '경북' },
  { label: '경남', value: '경남' },
  { label: '제주', value: '제주' },
]
const JOIN_TARGET_OPTIONS: OptionItem[] = [
  { label: '제한없음', value: '제한없음' },
  { label: '서민전용', value: '서민전용' },
  { label: '일부제한', value: '일부제한' },
]
const JOIN_WAY_OPTIONS: OptionItem[] = [
  { label: '전체', value: '전체' },
  { label: '영업점', value: '영업점' },
  { label: '인터넷', value: '인터넷' },
  { label: '스마트폰', value: '스마트폰' },
  { label: '모집인', value: '모집인' },
  { label: '전화(텔레뱅킹)', value: '전화' },
  { label: '기타', value: '기타' },
]
const BENEFIT_OPTIONS: OptionItem[] = [
  { label: '비대면 가입', value: '비대면' },
  { label: '재예치', value: '재예치' },
  { label: '주거래(급여, 연금 이체 등)', value: '주거래' },
  { label: '첫거래', value: '첫거래' },
  { label: '연령', value: '연령' },
  { label: '타상품가입·실적', value: '실적' },
]

const BENEFIT_KEYWORDS: Record<string, string[]> = {
  비대면: ['비대면', '인터넷', '스마트', '모바일', '온라인'],
  재예치: ['재예치', '재가입', '만기'],
  주거래: ['주거래', '급여', '연금', '이체', '자동이체'],
  첫거래: ['첫거래', '첫 거래', '신규', '최초'],
  연령: ['연령', '나이', '청년', '어린이', '아동', '시니어'],
  실적: ['실적', '카드', '상품가입', '타상품', '마케팅', '동의'],
}

const REGION_KEYWORDS: Record<string, string[]> = {
  서울: ['국민은행', '신한은행', '우리은행', '하나은행', 'SC제일은행', '기업은행', '카카오뱅크', '케이뱅크', '토스뱅크'],
  부산: ['부산은행'],
  대구: ['대구은행', 'iM뱅크', '아이엠뱅크'],
  인천: ['신한은행', '하나은행'],
  광주: ['광주은행'],
  대전: ['하나은행'],
  울산: ['경남은행', '부산은행'],
  세종: ['하나은행', '농협은행'],
  경기: ['국민은행', '신한은행', '우리은행', '하나은행', '기업은행'],
  강원: ['농협은행'],
  충북: ['농협은행'],
  충남: ['농협은행'],
  전북: ['전북은행'],
  전남: ['광주은행'],
  경북: ['대구은행', 'iM뱅크', '아이엠뱅크'],
  경남: ['경남은행'],
  제주: ['제주은행'],
}

type BankFilter = (typeof BANK_FILTERS)[number]['value']

const MOCK_PRODUCTS: SavingsProduct[] = [
  {
    id: 'mock:kb-star',
    companyName: '국민은행',
    productName: 'KB스타 정기적금',
    maturityInterest: '만기 후 1개월 이내 약정이율의 50%, 1개월 초과 시 보통예금이율 적용',
    preferentialCondition: '인터넷/스마트폰 가입 및 급여이체 실적 우대',
    joinRestriction: '제한없음',
    joinWayText: '영업점, 인터넷, 스마트폰',
    termMonths: [6, 12, 24],
    rateSummary: {
      maxPreferentialRate: 4.2,
      maxBasicRate: 3.6,
    },
    options: [
      { termMonths: 12, basicRate: 3.6, maxRate: 4.2, reserveTypeName: '정액적립식', interestRateTypeName: '단리' },
    ],
  },
  {
    id: 'mock:shinhan-s',
    companyName: '신한은행',
    productName: '신한 S드림 적금',
    maturityInterest: '만기 후 경과 기간에 따라 약정이율 일부 또는 보통예금이율 적용',
    preferentialCondition: '첫거래 고객 및 자동이체 실적 우대',
    joinRestriction: '제한없음',
    joinWayText: '인터넷, 스마트폰',
    termMonths: [12, 24],
    rateSummary: {
      maxPreferentialRate: 3.9,
      maxBasicRate: 3.2,
    },
    options: [
      { termMonths: 12, basicRate: 3.2, maxRate: 3.9, reserveTypeName: '자유적립식', interestRateTypeName: '단리' },
    ],
  },
  {
    id: 'mock:toss-free',
    companyName: '토스뱅크',
    productName: '토스뱅크 자유적금',
    maturityInterest: '만기 후에는 토스뱅크 만기 후 이율 정책에 따라 적용',
    preferentialCondition: '비대면 가입 및 자동이체 우대',
    joinRestriction: '제한없음',
    joinWayText: '스마트폰',
    termMonths: [6, 12],
    rateSummary: {
      maxPreferentialRate: 4.5,
      maxBasicRate: 3.8,
    },
    options: [
      { termMonths: 6, basicRate: 3.8, maxRate: 4.5, reserveTypeName: '자유적립식', interestRateTypeName: '복리' },
    ],
  },
]

function App() {
  const [products, setProducts] = useState<SavingsProduct[]>([])
  const [selectedBank, setSelectedBank] = useState<BankFilter>('전체')
  const [selectedTerm, setSelectedTerm] = useState(12)
  const [monthlyDeposit, setMonthlyDeposit] = useState(DEFAULT_MONTHLY_DEPOSIT)
  const [financialGroups, setFinancialGroups] = useState(['전체'])
  const [reserveTypes, setReserveTypes] = useState(['전체'])
  const [interestTypes, setInterestTypes] = useState(['전체'])
  const [regions, setRegions] = useState(['전체'])
  const [joinTargets, setJoinTargets] = useState(['제한없음'])
  const [joinWays, setJoinWays] = useState(['인터넷', '스마트폰'])
  const [benefits, setBenefits] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)

  useEffect(() => {
    const fetchSavingsProducts = async () => {
      try {
        const response = await fetch(SAVINGS_ENDPOINT)

        if (!response.ok) {
          throw new Error('적금 상품 정보를 불러오지 못했습니다.')
        }

        const data = (await response.json()) as SavingsResponse

        if (!Array.isArray(data.products)) {
          throw new Error('응답 데이터 형식이 올바르지 않습니다.')
        }

        setProducts(data.products)
        setLastFetchedAt(data.meta?.fetchedAt ?? null)
        setHasError(false)
      } catch (error) {
        console.error(error)
        setProducts(MOCK_PRODUCTS)
        setLastFetchedAt(null)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSavingsProducts()
  }, [])

  const totalDeposit = monthlyDeposit * selectedTerm
  const activeFilterCount = useMemo(() => {
    return [financialGroups, reserveTypes, interestTypes, regions, joinWays]
      .filter((values) => !isAllSelected(values))
      .length + joinTargets.length + benefits.length + (selectedBank === '전체' ? 0 : 1)
  }, [benefits.length, financialGroups, interestTypes, joinTargets.length, joinWays, regions, reserveTypes, selectedBank])

  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => matchesBank(product, selectedBank))
      .filter((product) => product.termMonths.length === 0 || product.termMonths.includes(selectedTerm))
      .filter((product) => matchesFinancialGroups(product, financialGroups))
      .filter((product) => matchesOptionText(product, reserveTypes, 'reserveTypeName'))
      .filter((product) => matchesOptionText(product, interestTypes, 'interestRateTypeName'))
      .filter((product) => matchesRegions(product, regions))
      .filter((product) => matchesJoinTargets(product, joinTargets))
      .filter((product) => matchesJoinWays(product, joinWays))
      .filter((product) => matchesBenefits(product, benefits))
      .toSorted((a, b) => getBestRate(b, selectedTerm) - getBestRate(a, selectedTerm))
  }, [benefits, financialGroups, interestTypes, joinTargets, joinWays, products, regions, reserveTypes, selectedBank, selectedTerm])

  const resetFilters = () => {
    setSelectedBank('전체')
    setSelectedTerm(12)
    setMonthlyDeposit(DEFAULT_MONTHLY_DEPOSIT)
    setFinancialGroups(['전체'])
    setReserveTypes(['전체'])
    setInterestTypes(['전체'])
    setRegions(['전체'])
    setJoinTargets(['제한없음'])
    setJoinWays(['인터넷', '스마트폰'])
    setBenefits([])
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <p className="eyebrow">Savings Products</p>
        <h1>우대금리 높은 적금</h1>
        <p className="description">
          월 저축액, 기간, 가입방법과 우대조건을 선택해 나에게 맞는 적금 상품을 찾아보세요.
        </p>
        <p className="sync-status">
          {hasError
            ? '현재 예시 데이터 표시 중'
            : `백엔드 연결 완료${lastFetchedAt ? ` · 갱신 ${formatDateTime(lastFetchedAt)}` : ''}`}
        </p>
      </header>

      <section className="calculator-card" aria-label="적금 검색 조건">
        <label className="amount-label" htmlFor="monthly-deposit">
          월 저축 금액
          <span>(최대 : 1천만원)</span>
        </label>
        <div className="amount-field">
          <input
            id="monthly-deposit"
            inputMode="numeric"
            max={MAX_MONTHLY_DEPOSIT}
            min={0}
            type="text"
            value={formatNumber(monthlyDeposit)}
            onChange={(event) => setMonthlyDeposit(parseAmount(event.target.value))}
          />
          <span>원</span>
        </div>

        <fieldset className="filter-group compact-filter">
          <legend>저축 예정기간을 선택하세요</legend>
          <div className="term-grid">
            {TERM_OPTIONS.map((term) => (
              <button
                key={term}
                type="button"
                className={`term-button ${selectedTerm === term ? 'active' : ''}`}
                onClick={() => setSelectedTerm(term)}
              >
                {term}개월
              </button>
            ))}
          </div>
        </fieldset>

        <div className="amount-label total-label">총 저축 금액</div>
        <div className="amount-field readonly-field">
          <output>{formatNumber(totalDeposit)}</output>
          <span>원</span>
        </div>

        <FilterFieldset
          columns="four"
          legend="은행 필터"
          options={BANK_FILTERS}
          selectedValues={[selectedBank]}
          onChange={(value) => setSelectedBank(value as BankFilter)}
          single
        />

        <FilterFieldset
          helper="신협조합을 선택하면 개별 조합에서 취급하는 신협상품을 검색할 수 있습니다."
          legend="금융권역"
          options={FINANCIAL_GROUP_OPTIONS}
          selectedValues={financialGroups}
          onChange={(value) => setFinancialGroups(toggleMultiValue(financialGroups, value))}
        />

        <FilterFieldset
          legend="적립방식"
          options={RESERVE_TYPE_OPTIONS}
          selectedValues={reserveTypes}
          onChange={(value) => setReserveTypes(toggleMultiValue(reserveTypes, value))}
        />

        <FilterFieldset
          legend="이자계산방식"
          options={INTEREST_TYPE_OPTIONS}
          selectedValues={interestTypes}
          onChange={(value) => setInterestTypes(toggleMultiValue(interestTypes, value))}
        />

        <FilterFieldset
          columns="four"
          legend="지역선택"
          options={REGION_OPTIONS}
          selectedValues={regions}
          onChange={(value) => setRegions(toggleMultiValue(regions, value))}
        />

        <FilterFieldset
          legend="가입대상"
          options={JOIN_TARGET_OPTIONS}
          selectedValues={joinTargets}
          onChange={(value) => setJoinTargets(toggleRequiredValue(joinTargets, value))}
        />

        <FilterFieldset
          legend="가입방법"
          options={JOIN_WAY_OPTIONS}
          selectedValues={joinWays}
          onChange={(value) => setJoinWays(toggleMultiValue(joinWays, value))}
        />

        <FilterFieldset
          legend="우대조건"
          options={BENEFIT_OPTIONS}
          selectedValues={benefits}
          onChange={(value) => setBenefits(toggleOptionalValue(benefits, value))}
        />

        <div className="filter-actions">
          <button className="search-button" type="button">
            🔍 금융상품 검색 <span>{visibleProducts.length}개</span>
          </button>
          <button className="reset-button" type="button" onClick={resetFilters} aria-label="검색 조건 초기화">
            ↻
          </button>
        </div>
        {activeFilterCount > 0 && <p className="active-filter-count">적용된 상세 필터 {activeFilterCount}개</p>}
      </section>

      {isLoading ? (
        <section className="status-card" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          적금 상품 정보를 불러오는 중입니다.
        </section>
      ) : (
        <section className="product-list" aria-label="적금 상품 목록">
          {hasError && (
            <p className="fallback-message">
              API 연결이 원활하지 않아 예시 데이터를 표시합니다. 백엔드 5000번 포트와 FINLIFE_API_KEY를 확인해 주세요.
            </p>
          )}

          {visibleProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-info">
                <span className="bank-name">{product.companyName}</span>
                <h2>{product.productName}</h2>
                <p>{product.maturityInterest || '만기 후 이자 안내가 제공되지 않았습니다.'}</p>
                <dl className="product-meta">
                  <div>
                    <dt>가입</dt>
                    <dd>{product.joinWayText || '정보 없음'}</dd>
                  </div>
                  <div>
                    <dt>기간</dt>
                    <dd>{formatTerms(product.termMonths)}</dd>
                  </div>
                  <div>
                    <dt>예상 원금</dt>
                    <dd>{formatNumber(totalDeposit)}원</dd>
                  </div>
                </dl>
              </div>
              <strong className="rate">
                <span>{formatRate(getBestRate(product, selectedTerm))}</span>
                최고 금리
              </strong>
            </article>
          ))}

          {visibleProducts.length === 0 && (
            <p className="status-card">선택한 조건에 맞는 상품이 없습니다.</p>
          )}
        </section>
      )}
    </main>
  )
}

function FilterFieldset({
  columns = 'three',
  helper,
  legend,
  onChange,
  options,
  selectedValues,
  single = false,
}: {
  columns?: 'three' | 'four'
  helper?: string
  legend: string
  onChange: (value: string) => void
  options: readonly OptionItem[]
  selectedValues: string[]
  single?: boolean
}) {
  return (
    <fieldset className="filter-group">
      <legend>{legend}</legend>
      <div className="filter-row">
        <div className={`checkbox-grid ${columns === 'four' ? 'four-columns' : ''}`}>
          {options.map((option) => (
            <label className="checkbox-label" key={option.value}>
              <input
                checked={selectedValues.includes(option.value)}
                name={single ? legend : undefined}
                type={single ? 'radio' : 'checkbox'}
                value={option.value}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {helper && <p className="filter-helper">ⓘ {helper}</p>}
      </div>
    </fieldset>
  )
}

function getBestRate(product: SavingsProduct, termMonths?: number) {
  const termRates = product.options
    .filter((option) => !termMonths || option.termMonths === termMonths)
    .map((option) => option.maxRate ?? option.basicRate)
    .filter((rate): rate is number => rate !== null && rate !== undefined)

  if (termRates.length > 0) {
    return Math.max(...termRates)
  }

  return product.rateSummary.maxPreferentialRate ?? product.rateSummary.maxBasicRate ?? 0
}

function matchesBank(product: SavingsProduct, selectedBank: BankFilter) {
  if (selectedBank === '전체') {
    return true
  }

  const bank = BANK_FILTERS.find((item) => item.value === selectedBank)
  return Boolean(bank?.aliases.some((alias) => product.companyName.includes(alias)))
}

function matchesFinancialGroups(product: SavingsProduct, selectedGroups: string[]) {
  if (isAllSelected(selectedGroups)) {
    return true
  }

  return selectedGroups.includes(getFinancialGroup(product))
}

function matchesOptionText(
  product: SavingsProduct,
  selectedValues: string[],
  optionKey: 'reserveTypeName' | 'interestRateTypeName',
) {
  if (isAllSelected(selectedValues)) {
    return true
  }

  if (product.options.length === 0) {
    return true
  }

  return product.options.some((option) => {
    const optionText = option[optionKey] ?? ''
    return selectedValues.some((value) => optionText.includes(value))
  })
}

function matchesRegions(product: SavingsProduct, selectedRegions: string[]) {
  if (isAllSelected(selectedRegions)) {
    return true
  }

  return selectedRegions.some((region) => {
    const keywords = REGION_KEYWORDS[region] ?? [region]
    return keywords.some((keyword) => product.companyName.includes(keyword))
  })
}

function matchesJoinTargets(product: SavingsProduct, selectedTargets: string[]) {
  const target = product.joinRestriction || '제한없음'
  return selectedTargets.some((selectedTarget) => target.includes(selectedTarget))
}

function matchesJoinWays(product: SavingsProduct, selectedWays: string[]) {
  if (isAllSelected(selectedWays)) {
    return true
  }

  return selectedWays.some((way) => product.joinWayText.includes(way))
}

function matchesBenefits(product: SavingsProduct, selectedBenefits: string[]) {
  if (selectedBenefits.length === 0) {
    return true
  }

  const searchableText = `${product.preferentialCondition ?? ''} ${product.productName} ${product.joinWayText}`
  return selectedBenefits.every((benefit) => {
    const keywords = BENEFIT_KEYWORDS[benefit] ?? [benefit]
    return keywords.some((keyword) => searchableText.includes(keyword))
  })
}

function getFinancialGroup(product: SavingsProduct) {
  if (product.companyName.includes('저축은행')) {
    return '저축은행'
  }

  if (product.companyName.includes('신협') || product.companyName.includes('신용협동조합')) {
    return '신협조합'
  }

  return '은행'
}

function toggleMultiValue(currentValues: string[], value: string) {
  if (value === '전체') {
    return ['전체']
  }

  const withoutAll = currentValues.filter((item) => item !== '전체')
  const nextValues = withoutAll.includes(value)
    ? withoutAll.filter((item) => item !== value)
    : [...withoutAll, value]

  return nextValues.length > 0 ? nextValues : ['전체']
}

function toggleRequiredValue(currentValues: string[], value: string) {
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value]

  return nextValues.length > 0 ? nextValues : [value]
}

function toggleOptionalValue(currentValues: string[], value: string) {
  return currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value]
}

function isAllSelected(values: string[]) {
  return values.includes('전체')
}

function formatRate(rate: number) {
  return `${rate.toFixed(2)}%`
}

function formatTerms(terms: number[]) {
  if (terms.length === 0) {
    return '정보 없음'
  }

  return terms.map((term) => `${term}개월`).join(', ')
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function parseAmount(value: string) {
  const onlyNumber = Number(value.replace(/[^0-9]/g, ''))

  if (Number.isNaN(onlyNumber)) {
    return 0
  }

  return Math.min(onlyNumber, MAX_MONTHLY_DEPOSIT)
}

export default App
