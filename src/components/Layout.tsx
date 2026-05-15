import type { ReactNode } from 'react'
import styles from './Layout.module.css'
import miHomePng from '../assets/gnb/mi-home.png'
import consumptionPng from '../assets/gnb/consumption.png'

/**
 * Figma MCP — ZYXzz6z5hr3IvP8ZKdVtqB
 * - GNB `0depth` (92:1448)
 * - 우측 패널 로고 행 (24344:9794)
 * - 상품안내 행 (92:1518) — `icon_gnb_more_default` (전용 익스포트)
 */
const GNB_ICON_FROM_FIGMA = {
  agentChart:
    'https://www.figma.com/api/mcp/asset/756122e8-9f1c-48dc-b622-1756708dba64',
  miChart:
    'https://www.figma.com/api/mcp/asset/b44c4cba-0512-45e1-85d6-3f12e3ea9c88',
  market:
    'https://www.figma.com/api/mcp/asset/872c0712-d72d-47b5-9e0b-6c870b0ac3ea',
  usage:
    'https://www.figma.com/api/mcp/asset/27fd5ce0-d9ed-4545-a36b-15c38a82aef5',
  more:
    'https://www.figma.com/api/mcp/asset/7044d4e4-290a-41c1-9762-76b8e32837d7',
  productGuide:
    'https://www.figma.com/api/mcp/asset/91aad170-2daa-4a8d-ae61-1cb14cec13a9',
} as const

const ASSET_MI_AI_HEADER_LOGO =
  'https://www.figma.com/api/mcp/asset/3470ce69-7acf-456e-a7ea-86bc5f1c5d85'

const ASSET_NEW_CHAT =
  'https://www.figma.com/api/mcp/asset/dd5a1ba5-d3df-444c-bed1-631cdb06afba'

const NAV_ITEMS: { id: string; label: string; active?: boolean }[] = [
  { id: 'agent', label: 'MI AI Agent', active: true },
  { id: 'chart', label: 'MI CHART' },
  { id: 'market', label: '앱 마켓 인덱스' },
  { id: 'usage', label: '사용량 인덱스' },
  { id: 'consumption', label: '소비 인덱스' },
  { id: 'report', label: '인사이트 리포트' },
  { id: 'cs', label: '고객센터' },
  { id: 'product', label: '상품안내' },
]

const HISTORY_ITEMS: {
  id: string
  label: string
  pinned?: boolean
  active?: boolean
}[] = [
  { id: '1', label: '모바일인덱스 INSIGHT 상품 체계', pinned: true },
  {
    id: '2',
    label: '쿠팡과 11번가의 최근 1년간 MAU 추이 비교',
    pinned: true,
    active: true,
  },
  { id: '3', label: '내 앱의 이탈 고객 분석', pinned: true },
  { id: '4', label: '다음달 쿠팡이츠 사용자 수 순위 예측' },
  { id: '5', label: '요즘 뜨는 업종 분석' },
  { id: '6', label: '2025년 주간 쿠팡 사용자 수 추이 분석' },
]

function IconOpenInNew() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 0 1 7-7 7 7 0 0 1 7 7 7 7 0 0 1-7 7h-2v2h2a9 9 0 0 0 9-9 9 9 0 0 0-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  )
}

function IconGnbInsightReport() {
  return (
    <svg
      className={styles.railIconSvg}
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v4h4M8 12h8M8 16h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4 6h9l2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.45"
      />
    </svg>
  )
}

function RailNavIcon({ navId }: { navId: string }) {
  if (navId === 'consumption') {
    return (
      <img
        src={consumptionPng}
        alt=""
        width={30}
        height={30}
        className={styles.railIconImg}
      />
    )
  }
  if (navId === 'report') {
    return <IconGnbInsightReport />
  }

  const src =
    navId === 'agent'
      ? GNB_ICON_FROM_FIGMA.agentChart
      : navId === 'chart'
        ? GNB_ICON_FROM_FIGMA.miChart
        : navId === 'market'
          ? GNB_ICON_FROM_FIGMA.market
          : navId === 'usage'
            ? GNB_ICON_FROM_FIGMA.usage
            : navId === 'cs'
              ? GNB_ICON_FROM_FIGMA.more
              : navId === 'product'
                ? GNB_ICON_FROM_FIGMA.productGuide
                : null

  if (!src) return null

  return (
    <img src={src} alt="" width={30} height={30} className={styles.railIconImg} />
  )
}

export type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.topBar} role="banner">
        <div className={styles.topBarLeft}>
          <div className={styles.topTabActive} aria-current="page">
            <span>모바일인덱스</span>
            <span className={styles.enAccent}> INSIGHT</span>
          </div>
          <div className={styles.topDivider} aria-hidden />
          <button type="button" className={styles.topTab}>
            <span>모바일인덱스</span>
            <span className={styles.enMuted}> GAME</span>
            <IconOpenInNew />
          </button>
          <button type="button" className={styles.topTab}>
            모바일인덱스 AUDIENCE
            <IconOpenInNew />
          </button>
        </div>
        <nav className={styles.topBarRight} aria-label="계정">
          <a href="#signup" className={styles.topLinkStrong}>
            회원가입
          </a>
          <a href="#login" className={styles.topLink}>
            로그인
          </a>
          <a href="#product" className={styles.topLink}>
            상품안내
          </a>
        </nav>
      </header>

      <div className={styles.contentRow}>
        <nav className={styles.iconRail} aria-label="서비스 메뉴">
          <div className={styles.miHomeWrap}>
            <img
              src={miHomePng}
              alt=""
              width={30}
              height={30}
              className={styles.miHomeLogo}
            />
          </div>
          <div className={styles.navStack}>
            {NAV_ITEMS.map((item) => {
              const active = Boolean(item.active)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={active ? styles.navItemActive : styles.navItem}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.navIcon}>
                    <RailNavIcon navId={item.id} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <aside className={styles.chatPanel} aria-label="대화">
          <h2 className={styles.agentTitle}>
            <img
              src={ASSET_MI_AI_HEADER_LOGO}
              alt=""
              width={30}
              height={30}
              className={styles.agentTitleIcon}
            />
            MI AI Agent
          </h2>

          <div className={styles.chatList}>
            <button type="button" className={styles.newChat}>
              <span className={styles.newChatIcon}>
                <img src={ASSET_NEW_CHAT} alt="" width={24} height={24} />
              </span>
              새 대화
            </button>
            <div className={styles.snbDivider} />
            <div className={styles.history}>
              <div className={styles.historyTitle}>
                <IconHistory />
                대화 히스토리
              </div>
              <div className={styles.historyScroll}>
                {HISTORY_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      item.active ? styles.historyItemActive : styles.historyItem
                    }
                  >
                    {item.pinned ? (
                      <span className={styles.pin}>
                        <IconPin />
                      </span>
                    ) : null}
                    <span className={styles.historyItemText}>{item.label}</span>
                    {item.active ? (
                      <span className={styles.moreIcon} aria-hidden>
                        <IconMore />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className={styles.mainLane}>
          <div className={styles.mainCard}>
            <main className={styles.main}>
              <div className={styles.mainColumn}>{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
