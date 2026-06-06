import {
  Fragment,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Layout.module.css'
import miHomePng from '../assets/gnb/mi-home.png'
import icoSnb01 from '../assets/ico_snb01.svg'
import icoSnb02 from '../assets/ico_snb02.svg'
import icoSnb03 from '../assets/ico_snb03.svg'
import icoSnb04 from '../assets/ico_snb04.svg'
import icoSnb05 from '../assets/ico_snb05.svg'
import icoSnb06 from '../assets/ico_snb06.svg'
import icoSnb07 from '../assets/ico_snb07.svg'
import icoSnb08 from '../assets/ico_snb08.svg'
import icoSymbol from '../assets/ico_symbol.svg'
import icoNewChat from '../assets/ico_newchat.svg'
import icoMore from '../assets/ico_more.svg'
import icoEdit from '../assets/ico_edit.svg'
import icoPinMenu from '../assets/ico_pin.svg'
import icoShare from '../assets/ico_share.svg'
import icoDelete from '../assets/ico_delete.svg'

const NAV_ITEMS: { id: string; label: string; icon: string; active?: boolean }[] = [
  { id: 'agent', label: 'MI AI Agent', icon: icoSnb01, active: true },
  { id: 'chart', label: 'MI CHART', icon: icoSnb02 },
  { id: 'market', label: '앱 마켓 인덱스', icon: icoSnb03 },
  { id: 'usage', label: '사용량 인덱스', icon: icoSnb04 },
  { id: 'consumption', label: '소비 인덱스', icon: icoSnb05 },
  { id: 'report', label: '인사이트 리포트', icon: icoSnb06 },
  { id: 'cs', label: '고객센터', icon: icoSnb07 },
  { id: 'product', label: '상품안내', icon: icoSnb08 },
]

/** LandingPage 등 전역 모달 포털 마운트 — `.page` CSS 변수 상속, SNB 위 레이어 */
export const APP_MODAL_ROOT_ID = 'app-modal-root'

type HistoryItem = {
  id: string
  label: string
  createdAt: number
  pinned?: boolean
  active?: boolean
}

function sortHistoryItems(items: HistoryItem[]): HistoryItem[] {
  const pinned = items
    .filter((item) => item.pinned)
    .sort((a, b) => b.createdAt - a.createdAt)
  const unpinned = items
    .filter((item) => !item.pinned)
    .sort((a, b) => b.createdAt - a.createdAt)
  return [...pinned, ...unpinned]
}

type HistoryMenuAction = 'rename' | 'pin' | 'share' | 'delete'

type HistoryMenuOption = {
  action: HistoryMenuAction
  label: string
  icon: string
  dividerBefore?: boolean
}

function getHistoryMenuOptions(item: HistoryItem): HistoryMenuOption[] {
  return [
    { action: 'rename', label: '이름 변경', icon: icoEdit },
    {
      action: 'pin',
      label: item.pinned ? '고정 해제' : '대화 고정',
      icon: icoPinMenu,
    },
    { action: 'share', label: '공유하기', icon: icoShare },
    { action: 'delete', label: '삭제', icon: icoDelete, dividerBefore: true },
  ]
}

const INITIAL_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: '1',
    label: '모바일인덱스 INSIGHT 상품 체계',
    pinned: true,
    createdAt: 1_700_000_000_000,
  },
  {
    id: '2',
    label: '쿠팡과 11번가의 최근 1년간 MAU 추이 비교',
    pinned: true,
    createdAt: 1_700_000_864_000,
  },
  { id: '3', label: '내 앱의 이탈 고객 분석', createdAt: 1_700_001_728_000 },
  { id: '4', label: '다음달 쿠팡이츠 사용자 수 순위 예측', createdAt: 1_700_001_200_000 },
  { id: '5', label: '요즘 뜨는 업종 분석', createdAt: 1_700_000_432_000 },
  { id: '6', label: '2025년 주간 쿠팡 사용자 수 추이 분석', createdAt: 1_700_000_216_000 },
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

function RailNavIcon({ src }: { src: string }) {
  return <img src={src} alt="" width={30} height={30} className={styles.railIconImg} />
}

function HistoryMenuIcon({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      className={styles.historyMenuIconImg}
      aria-hidden
    />
  )
}

export type LayoutProps = {
  children: ReactNode
  /** 차트 확장 등 전역 모달 포털 마운트 대상 */
  modalPortalRef?: Ref<HTMLDivElement>
  /** SNB 로고·새 대화 클릭 시 첫 진입 화면으로 리셋 */
  onResetToHome?: () => void
  /** 현재 대화의 첫 user 질문 — 변경 시 SNB 히스토리에 스레드 추가 */
  currentThreadTitle?: string
  /** 히스토리 삭제 등 SNB 액션 토스트 */
  onShowToast?: (message: string) => void
}

export default function Layout({
  children,
  modalPortalRef,
  onResetToHome,
  currentThreadTitle,
  onShowToast,
}: LayoutProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(INITIAL_HISTORY_ITEMS)
  const sortedHistoryItems = useMemo(
    () => sortHistoryItems(historyItems),
    [historyItems],
  )
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null)
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null)
  const prevThreadTitleRef = useRef<string | undefined>(undefined)

  const cancelDeleteHistory = useCallback(() => {
    setPendingDeleteItemId(null)
  }, [])

  const confirmDeleteHistory = useCallback(() => {
    if (!pendingDeleteItemId) return
    const itemId = pendingDeleteItemId
    let wasActive = false
    setHistoryItems((prev) => {
      const target = prev.find((item) => item.id === itemId)
      wasActive = Boolean(target?.active)
      return prev.filter((item) => item.id !== itemId)
    })
    setPendingDeleteItemId(null)
    if (wasActive) {
      prevThreadTitleRef.current = ''
      onResetToHome?.()
    }
    onShowToast?.('대화가 삭제되었습니다.')
  }, [pendingDeleteItemId, onResetToHome, onShowToast])

  const handleHistoryMenuAction = useCallback(
    (action: HistoryMenuAction, itemId: string) => {
      if (action === 'pin') {
        setHistoryItems((prev) => {
          const now = Date.now()
          const updated = prev.map((item) => {
            if (item.id !== itemId) return item
            if (item.pinned) {
              return { ...item, pinned: false, createdAt: now }
            }
            return { ...item, pinned: true, createdAt: now }
          })
          return sortHistoryItems(updated)
        })
        setOpenMenuItemId(null)
        return
      }

      if (action === 'delete') {
        setOpenMenuItemId(null)
        setPendingDeleteItemId(itemId)
        return
      }

      console.log(action, itemId)
      setOpenMenuItemId(null)
    },
    [],
  )

  useEffect(() => {
    if (!pendingDeleteItemId) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') cancelDeleteHistory()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingDeleteItemId, cancelDeleteHistory])

  useEffect(() => {
    if (!openMenuItemId) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-history-menu-root]')) return
      setOpenMenuItemId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openMenuItemId])

  useEffect(() => {
    const title = currentThreadTitle?.trim() ?? ''

    if (!title) {
      setHistoryItems((prev) =>
        prev.map((item) => (item.active ? { ...item, active: false } : item)),
      )
      prevThreadTitleRef.current = title
      return
    }

    if (prevThreadTitleRef.current === title) return

    prevThreadTitleRef.current = title
    setHistoryItems((prev) => [
      ...prev.map((item) => ({ ...item, active: false })),
      {
        id: crypto.randomUUID(),
        label: title,
        pinned: false,
        active: true,
        createdAt: Date.now(),
      },
    ])
  }, [currentThreadTitle])

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
                    <RailNavIcon src={item.icon} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <aside className={styles.chatPanel} aria-label="대화">
          <button
            type="button"
            className={styles.agentTitleBtn}
            onClick={onResetToHome}
            aria-label="MI AI Agent 홈으로 이동"
          >
            <img
              src={icoSymbol}
              alt=""
              width={30}
              height={30}
              className={styles.agentTitleIcon}
            />
            MI AI Agent
          </button>

          <div className={styles.chatList}>
            <button type="button" className={styles.newChat} onClick={onResetToHome}>
              <span className={styles.newChatIcon}>
                <img src={icoNewChat} alt="" width={24} height={24} />
              </span>
              새 대화
            </button>
            <div className={styles.snbDivider} />
            <div className={styles.history}>
              <div className={styles.historyTitle}>
                <IconHistory />
                대화 히스토리
              </div>
              <div
                className={
                  historyItems.length === 0
                    ? `${styles.historyScroll} ${styles.historyScrollEmpty}`
                    : styles.historyScroll
                }
              >
                {historyItems.length === 0 ? (
                  <p className={styles.historyEmpty}>대화 히스토리가 없습니다.</p>
                ) : (
                sortedHistoryItems.map((item) => {
                  const menuOpen = openMenuItemId === item.id
                  return (
                    <div
                      key={item.id}
                      className={`${styles.historyItemWrap}${
                        item.active ? ` ${styles.historyItemWrapActive}` : ''
                      }${menuOpen ? ` ${styles.historyItemWrapMenuOpen}` : ''}`}
                    >
                      <button
                        type="button"
                        className={
                          item.active ? styles.historyItemActive : styles.historyItem
                        }
                      >
                        <span className={styles.historyItemMain}>
                          {item.pinned ? (
                            <span className={styles.pin} aria-hidden>
                              <span className={styles.pinIcon} />
                            </span>
                          ) : null}
                          <span className={styles.historyItemText}>{item.label}</span>
                        </span>
                      </button>
                      <div className={styles.historyItemMenuWrap} data-history-menu-root>
                        <button
                          type="button"
                          className={styles.moreBtn}
                          aria-label="더보기 메뉴"
                          aria-expanded={menuOpen}
                          aria-haspopup="menu"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuItemId((prev) =>
                              prev === item.id ? null : item.id,
                            )
                          }}
                        >
                          <img
                            src={icoMore}
                            alt=""
                            width={20}
                            height={20}
                            className={styles.moreIconImg}
                          />
                        </button>
                        {menuOpen ? (
                          <div className={styles.historyDropdown} role="menu">
                            {getHistoryMenuOptions(item).map((opt) => (
                              <Fragment key={opt.action}>
                                {opt.dividerBefore ? (
                                  <div
                                    className={styles.historyMenuDivider}
                                    role="separator"
                                  />
                                ) : null}
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={styles.historyMenuRow}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleHistoryMenuAction(opt.action, item.id)
                                  }}
                                >
                                  <HistoryMenuIcon src={opt.icon} />
                                  <span className={styles.historyMenuLabel}>
                                    {opt.label}
                                  </span>
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })
                )}
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
      <div
        id={APP_MODAL_ROOT_ID}
        ref={modalPortalRef}
        className={styles.modalPortalRoot}
      />
      {pendingDeleteItemId
        ? createPortal(
            <div
              className={styles.historyDeleteOverlay}
              role="presentation"
              onClick={cancelDeleteHistory}
            >
              <div
                className={styles.historyDeleteModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-delete-modal-title"
                aria-describedby="history-delete-modal-desc"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.historyDeleteModalContent}>
                  <h3
                    id="history-delete-modal-title"
                    className={styles.historyDeleteModalTitle}
                  >
                    대화를 삭제하시겠어요?
                  </h3>
                  <p
                    id="history-delete-modal-desc"
                    className={styles.historyDeleteModalDesc}
                  >
                    삭제된 대화는 복구할 수 없습니다.
                  </p>
                </div>
                <div className={styles.historyDeleteModalFooter}>
                  <button
                    type="button"
                    className={styles.historyDeleteCancelBtn}
                    onClick={cancelDeleteHistory}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className={styles.historyDeleteConfirmBtn}
                    onClick={confirmDeleteHistory}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>,
            document.getElementById(APP_MODAL_ROOT_ID) ?? document.body,
          )
        : null}
    </div>
  )
}
