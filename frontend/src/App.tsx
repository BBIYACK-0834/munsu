import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const SAVINGS_ENDPOINT = `${API_BASE_URL}/api/savings`

type TabKey = 'home' | 'recommend' | 'my'
type SortKey = 'rate' | 'remaining' | 'principal' | 'name'

type FilterOption = {
  label: string
  value: string
}

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
  maxLimit?: number | null
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

type JoinedSaving = {
  productId: string
  joinedAt: string
  monthlyAmount: number
  selectedTerm: number
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

const MAX_MONTHLY_DEPOSIT = 10_000_000
const DEFAULT_MONTHLY_DEPOSIT = 100_000
const TERM_OPTIONS = [6, 12, 24, 36, 48, 60] as const
const BANK_FILTERS = ['전체', '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '토스뱅크'].map(createOption)

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
    joinWays: ['영업점', '인터넷', '스마트폰'],
    preferentialCondition: '급여이체, 자동이체, KB스타뱅킹 이용 실적에 따라 우대금리가 더해집니다.',
    joinRestriction: '제한없음',
    maxLimit: 1_000_000,
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
    joinWayText: '인터넷, 스마트폰',
    joinWays: ['인터넷', '스마트폰'],
    preferentialCondition: '첫거래, 카드 사용, 마케팅 동의 조건 충족 시 우대금리가 적용됩니다.',
    joinRestriction: '제한없음',
    maxLimit: 500_000,
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
    joinWayText: '스마트폰',
    joinWays: ['스마트폰'],
    preferentialCondition: '토스 앱 자동이체와 목표 달성 여부에 따라 최대 우대금리를 받을 수 있습니다.',
    joinRestriction: '제한없음',
    maxLimit: 3_000_000,
    termMonths: [6, 12],
    rateSummary: {
      maxPreferentialRate: 4.5,
      maxBasicRate: 3.8,
    },
    options: [
      { termMonths: 12, basicRate: 3.8, maxRate: 4.5, reserveTypeName: '자유적립식', interestRateTypeName: '단리' },
    ],
  },
]

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'home', label: '홈' },
  { key: 'recommend', label: '적금추천' },
  { key: 'my', label: '내 저금' },
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
  const [joinedSavings, setJoinedSavings] = useState<JoinedSaving[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [mySort, setMySort] = useState<SortKey>('rate')
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

  const joinedProductIds = useMemo(() => new Set(joinedSavings.map((saving) => saving.productId)), [joinedSavings])
  const totalDeposit = monthlyDeposit * selectedTerm
  const activeFilterChips = useMemo(() => {
    const chips: string[] = []

    if (selectedBank !== '전체') {
      chips.push(`은행 ${selectedBank}`)
    }
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

    chips.push(`기간 ${selectedTerm}개월`)
    addChips(chips, '금융권역', financialGroups, ['전체'])
    addChips(chips, '적립', reserveTypes, ['전체'])
    addChips(chips, '이자', interestTypes, ['전체'])
    addChips(chips, '지역', regions, ['전체'])
    addChips(chips, '대상', joinTargets, [])
    addChips(chips, '가입', joinWays, ['전체'])
    addChips(chips, '우대', benefits, [])

    return chips
  }, [benefits, financialGroups, interestTypes, joinTargets, joinWays, regions, reserveTypes, selectedBank, selectedTerm])
  const activeFilterCount = activeFilterChips.length
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
  const joinedProductRows = useMemo(() => {
    return joinedSavings
      .map((saving) => {
        const product = products.find((item) => item.id === saving.productId) ?? MOCK_PRODUCTS.find((item) => item.id === saving.productId)

        if (!product) {
          return null
        }

        return {
          product,
          saving,
          remainingMonths: getRemainingMonths(saving),
          principal: saving.monthlyAmount * getElapsedMonths(saving),
          expectedInterest: estimateInterest(saving.monthlyAmount, saving.selectedTerm, getBestRate(product, saving.selectedTerm)),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .toSorted((a, b) => sortJoinedRows(a, b, mySort))
  }, [joinedSavings, mySort, products])
  const homeStats = useMemo(() => {
    const principal = joinedProductRows.reduce((sum, row) => sum + row.principal, 0)
    const totalInterest = joinedProductRows.reduce((sum, row) => sum + row.expectedInterest, 0)
    const averageRate = joinedProductRows.length
      ? joinedProductRows.reduce((sum, row) => sum + getBestRate(row.product, row.saving.selectedTerm), 0) / joinedProductRows.length
      : 0

    return {
      principal,
      totalInterest,
      averageRate,
      expectedProfit: principal + totalInterest,
    }
  }, [joinedProductRows])
  const topProducts = useMemo(() => products.toSorted((a, b) => getBestRate(b) - getBestRate(a)).slice(0, 2), [products])

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

  const joinProduct = (product: SavingsProduct) => {
    if (joinedProductIds.has(product.id)) {
      setActiveTab('my')
      return
    }

    setJoinedSavings((currentSavings) => [
      ...currentSavings,
      {
        productId: product.id,
        joinedAt: new Date().toISOString(),
        monthlyAmount: monthlyDeposit,
        selectedTerm: normalizeTerm(product, selectedTerm),
      },
    ])
    setActiveTab('my')
  }

  const updateJoinedAmount = (productId: string, value: string) => {
    const nextAmount = parseAmount(value)
    setJoinedSavings((currentSavings) => currentSavings.map((saving) => (
      saving.productId === productId ? { ...saving, monthlyAmount: nextAmount } : saving
    )))
  }

  return (
    <main className="app-shell">
      <header className="hero-card">
        <p className="eyebrow">Munsu Savings</p>
        <h1>내 적금 현황을 토스처럼 한눈에</h1>
        <p className="description">
          추천 적금을 비교하고, 가입한 적금의 원금·이자·남은 기간을 탭으로 관리하세요.
        </p>
        <p className="sync-status">
          {hasError
            ? '현재 예시 데이터 표시 중'
            : `백엔드 연결 완료${lastFetchedAt ? ` · 갱신 ${formatDateTime(lastFetchedAt)}` : ''}`}
        </p>
      </header>

      <nav className="top-tabs" aria-label="주요 화면 이동">
        {TAB_ITEMS.map((tab) => (
          <button
            className={activeTab === tab.key ? 'active' : ''}
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'home' && (
        <HomeTab
          averageRate={homeStats.averageRate}
          expectedProfit={homeStats.expectedProfit}
          joinedCount={joinedSavings.length}
          principal={homeStats.principal}
          topProducts={topProducts}
          totalInterest={homeStats.totalInterest}
          onOpenRecommend={() => setActiveTab('recommend')}
        />
      )}

      {activeTab === 'recommend' && (
        <RecommendTab
          activeFilterChips={activeFilterChips}
          activeFilterCount={activeFilterCount}
          expandedProductId={expandedProductId}
          isFilterOpen={isFilterOpen}
          isLoading={isLoading}
          joinedProductIds={joinedProductIds}
          monthlyDeposit={monthlyDeposit}
          products={visibleProducts}
          selectedBank={selectedBank}
          selectedTerm={selectedTerm}
          totalDeposit={totalDeposit}
          financialGroups={financialGroups}
          reserveTypes={reserveTypes}
          interestTypes={interestTypes}
          regions={regions}
          joinTargets={joinTargets}
          joinWays={joinWays}
          benefits={benefits}
          onJoinProduct={joinProduct}
          onMonthlyDepositChange={setMonthlyDeposit}
          onResetFilters={resetFilters}
          onSelectedBankChange={(value) => setSelectedBank(value as BankFilter)}
          onSelectedTermChange={setSelectedTerm}
          onToggleBenefits={(value) => setBenefits(toggleOptionalValue(benefits, value))}
          onToggleExpandedProduct={setExpandedProductId}
          onToggleFilterOpen={() => setIsFilterOpen((isOpen) => !isOpen)}
          onToggleFinancialGroups={(value) => setFinancialGroups(toggleMultiValue(financialGroups, value))}
          onToggleInterestTypes={(value) => setInterestTypes(toggleMultiValue(interestTypes, value))}
          onToggleJoinTargets={(value) => setJoinTargets(toggleRequiredValue(joinTargets, value))}
          onToggleJoinWays={(value) => setJoinWays(toggleMultiValue(joinWays, value))}
          onToggleRegions={(value) => setRegions(toggleMultiValue(regions, value))}
          onToggleReserveTypes={(value) => setReserveTypes(toggleMultiValue(reserveTypes, value))}
        />
      )}

      {activeTab === 'my' && (
        <MySavingsTab
          expandedProductId={expandedProductId}
          rows={joinedProductRows}
          sort={mySort}
          onAmountChange={updateJoinedAmount}
          onOpenRecommend={() => setActiveTab('recommend')}
          onSortChange={setMySort}
          onToggleExpandedProduct={setExpandedProductId}
        />
      )}
    </main>
  )
}

type HomeTabProps = {
  averageRate: number
  expectedProfit: number
  joinedCount: number
  principal: number
  topProducts: SavingsProduct[]
  totalInterest: number
  onOpenRecommend: () => void
}

function HomeTab({ averageRate, expectedProfit, joinedCount, principal, topProducts, totalInterest, onOpenRecommend }: HomeTabProps) {
  return (
    <section className="tab-panel">
      <div className="summary-grid">
        <StatCard label="총 원금" value={`${formatNumber(principal)}원`} />
        <StatCard label="총 이자" value={`${formatNumber(Math.round(totalInterest))}원`} tone="blue" />
        <StatCard label="평균 금리" value={formatRate(averageRate)} />
        <StatCard label="기대수익" value={`${formatNumber(Math.round(expectedProfit))}원`} tone="blue" />
      </div>

      <section className="section-card home-main-card">
        <div>
          <p className="section-kicker">내 저금</p>
          <h2>{joinedCount > 0 ? `${joinedCount}개 적금을 관리 중이에요` : '아직 가입한 적금이 없어요'}</h2>
          <p>추천 탭에서 적금을 담으면 홈과 내 저금 탭에 자동으로 반영됩니다.</p>
        </div>
        <button className="primary-button" type="button" onClick={onOpenRecommend}>추천 보러가기</button>
      </section>

      <section className="section-card">
        <div className="section-title-row">
          <div>
            <p className="section-kicker">Top 2</p>
            <h2>현재 상위 적금</h2>
          </div>
        </div>
        <div className="mini-list">
          {topProducts.map((product) => (
            <ProductMiniCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </section>
  )
}

type RecommendTabProps = {
  activeFilterChips: string[]
  activeFilterCount: number
  expandedProductId: string | null
  isFilterOpen: boolean
  isLoading: boolean
  joinedProductIds: Set<string>
  monthlyDeposit: number
  products: SavingsProduct[]
  selectedBank: BankFilter
  selectedTerm: number
  totalDeposit: number
  financialGroups: string[]
  reserveTypes: string[]
  interestTypes: string[]
  regions: string[]
  joinTargets: string[]
  joinWays: string[]
  benefits: string[]
  onJoinProduct: (product: SavingsProduct) => void
  onMonthlyDepositChange: (value: number) => void
  onResetFilters: () => void
  onSelectedBankChange: (value: string) => void
  onSelectedTermChange: (term: number) => void
  onToggleBenefits: (value: string) => void
  onToggleExpandedProduct: (productId: string | null) => void
  onToggleFilterOpen: () => void
  onToggleFinancialGroups: (value: string) => void
  onToggleInterestTypes: (value: string) => void
  onToggleJoinTargets: (value: string) => void
  onToggleJoinWays: (value: string) => void
  onToggleRegions: (value: string) => void
  onToggleReserveTypes: (value: string) => void
}

function RecommendTab({
  activeFilterChips,
  activeFilterCount,
  expandedProductId,
  isFilterOpen,
  isLoading,
  joinedProductIds,
  monthlyDeposit,
  products,
  selectedBank,
  selectedTerm,
  totalDeposit,
  financialGroups,
  reserveTypes,
  interestTypes,
  regions,
  joinTargets,
  joinWays,
  benefits,
  onJoinProduct,
  onMonthlyDepositChange,
  onResetFilters,
  onSelectedBankChange,
  onSelectedTermChange,
  onToggleBenefits,
  onToggleExpandedProduct,
  onToggleFilterOpen,
  onToggleFinancialGroups,
  onToggleInterestTypes,
  onToggleJoinTargets,
  onToggleJoinWays,
  onToggleRegions,
  onToggleReserveTypes,
}: RecommendTabProps) {
  return (
    <section className="tab-panel">
      <section className="section-card calculator-card">
        <div className="section-title-row">
          <div>
            <p className="section-kicker">Recommendation</p>
            <h2>적금추천</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onToggleFilterOpen}>
            필터 {isFilterOpen ? '접기' : '열기'} · {activeFilterCount}개
          </button>
        </div>

        <div className="amount-row">
          <label htmlFor="monthly-deposit">
            월 저축 금액
            <span>최대 1천만원</span>
          </label>
          <div className="amount-field">
            <input
              id="monthly-deposit"
              inputMode="numeric"
              max={MAX_MONTHLY_DEPOSIT}
              min={0}
              type="text"
              value={formatNumber(monthlyDeposit)}
              onChange={(event) => onMonthlyDepositChange(parseAmount(event.target.value))}
            />
            <span>원</span>
          </div>
        </div>
        <div className="total-pill">총 저축 예정 금액 {formatNumber(totalDeposit)}원</div>

        {isFilterOpen && (
          <div className="filter-drawer">
            <fieldset className="filter-group compact-filter">
              <legend>저축 예정기간</legend>
              <div className="term-grid">
                {TERM_OPTIONS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className={`term-button ${selectedTerm === term ? 'active' : ''}`}
                    onClick={() => onSelectedTermChange(term)}
                  >
                    {term}개월
                  </button>
                ))}
              </div>
            </fieldset>

            <FilterFieldset columns="four" legend="은행 필터" options={BANK_FILTERS} selectedValues={[selectedBank]} single onChange={onSelectedBankChange} />
            <FilterFieldset helper="신협조합을 선택하면 개별 조합에서 취급하는 신협상품을 검색할 수 있습니다." legend="금융권역" options={FINANCIAL_GROUP_OPTIONS} selectedValues={financialGroups} onChange={onToggleFinancialGroups} />
            <FilterFieldset legend="적립방식" options={RESERVE_TYPE_OPTIONS} selectedValues={reserveTypes} onChange={onToggleReserveTypes} />
            <FilterFieldset legend="이자계산방식" options={INTEREST_TYPE_OPTIONS} selectedValues={interestTypes} onChange={onToggleInterestTypes} />
            <FilterFieldset columns="four" legend="지역선택" options={REGION_OPTIONS} selectedValues={regions} onChange={onToggleRegions} />
            <FilterFieldset legend="가입대상" options={JOIN_TARGET_OPTIONS} selectedValues={joinTargets} onChange={onToggleJoinTargets} />
            <FilterFieldset legend="가입방법" options={JOIN_WAY_OPTIONS} selectedValues={joinWays} onChange={onToggleJoinWays} />
            <FilterFieldset legend="우대조건" options={BENEFIT_OPTIONS} selectedValues={benefits} onChange={onToggleBenefits} />
          </div>
        )}

        <div className="filter-chip-row" aria-label="적용된 필터">
          {activeFilterChips.map((chip) => <span className="filter-chip" key={chip}>{chip}</span>)}
          <button className="chip-button" type="button" onClick={onResetFilters}>초기화</button>
        </div>
      </section>

      {isLoading ? (
        <section className="status-card" aria-live="polite">
          <span className="loading-dot" aria-hidden="true" />
          적금 상품 정보를 불러오는 중입니다.
        </section>
      ) : (
        <section className="product-list" aria-label="적금 상품 목록">
          {products.map((product) => (
            <ProductCard
              expanded={expandedProductId === product.id}
              joined={joinedProductIds.has(product.id)}
              key={product.id}
              product={product}
              selectedTerm={selectedTerm}
              onJoin={onJoinProduct}
              onToggleExpanded={(productId) => onToggleExpandedProduct(expandedProductId === productId ? null : productId)}
            />
          ))}

          {products.length === 0 && <p className="status-card">선택한 조건에 맞는 상품이 없습니다.</p>}
        </section>
      )}
    </section>
  )
}

type MySavingsTabProps = {
  expandedProductId: string | null
  rows: Array<{
    product: SavingsProduct
    saving: JoinedSaving
    remainingMonths: number
    principal: number
    expectedInterest: number
  }>
  sort: SortKey
  onAmountChange: (productId: string, value: string) => void
  onOpenRecommend: () => void
  onSortChange: (sort: SortKey) => void
  onToggleExpandedProduct: (productId: string | null) => void
}

function MySavingsTab({ expandedProductId, rows, sort, onAmountChange, onOpenRecommend, onSortChange, onToggleExpandedProduct }: MySavingsTabProps) {
  return (
    <section className="tab-panel">
      <section className="section-card">
        <div className="section-title-row">
          <div>
            <p className="section-kicker">My Savings</p>
            <h2>내 저금</h2>
          </div>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as SortKey)} aria-label="내 적금 정렬">
            <option value="rate">금리 높은순</option>
            <option value="remaining">남은 기간 짧은순</option>
            <option value="principal">원금 많은순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="empty-card">
          <h2>가입한 적금이 없어요</h2>
          <p>적금추천 탭에서 마음에 드는 상품을 내 저금으로 옮겨보세요.</p>
          <button className="primary-button" type="button" onClick={onOpenRecommend}>추천 적금 찾기</button>
        </section>
      ) : (
        <section className="product-list" aria-label="내 적금 목록">
          {rows.map(({ product, saving, remainingMonths, principal, expectedInterest }) => (
            <article className="product-card my-card" key={product.id}>
              <button className="product-main" type="button" onClick={() => onToggleExpandedProduct(expandedProductId === product.id ? null : product.id)}>
                <BankBadge companyName={product.companyName} />
                <div className="product-info">
                  <span className="bank-name">{product.companyName}</span>
                  <h2>{product.productName}</h2>
                  <dl className="product-meta">
                    <MetaItem label="남은 기간" value={`${remainingMonths}개월`} />
                    <MetaItem label="월 납입" value={`${formatNumber(saving.monthlyAmount)}원`} />
                    <MetaItem label="금리" value={formatRate(getBestRate(product, saving.selectedTerm))} />
                  </dl>
                </div>
                <strong className="rate"><span>{formatNumber(principal)}</span>원금</strong>
              </button>

              {expandedProductId === product.id && (
                <div className="product-detail">
                  <label className="inline-input">
                    매달 넣은 금액
                    <input
                      inputMode="numeric"
                      type="text"
                      value={formatNumber(saving.monthlyAmount)}
                      onChange={(event) => onAmountChange(product.id, event.target.value)}
                    />
                    <span>원</span>
                  </label>
                  <div className="detail-grid">
                    <MetaItem label="가입일" value={formatDate(saving.joinedAt)} />
                    <MetaItem label="예상 이자" value={`${formatNumber(Math.round(expectedInterest))}원`} />
                    <MetaItem label="만기 예정" value={`${saving.selectedTerm}개월 상품`} />
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </section>
  )
}

type ProductCardProps = {
  expanded: boolean
  joined: boolean
  product: SavingsProduct
  selectedTerm: number
  onJoin: (product: SavingsProduct) => void
  onToggleExpanded: (productId: string) => void
}

function ProductCard({ expanded, joined, product, selectedTerm, onJoin, onToggleExpanded }: ProductCardProps) {
  const rate = getBestRate(product, selectedTerm)

  return (
    <article className={`product-card ${joined ? 'joined' : ''}`}>
      <button className="product-main" type="button" onClick={() => onToggleExpanded(product.id)}>
        <BankBadge companyName={product.companyName} />
        <div className="product-info">
          <div className="name-line">
            <span className="bank-name">{product.companyName}</span>
            {joined && <span className="joined-badge">이미 가입됨</span>}
          </div>
          <h2>{product.productName}</h2>
          <dl className="product-meta">
            <MetaItem label="최대금리" value={formatRate(rate)} />
            <MetaItem label="기간" value={formatTerms(product.termMonths)} />
            <MetaItem label="최대 금액" value={formatLimit(product.maxLimit)} />
          </dl>
        </div>
        <strong className="rate"><span>{formatRate(rate)}</span>최대</strong>
      </button>

      {expanded && (
        <div className="product-detail">
          <div className="detail-grid">
            <MetaItem label="가입방법" value={product.joinWayText || '정보 없음'} />
            <MetaItem label="가입대상" value={product.joinRestriction || product.joinMembers || '제한없음'} />
            <MetaItem label="만기 후 이자" value={product.maturityInterest || '정보 없음'} />
          </div>
          <div className="preferential-box">
            <h3>우대금리 적용 원리</h3>
            <p>{product.preferentialCondition || '상품별 급여이체, 자동이체, 카드 사용, 첫거래 등 조건 충족 여부에 따라 기본금리에 우대금리가 더해집니다.'}</p>
          </div>
          <button className="primary-button wide" type="button" disabled={joined} onClick={() => onJoin(product)}>
            {joined ? '내 저금에 추가됨' : '내 저금으로 옮기기'}
          </button>
        </div>
      )}
    </article>
  )
}

function ProductMiniCard({ product }: { product: SavingsProduct }) {
  return (
    <article className="mini-card">
      <BankBadge companyName={product.companyName} />
      <div>
        <span>{product.companyName}</span>
        <strong>{product.productName}</strong>
      </div>
      <em>{formatRate(getBestRate(product))}</em>
    </article>
  )
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'blue' }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function BankBadge({ companyName }: { companyName: string }) {
  return <span className="bank-badge" aria-hidden="true">{getBankIcon(companyName)}</span>
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
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

function createOption(value: string): FilterOption {
  return { label: value, value }
}

function addChips(chips: string[], label: string, values: string[], ignoredValues: string[]) {
  values
    .filter((value) => !ignoredValues.includes(value))
    .forEach((value) => chips.push(`${label} ${value}`))
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

function normalizeTerm(product: SavingsProduct, fallbackTerm: number) {
  return product.termMonths.includes(fallbackTerm) || product.termMonths.length === 0 ? fallbackTerm : product.termMonths[0]
}

function getElapsedMonths(saving: JoinedSaving) {
  const joinedDate = new Date(saving.joinedAt)
  const now = new Date()
  const monthDiff = (now.getFullYear() - joinedDate.getFullYear()) * 12 + now.getMonth() - joinedDate.getMonth() + 1

  return Math.min(Math.max(monthDiff, 1), saving.selectedTerm)
}

function getRemainingMonths(saving: JoinedSaving) {
  return Math.max(saving.selectedTerm - getElapsedMonths(saving), 0)
}

function sortJoinedRows(
  left: { product: SavingsProduct; saving: JoinedSaving; remainingMonths: number; principal: number },
  right: { product: SavingsProduct; saving: JoinedSaving; remainingMonths: number; principal: number },
  sort: SortKey,
) {
  if (sort === 'remaining') {
    return left.remainingMonths - right.remainingMonths
  }

  if (sort === 'principal') {
    return right.principal - left.principal
  }

  if (sort === 'name') {
    return left.product.productName.localeCompare(right.product.productName, 'ko')
  }

  return getBestRate(right.product, right.saving.selectedTerm) - getBestRate(left.product, left.saving.selectedTerm)
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

function estimateInterest(monthlyAmount: number, termMonths: number, annualRate: number) {
  return monthlyAmount * termMonths * (annualRate / 100) * (termMonths / 12)
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

function formatLimit(limit?: number | null) {
  return limit ? `${formatNumber(limit)}원` : '한도 정보 없음'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

function getBankIcon(companyName: string) {
  if (companyName.includes('토스')) return 'ㅌ'
  if (companyName.includes('국민')) return 'KB'
  if (companyName.includes('신한')) return 'S'
  if (companyName.includes('하나')) return 'H'
  if (companyName.includes('우리')) return 'W'
  if (companyName.includes('농협')) return 'NH'
  if (companyName.includes('기업')) return 'IBK'

  return companyName.slice(0, 1)
}

export default App
