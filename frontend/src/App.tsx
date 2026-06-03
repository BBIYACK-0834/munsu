import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const SAVINGS_ENDPOINT = `${API_BASE_URL}/api/savings`

interface SavingsOption {
  termMonths: number | null
  basicRate: number | null
  maxRate: number | null
}

interface SavingsProduct {
  id: string
  companyName: string
  productName: string
  maturityInterest: string
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

const BANK_FILTERS = ['전체', '국민은행', '신한은행', '토스뱅크'] as const

type BankFilter = (typeof BANK_FILTERS)[number]

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

  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (selectedBank === '전체') {
          return true
        }

        return product.companyName.includes(selectedBank)
      })
      .toSorted((a, b) => getBestRate(b) - getBestRate(a))
  }, [products, selectedBank])

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

      <section className="filter-section" aria-label="은행별 상품 필터">
        {BANK_FILTERS.map((bank) => (
          <button
            key={bank}
            type="button"
            className={`filter-button ${selectedBank === bank ? 'active' : ''}`}
            onClick={() => setSelectedBank(bank)}
          >
            {bank}
          </button>
        ))}
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
            <p className="status-card">선택한 은행의 상품이 없습니다.</p>
          )}
        </section>
      )}
    </main>
  )
}

function getBestRate(product: SavingsProduct) {
  return product.rateSummary.maxPreferentialRate ?? product.rateSummary.maxBasicRate ?? 0
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
