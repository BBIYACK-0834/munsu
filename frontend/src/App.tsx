import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const SAVINGS_ENDPOINT = `${API_BASE_URL}/api/savings`

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
  joinWayText: string
  joinWays?: string[]
  preferentialCondition?: string
  joinRestriction?: string
  joinMembers?: string
  etcNote?: string
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


type FilterOption = {
  label: string
  value: string
}

const MAX_MONTHLY_DEPOSIT = 10_000_000
const DEFAULT_MONTHLY_DEPOSIT = 100_000
const TERM_OPTIONS = [6, 12, 24, 36, 48, 60] as const
const BANK_FILTERS = [
  '전체',
  '국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  '농협은행',
  '기업은행',
  '토스뱅크',
].map((value) => ({ label: value, value }))

const FINANCIAL_GROUP_OPTIONS = ['전체', '은행', '저축은행', '신협'].map(createOption)
const RESERVE_TYPE_OPTIONS = ['전체', '정액적립식', '자유적립식'].map(createOption)
const INTEREST_TYPE_OPTIONS = ['전체', '단리', '복리'].map(createOption)
const REGION_OPTIONS = ['전체', ...Object.keys(REGION_KEYWORDS)].map(createOption)
const JOIN_TARGET_OPTIONS = ['제한없음', '서민전용', '일부제한'].map(createOption)
const JOIN_WAY_OPTIONS = ['전체', '영업점', '인터넷', '스마트폰', '전화'].map(createOption)
const BENEFIT_OPTIONS = ['급여', '카드', '자동이체', '첫거래', '마케팅동의'].map(createOption)

type BankFilter = (typeof BANK_FILTERS)[number]['value']

const MOCK_PRODUCTS: SavingsProduct[] = [
  {
    id: 'mock:kb-star',
    companyName: '국민은행',
    productName: 'KB스타 정기적금',
    maturityInterest: '만기 후 1개월 이내 약정이율의 50%, 1개월 초과 시 보통예금이율 적용',
    joinWayText: '영업점, 인터넷, 스마트폰',
    termMonths: [6, 12, 24],
    rateSummary: {
      maxPreferentialRate: 4.2,
      maxBasicRate: 3.6,
    },
    options: [],
  },
  {
    id: 'mock:shinhan-s',
    companyName: '신한은행',
    productName: '신한 S드림 적금',
    maturityInterest: '만기 후 경과 기간에 따라 약정이율 일부 또는 보통예금이율 적용',
    joinWayText: '인터넷, 스마트폰',
    termMonths: [12, 24],
    rateSummary: {
      maxPreferentialRate: 3.9,
      maxBasicRate: 3.2,
    },
    options: [],
  },
  {
    id: 'mock:toss-free',
    companyName: '토스뱅크',
    productName: '토스뱅크 자유적금',
    maturityInterest: '만기 후에는 토스뱅크 만기 후 이율 정책에 따라 적용',
    joinWayText: '스마트폰',
    termMonths: [6, 12],
    rateSummary: {
      maxPreferentialRate: 4.5,
      maxBasicRate: 3.8,
    },
    options: [],
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


  return (
    <main className="app-container">
      <header className="app-header">
        <p className="eyebrow">Savings Products</p>
        <h1>우대금리 높은 적금</h1>
        <p className="description">
          은행별 적금 상품을 백엔드 API에서 받아와 최고 우대금리 순으로 비교해 보세요.
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
                </dl>
              </div>
              <strong className="rate">
                <span>{formatRate(getBestRate(product))}</span>
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

function createOption(value: string): FilterOption {
  return { label: value, value }
}

function isAllSelected(values: string[]) {
  return values.includes('전체')
}

function toggleMultiValue(currentValues: string[], value: string) {
  if (value === '전체') {
    return ['전체']
  }

  const nextValues = currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues.filter((currentValue) => currentValue !== '전체'), value]

  return nextValues.length > 0 ? nextValues : ['전체']
}

function toggleRequiredValue(currentValues: string[], value: string) {
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value]

  return nextValues.length > 0 ? nextValues : [value]
}

function toggleOptionalValue(currentValues: string[], value: string) {
  return currentValues.includes(value)
    ? currentValues.filter((currentValue) => currentValue !== value)
    : [...currentValues, value]
}

function matchesBank(product: SavingsProduct, selectedBank: BankFilter) {
  return selectedBank === '전체' || product.companyName.includes(selectedBank)
}

function matchesFinancialGroups(product: SavingsProduct, selectedGroups: string[]) {
  if (isAllSelected(selectedGroups)) {
    return true
  }

  const searchableText = `${product.companyName} ${product.productName}`
  return selectedGroups.some((group) => searchableText.includes(group))
}

function matchesOptionText(product: SavingsProduct, selectedValues: string[], optionKey: 'reserveTypeName' | 'interestRateTypeName') {
  return isAllSelected(selectedValues) || product.options.some((option) => selectedValues.includes(option[optionKey] ?? ''))
}

function matchesRegions(product: SavingsProduct, selectedRegions: string[]) {
  return isAllSelected(selectedRegions) || selectedRegions.some((region) => {
    const keywords = REGION_KEYWORDS[region] ?? []
    return keywords.some((keyword) => product.companyName.includes(keyword))
  })
}

function matchesJoinTargets(product: SavingsProduct, selectedTargets: string[]) {
  return selectedTargets.some((target) => product.joinRestriction?.includes(target) || product.joinMembers?.includes(target))
}

function matchesJoinWays(product: SavingsProduct, selectedWays: string[]) {
  if (isAllSelected(selectedWays)) {
    return true
  }

  const joinWays = product.joinWays?.length ? product.joinWays : product.joinWayText.split(',').map((way) => way.trim())
  return selectedWays.some((way) => joinWays.some((joinWay) => joinWay.includes(way)))
}

function matchesBenefits(product: SavingsProduct, selectedBenefits: string[]) {
  if (selectedBenefits.length === 0) {
    return true
  }

  const searchableText = [product.preferentialCondition, product.etcNote, product.productName].join(' ')
  return selectedBenefits.some((benefit) => searchableText.includes(benefit))
}

function parseAmount(value: string) {
  const number = Number(value.replace(/[^0-9]/g, ''))

  if (!Number.isFinite(number)) {
    return 0
  }

  return Math.min(number, MAX_MONTHLY_DEPOSIT)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function getBestRate(product: SavingsProduct, selectedTerm?: number) {
  const matchingOptions = selectedTerm
    ? product.options.filter((option) => option.termMonths === selectedTerm)
    : product.options
  const maxOptionRate = Math.max(...matchingOptions.map((option) => option.maxRate ?? option.basicRate ?? 0), 0)

  return maxOptionRate || (product.rateSummary.maxPreferentialRate ?? product.rateSummary.maxBasicRate ?? 0)
}

type FilterFieldsetProps = {
  columns?: 'three' | 'four'
  helper?: string
  legend: string
  options: readonly FilterOption[]
  selectedValues: string[]
  single?: boolean
  onChange: (value: string) => void
}

function FilterFieldset({ columns = 'three', helper, legend, options, selectedValues, single = false, onChange }: FilterFieldsetProps) {
  return (
    <fieldset className="filter-group">
      <legend>{legend}</legend>
      {helper && <p className="filter-helper">{helper}</p>}
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
    </fieldset>
  )
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

export default App
