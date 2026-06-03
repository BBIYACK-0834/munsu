import { useEffect, useMemo, useState } from 'react'

const BACKEND_URL = 'https://여기에_5000번_포트_주소_입력.app.github.dev/api/savings'

interface SavingsProduct {
  fin_prdt_cd: string
  kor_co_nm: string
  fin_prdt_nm: string
  mtrt_int: string
  max_intr_rate: number
}

const BANK_FILTERS = ['전체', '국민은행', '신한은행', '토스뱅크'] as const

type BankFilter = (typeof BANK_FILTERS)[number]

const MOCK_PRODUCTS: SavingsProduct[] = [
  {
    fin_prdt_cd: 'mock-kb-star',
    kor_co_nm: '국민은행',
    fin_prdt_nm: 'KB스타 정기적금',
    mtrt_int: '만기 후 1개월 이내 약정이율의 50%, 1개월 초과 시 보통예금이율 적용',
    max_intr_rate: 4.2,
  },
  {
    fin_prdt_cd: 'mock-shinhan-s',
    kor_co_nm: '신한은행',
    fin_prdt_nm: '신한 S드림 적금',
    mtrt_int: '만기 후 경과 기간에 따라 약정이율 일부 또는 보통예금이율 적용',
    max_intr_rate: 3.9,
  },
  {
    fin_prdt_cd: 'mock-toss-free',
    kor_co_nm: '토스뱅크',
    fin_prdt_nm: '토스뱅크 자유적금',
    mtrt_int: '만기 후에는 토스뱅크 만기 후 이율 정책에 따라 적용',
    max_intr_rate: 4.5,
  },
]

function App() {
  const [products, setProducts] = useState<SavingsProduct[]>([])
  const [selectedBank, setSelectedBank] = useState<BankFilter>('전체')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const fetchSavingsProducts = async () => {
      try {
        const response = await fetch(BACKEND_URL)

        if (!response.ok) {
          throw new Error('적금 상품 정보를 불러오지 못했습니다.')
        }

        const data = (await response.json()) as { products?: SavingsProduct[] }

        if (!Array.isArray(data.products)) {
          throw new Error('응답 데이터 형식이 올바르지 않습니다.')
        }

        setProducts(data.products)
      } catch (error) {
        console.error(error)
        setProducts(MOCK_PRODUCTS)
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

        return product.kor_co_nm.includes(selectedBank)
      })
      .toSorted((a, b) => b.max_intr_rate - a.max_intr_rate)
  }, [products, selectedBank])

  return (
    <main className="app-container">
      <header className="app-header">
        <p className="eyebrow">Savings Products</p>
        <h1>우대금리 높은 적금</h1>
        <p className="description">
          은행별 적금 상품을 최고 우대금리 순으로 비교해 보세요.
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
              API 연결이 원활하지 않아 예시 데이터를 표시합니다.
            </p>
          )}

          {visibleProducts.map((product) => (
            <article className="product-card" key={product.fin_prdt_cd}>
              <div className="product-info">
                <span className="bank-name">{product.kor_co_nm}</span>
                <h2>{product.fin_prdt_nm}</h2>
                <p>{product.mtrt_int}</p>
              </div>
              <strong className="rate">
                <span>{product.max_intr_rate.toFixed(2)}%</span>
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

export default App
