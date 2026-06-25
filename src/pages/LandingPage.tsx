import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import {
  CHART_COMBO_ANIMATION_MS,
  MockComboRechartsChart,
} from '../components/MockComboRechartsChart'
import {
  MOCK_CHART_VARIANT2_TOTAL_HEIGHT,
  MockChartVariant2,
} from '../components/MockChartVariant2'
import Layout, { APP_MODAL_ROOT_ID } from '../components/Layout'
import { TooltipWrap } from '../components/TooltipWrap'
import imgAppicon from '../assets/img_appicon.png'
import imgAppicon2 from '../assets/img_appicon_2.png'
import icoBookmark from '../assets/ico_boomark.svg'
import icoBookmarkBorder from '../assets/ico_bookmark_border.svg'
import icoBookmarkFilled from '../assets/ico_bookmark_filled.svg'
import icoCheck from '../assets/ico_check.svg'
import icoCopy from '../assets/ico_copy.svg'
import icoDownload from '../assets/ico_download.svg'
import icoExcel from '../assets/ico_excel.svg'
import icoExpand from '../assets/ico_expand.svg'
import icoDeepdive from '../assets/ico_deepdive.svg'
import icoHate from '../assets/ico_hate.svg'
import icoHateLine from '../assets/ico_hate_line.svg'
import icoLike from '../assets/ico_like.svg'
import icoLikeLine from '../assets/ico_like_line.svg'
import icoArrow from '../assets/ico_arrow.svg'
import icoBranchLast from '../assets/ico_branch_last.svg'
import icoBranchMiddle from '../assets/ico_branch_middle.svg'
import icoClose from '../assets/ico_close.svg'
import icoModalClose from '../assets/ico_modal_close.svg'
import icoOpen from '../assets/ico_open.svg'
import icoPause from '../assets/ico_pause.svg'
import icoReplay from '../assets/ico_replay.svg'
import icoSend from '../assets/ico_send.svg'
import icoSymbol from '../assets/ico_symbol.svg'
import styles from './LandingPage.module.css'

const TABS = ['현황 파악', '변화 추적', '원인 탐색', '향후 예측'] as const

const CHAT_SCROLL_BOTTOM_THRESHOLD = 50

/** Figma 피드백 모달 (`24359:29183`) 사유 목록 */
const FEEDBACK_REASONS = [
  '데이터가 정확하지 않아요',
  '원하는 답변이 아니에요',
  '답변이 너무 부족해요',
  '기타',
] as const

/** Figma `dropdown` (`24345:11707`) 샘플 목록 */
const INITIAL_FAVORITE_QUESTIONS = [
  '내 앱의 이탈 고객을 분석해줘',
  '데모그래픽 비교 분석에서 얻을 수 있는 인사이트를 알려줘',
  '1위 앱과 2위 앱의 사용자 수 격차가 가장 크게 벌어질 것으로 예상되는 업종은?',
  '모바일인덱스 INSIGHT 상품 체계를 알려줘',
  'Tiktok 사용자 순위가 증가한 원인을 알려줘',
  '요즘 뜨는 업종을 알려줘',
  '내 앱의 신규 설치 수를 분석해줘',
] as const

/** 탭별 추천 질문 (순서: 현황 파악, 변화 추적, 원인 탐색, 향후 예측) */
const RECOMMENDED_QUESTIONS_BY_TAB: readonly (readonly string[])[] = [
  [
    '1위와 2위의 신규 설치 건 수 격차가 가장 큰 업종은?',
    '활성 기기 수가 가장 낮은 앱/업종을 알려줘',
    '쿠팡의 현재 MAU와 신규 설치 현황을 알려줘',
    'G마켓의 1인당 사용시간이 가장 높은 사용자는?',
  ],
  [
    '최근 3개월간 MAU 변화 추이를 알려줘',
    '작년 대비 신규 설치 증감률은?',
    '넷플릭스의 월별 사용자 증감 패턴을 분석해줘',
    '경쟁 앱 대비 성장률 비교해줘',
  ],
  [
    '지그재그의 사용자 수 순위 변동이 잦은 원인이 뭘까?',
    '이탈률이 높은 구간을 찾아줘',
    '특정 업데이트 이후 지표 변화를 분석해줘',
    '사용자 이탈 패턴의 공통점은?',
  ],
  [
    '다음달 MAU를 예측해줘',
    '현재 추세라면 연말 사용자 수는?',
    '경쟁 앱의 성장세가 지속되면 어떻게 될까?',
    '이탈률 개선 시 예상 효과를 알려줘',
  ],
] as const

function IconChevronDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  )
}

/**
 * Figma `followupmap` (`24353:11813`) — 후속 질문 추천 (default 상태)
 * 좌측: 현재 질문 (1depth, primary-350 chip)
 * 우측: 추천 질문 4개 (2depth, gray-700 chip + 16x16 add 버튼)
 * 가운데: 4갈래 가지치기 라인
 *
 * 인터랙션(+ 버튼 클릭으로 3depth 확장)은 2단계에서 추가 예정.
 */
type FollowupContext = 'chart' | 'text'

type FollowupSuggestion = {
  label: string
  expansions: readonly string[]
}

const FOLLOWUP_CONTENT: Record<
  FollowupContext,
  { suggestions: readonly FollowupSuggestion[] }
> = {
  chart: {
    suggestions: [
      {
        label: '쿠팡과 G마켓의 향후 MAU 비교 예측',
        expansions: ['G마켓 향후 MAU 변화 예측', '쿠팡 vs G마켓 사용자층 비교'],
      },
      {
        label: '쿠팡 신규 설치 건수가 가장 높았던 시점 분석',
        expansions: ['쿠팡 11월 신규 설치 급증 원인', '쿠팡 설치 후 재방문율 추이'],
      },
      {
        label: '향후 쿠팡 MAU 증가 요인 분석',
        expansions: ['신규 캠페인 영향 분석', '핵심 사용자 유입 채널'],
      },
      {
        label: '쿠팡 MAU 성장세가 둔화될 가능성',
        expansions: ['경쟁사 점유율 변화 추이', '주요 지표 둔화 신호'],
      },
    ],
  },
  text: {
    suggestions: [
      {
        label: '모바일인덱스 INSIGHT 요금제 안내',
        expansions: ['무료 체험 신청 방법', '기업 요금제 종류'],
      },
      {
        label: '무료 제공 기능 범위',
        expansions: ['무료 조회 가능 지표 종류', '무료 데이터 조회 기간'],
      },
      {
        label: '경쟁사 앱 비교 분석 가능 여부',
        expansions: ['비교 가능 앱 수 제한', '비교 분석 제공 지표 항목'],
      },
      {
        label: '데이터 업데이트 주기',
        expansions: ['OS별 데이터 업데이트 차이', '실시간 데이터 제공 여부'],
      },
    ],
  },
}

const FOLLOWUP_TRANSITION_MS = 360
const ICON_PATH_ADD = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
const ICON_PATH_REMOVE = 'M19 13H5v-2h14v2z'

/**
 * 2뎁스 브랜치 아이콘:
 * - 바로 아래 3뎁스가 있으면 → last
 * - 3뎁스 없고 형제 2개 이상이면 → 마지막 형제만 last, 나머지 middle
 * - 단일 2뎁스 → last
 */
function isDepth2BranchIconLast(
  branchIdx: number,
  branchCount: number,
  hasDepth3Children: boolean,
): boolean {
  if (hasDepth3Children) {
    return true
  }
  if (branchCount > 1) {
    return branchIdx === branchCount - 1
  }
  return true
}

function ThreadBranchIcon({ isLast }: { isLast: boolean }) {
  return (
    <img
      src={isLast ? icoBranchLast : icoBranchMiddle}
      alt=""
      width={24}
      height={28}
      className={styles.threadBranchIcon}
      aria-hidden
    />
  )
}

function ThreadDepthRowButton({
  content,
  depth,
  isLastSibling,
  onSelect,
}: {
  content: string
  depth: 1 | 2 | 3
  isLastSibling: boolean
  onSelect: () => void
}) {
  const depthClass =
    depth === 1
      ? styles.threadDepthRowDepth1
      : depth === 2
        ? styles.threadDepthRowDepth2
        : styles.threadDepthRowDepth3

  return (
    <TooltipWrap label={content} className={styles.threadDepthTooltipWrap}>
      <button
        type="button"
        className={`${styles.threadDepthRow} ${depthClass}`}
        onClick={onSelect}
      >
        {depth === 1 ? (
          <span className={styles.threadDepthBullet} aria-hidden />
        ) : (
          <ThreadBranchIcon isLast={isLastSibling} />
        )}
        <span className={styles.threadDepthText}>{content}</span>
      </button>
    </TooltipWrap>
  )
}

type ThreadPanelBranch = {
  id: string
  content: string
  children: { id: string; content: string }[]
}

type ThreadPanelGroup = {
  root: { id: string; content: string }
  branches: ThreadPanelBranch[]
}

/** Figma `24360:35151` — 질문 흐름 패널 mock 트리 */
const MOCK_THREAD_PANEL_GROUPS: ThreadPanelGroup[] = [
  {
    root: {
      id: 'mock-thread-root-1',
      content: '쿠팡과 11번가의 최근 1년간 MAU 추이 비교',
    },
    branches: [
      {
        id: 'mock-thread-d2-1',
        content: '쿠팡 MAU 성장 요인 분석',
        children: [
          { id: 'mock-thread-d3-1', content: '로켓배송 락인 효과 분석' },
          { id: 'mock-thread-d3-2', content: '쿠팡 와우 멤버십 가입 추이' },
        ],
      },
      {
        id: 'mock-thread-d2-2',
        content: '11번가 MAU 감소 원인',
        children: [
          { id: 'mock-thread-d3-4', content: '11번가 이탈 사용자 패턴' },
          { id: 'mock-thread-d3-5', content: '이탈 후 이동한 앱 분석' },
          { id: 'mock-thread-d3-6', content: '이탈 시점 공통 패턴' },
        ],
      },
    ],
  },
  {
    root: {
      id: 'mock-thread-root-2',
      content: '쇼핑 업종 상위 앱 점유율 현황',
    },
    branches: [
      {
        id: 'mock-thread-d2-3',
        content: '쿠팡 vs G마켓 사용자 비교',
        children: [
          { id: 'mock-thread-d3-7', content: '연령대별 선호 앱 차이' },
        ],
      },
      {
        id: 'mock-thread-d2-4',
        content: '신규 쇼핑 앱 성장세 분석',
        children: [],
      },
      {
        id: 'mock-thread-d2-5',
        content: '업종별 월간 사용자 증감 추이',
        children: [],
      },
      {
        id: 'mock-thread-d2-6',
        content: '쇼핑 앱 재방문율 비교',
        children: [],
      },
    ],
  },
  {
    root: {
      id: 'mock-thread-root-3',
      content: '쿠팡과 G마켓의 신규 설치 건수 비교',
    },
    branches: [],
  },
]

function QuestionFlowPanel({
  groups,
  onSelectQuestion,
}: {
  groups: ThreadPanelGroup[]
  onSelectQuestion: (lineId: string) => void
}) {
  return (
    <aside className={styles.threadPanel} aria-label="질문 흐름">
      <div className={styles.threadPanelHeader}>
        <h3 className={styles.threadPanelTitle}>질문 흐름</h3>
        <p className={styles.threadPanelDesc}>질문 간 전체 맥락을 파악하세요.</p>
      </div>
      <div className={styles.threadPanelList}>
        {groups.map((group, groupIdx) => (
          <div key={group.root.id}>
            {groupIdx > 0 ? (
              <div className={styles.threadPanelDividerWrap}>
                <div className={styles.threadPanelDivider} aria-hidden />
              </div>
            ) : null}
            <div className={styles.threadPanelGroup}>
              <ThreadDepthRowButton
                depth={1}
                content={group.root.content}
                isLastSibling={false}
                onSelect={() => onSelectQuestion(group.root.id)}
              />
              {group.branches.map((branch, branchIdx) => {
                const branchCount = group.branches.length
                const hasChildren = branch.children.length > 0
                const depth2IconIsLast = isDepth2BranchIconLast(
                  branchIdx,
                  branchCount,
                  hasChildren,
                )
                return (
                  <div key={branch.id} className={styles.threadBranchGroup}>
                    <ThreadDepthRowButton
                      depth={2}
                      content={branch.content}
                      isLastSibling={depth2IconIsLast}
                      onSelect={() => onSelectQuestion(branch.id)}
                    />
                    {hasChildren ? (
                      <div className={styles.threadDepth3Group}>
                        {branch.children.map((child, childIdx) => {
                          const isLastChild = childIdx === branch.children.length - 1
                          return (
                            <ThreadDepthRowButton
                              key={child.id}
                              depth={3}
                              content={child.content}
                              isLastSibling={isLastChild}
                              onSelect={() => onSelectQuestion(child.id)}
                            />
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function FollowupMap({
  context,
  rootQuestion,
  onSelect,
}: {
  context: FollowupContext
  rootQuestion: string
  onSelect: (text: string, depth: 2 | 3) => void
}) {
  const { suggestions } = FOLLOWUP_CONTENT[context]
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const expandedItem = expandedIdx !== null ? suggestions[expandedIdx] : null
  const isExpanded = expandedItem !== null

  useEffect(() => {
    setExpandedIdx(null)
  }, [context])

  const bodyRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const expandBtnRefs = useRef<Array<HTMLButtonElement | null>>([])
  const expansionRefs = useRef<Array<HTMLElement | null>>([])
  const [primaryPaths, setPrimaryPaths] = useState<string[]>([])
  const [secondaryPaths, setSecondaryPaths] = useState<string[]>([])
  const [svgSize, setSvgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const compute = () => {
      const body = bodyRef.current
      const root = rootRef.current
      if (!body || !root) return
      const bRect = body.getBoundingClientRect()
      const rRect = root.getBoundingClientRect()
      const startX = rRect.right - bRect.left
      const startY = rRect.top - bRect.top + rRect.height / 2

      const next: string[] = []
      for (let i = 0; i < suggestions.length; i++) {
        const item = itemRefs.current[i]
        if (!item) continue
        const iRect = item.getBoundingClientRect()
        const endX = iRect.left - bRect.left
        const endY = iRect.top - bRect.top + iRect.height / 2
        const dx = endX - startX
        const c1x = startX + dx * 0.5
        const c2x = endX - dx * 0.5
        next.push(
          `M ${startX} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${endX} ${endY}`,
        )
      }

      const secondary: string[] = []
      if (expandedIdx !== null && expandedItem) {
        // 2depth → 3depth 선은 노드가 아닌 '−' 버튼 우측 중앙에서 시작한다.
        const source = expandBtnRefs.current[expandedIdx]
        if (source) {
          const sRect = source.getBoundingClientRect()
          const sStartX = sRect.right - bRect.left
          const sStartY = sRect.top - bRect.top + sRect.height / 2
          for (let i = 0; i < expandedItem.expansions.length; i++) {
            const exp = expansionRefs.current[i]
            if (!exp) continue
            const eRect = exp.getBoundingClientRect()
            const endX = eRect.left - bRect.left
            const endY = eRect.top - bRect.top + eRect.height / 2
            const dx = endX - sStartX
            const c1x = sStartX + dx * 0.5
            const c2x = endX - dx * 0.5
            secondary.push(
              `M ${sStartX} ${sStartY} C ${c1x} ${sStartY}, ${c2x} ${endY}, ${endX} ${endY}`,
            )
          }
        }
      }

      setSvgSize({ w: bRect.width, h: bRect.height })
      setPrimaryPaths(next)
      setSecondaryPaths(secondary)
    }

    compute()

    // 2depth ↔ 3depth 레이아웃 전환 중에는 ResizeObserver가 매 프레임 발화하지 않을 수 있어서
    // 전환 지속 시간 동안 requestAnimationFrame으로 path 좌표를 함께 보간해준다.
    let rafId = 0
    const startTime = performance.now()
    const followFrame = (now: number) => {
      compute()
      if (now - startTime < FOLLOWUP_TRANSITION_MS + 60) {
        rafId = requestAnimationFrame(followFrame)
      }
    }
    rafId = requestAnimationFrame(followFrame)

    const ro = new ResizeObserver(compute)
    if (bodyRef.current) ro.observe(bodyRef.current)
    if (rootRef.current) ro.observe(rootRef.current)
    for (const el of itemRefs.current) {
      if (el) ro.observe(el)
    }
    for (const el of expandBtnRefs.current) {
      if (el) ro.observe(el)
    }
    for (const el of expansionRefs.current) {
      if (el) ro.observe(el)
    }
    window.addEventListener('resize', compute)
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [context, expandedIdx, expandedItem, suggestions])

  return (
    <section className={styles.followupCard} aria-label="후속 질문 추천">
      <header className={styles.followupHeader}>
        <h3 className={styles.followupTitle}>후속 질문 추천</h3>
        <p className={styles.followupHint}>
          후속 질문을 클릭하거나 ‘+’ 버튼을 통해 확장해 보세요.
        </p>
      </header>
      <div
        className={`${styles.followupBody}${
          isExpanded ? ` ${styles.followupBodyExpanded}` : ''
        }`}
        ref={bodyRef}
      >
        <svg
          className={styles.followupLines}
          width={svgSize.w || 0}
          height={svgSize.h || 0}
          viewBox={`0 0 ${svgSize.w || 1} ${svgSize.h || 1}`}
          aria-hidden
        >
          {primaryPaths.map((d, i) => (
            <path
              key={`p-${i}`}
              d={d}
              stroke="#60606C"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {secondaryPaths.map((d, i) => (
            <path
              key={`s-${i}`}
              d={d}
              stroke="#60606C"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </svg>
        <div className={styles.followupCol}>
          <TooltipWrap label={rootQuestion}>
            <span className={styles.followupRootChip} ref={rootRef}>
              <span className={styles.followupChipText}>{rootQuestion}</span>
            </span>
          </TooltipWrap>
        </div>
        <div className={styles.followupCol}>
          <ul className={styles.followupList}>
            {suggestions.map((s, idx) => {
              const expanded = idx === expandedIdx
              return (
                <li key={s.label} className={styles.followupItem}>
                  <TooltipWrap label={s.label}>
                    <button
                      type="button"
                      className={styles.followupChip}
                      ref={(el) => {
                        itemRefs.current[idx] = el
                      }}
                      onClick={() => onSelect(s.label, 2)}
                    >
                      <span className={styles.followupChipText}>{s.label}</span>
                    </button>
                  </TooltipWrap>
                  <TooltipWrap label={expanded ? '확장 질문 접기' : '질문 확장하기'}>
                    <button
                      type="button"
                      className={`${styles.followupAddBtn}${
                        expanded ? ` ${styles.followupAddBtnActive}` : ''
                      }`}
                      aria-label={`${s.label} ${expanded ? '접기' : '확장'}`}
                      aria-pressed={expanded}
                      ref={(el) => {
                        expandBtnRefs.current[idx] = el
                      }}
                      onClick={() => setExpandedIdx(expanded ? null : idx)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                        <path
                          d={expanded ? ICON_PATH_REMOVE : ICON_PATH_ADD}
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </TooltipWrap>
                </li>
              )
            })}
          </ul>
        </div>
        <div
          className={`${styles.followupCol} ${styles.followupColExpansion}${
            isExpanded ? '' : ` ${styles.followupColCollapsed}`
          }`}
          aria-hidden={!isExpanded}
        >
          {expandedItem ? (
            <ul className={styles.followupList}>
              {expandedItem.expansions.map((q, idx) => (
                <li key={q} className={styles.followupItem}>
                  <TooltipWrap label={q}>
                    <button
                      type="button"
                      className={styles.followupChip}
                      ref={(el) => {
                        expansionRefs.current[idx] = el
                      }}
                      onClick={() => onSelect(q, 3)}
                    >
                      <span className={styles.followupChipText}>{q}</span>
                    </button>
                  </TooltipWrap>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function AnswerActionIconBtn({
  label,
  tooltip,
  iconSrc,
  disabled,
  onClick,
}: {
  label: string
  tooltip: string
  iconSrc: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <TooltipWrap label={tooltip} disabled={disabled}>
      <button
        type="button"
        className={styles.answerIconBtn}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        <img src={iconSrc} alt="" width={20} height={20} className={styles.answerIconImg} />
      </button>
    </TooltipWrap>
  )
}

function AnswerFeedbackIconBtn({
  label,
  tooltip,
  lineIconSrc,
  activeIconSrc,
  active,
  disabled,
  onClick,
}: {
  label: string
  tooltip: string
  lineIconSrc: string
  activeIconSrc: string
  active: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <TooltipWrap label={tooltip} disabled={disabled}>
      <button
        type="button"
        className={`${styles.answerIconBtn}${active ? ` ${styles.answerIconBtnActive}` : ''}`}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
      >
        <img
          src={active ? activeIconSrc : lineIconSrc}
          alt=""
          width={20}
          height={20}
          className={styles.answerIconImg}
        />
      </button>
    </TooltipWrap>
  )
}

function AnswerDeepDiveBtn({
  disabled,
  onClick,
}: {
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <TooltipWrap label="깊은 분석+인사이트 제공" disabled={disabled}>
      <button
        type="button"
        className={styles.answerDeepDiveBtn}
        disabled={disabled}
        onClick={onClick}
      >
        <img
          src={icoDeepdive}
          alt=""
          width={20}
          height={20}
          className={styles.answerDeepDiveIcon}
        />
        <span>심층 분석하기</span>
      </button>
    </TooltipWrap>
  )
}

type TextMockCategory = 'data' | 'industry' | 'default'
type ReplyKind = 'chart' | 'text' | 'unavailable'

type ChartAnswerDepth = 'basic' | 'deep'
type ChartMockVariant = 'combo' | 'churn'

type QuestionDepth = 1 | 2 | 3

type ChatLine =
  | { id: string; role: 'user'; content: string; questionDepth: QuestionDepth }
  | {
      id: string
      role: 'assistant'
      content: string
      replyKind: ReplyKind
      mockCategory?: TextMockCategory
      chartDepth?: ChartAnswerDepth
      chartMockVariant?: ChartMockVariant
      chartVisible?: boolean
      chartSectionsReady?: boolean
      chartIndicatorText?: string
      chartCauseText?: string
      chartForecastText?: string
      chartInsight1Text?: string
      chartInsight2Text?: string
      showScrollPadding?: boolean
    }

const CHART_INTRO_TEXT =
  '최근 1년간 쿠팡 MAU와 신규 설치 건수 모두 꾸준한 증가세를 보였으며, 향후 추이 역시 지속적인 증가와 11월 집중 증가가 예측됩니다.'

const CHART_CARD_TITLE =
  '쿠팡의 2024년 4월~2025년 3월 MAU, 신규 설치 건 수 추이 비교'

const CHART_CARD_SUBTITLE = '성별 전체, 연령대 전체, OS 전체 기준'

const CHART2_CARD_TITLE =
  'G마켓의 최근 3개월 이탈 사용자 이동 앱 및 연령대별 성별 분포'

const CHART2_CARD_SUBTITLE = '2026.02~2025.05 기간, OS 전체 기준'

const CHART2_APP_TABLE_ROWS = [
  { app: '쿠팡', rate: '38%' },
  { app: '네이버쇼핑', rate: '24%' },
  { app: '무신사', rate: '15%' },
  { app: '올리브영', rate: '12%' },
  { app: '기타', rate: '11%' },
] as const

const CHART2_COHORT_TABLE_ROWS = [
  { age: '20대', male: '45%', female: '55%', topApp: '무신사' },
  { age: '30대', male: '52%', female: '48%', topApp: '쿠팡' },
  { age: '40대', male: '56%', female: '44%', topApp: '네이버쇼핑' },
  { age: '50대', male: '60%', female: '40%', topApp: '쿠팡' },
] as const

const CHART2_INTRO_TEXT =
  'G마켓 최근 3개월 이탈 사용자는 쿠팡·네이버쇼핑으로 주로 이동했으며, 연령대별로 이탈 후 이동 앱과 성별 분포에 차이가 나타납니다.'

const CHART2_INTRO_HIGHLIGHTS = ['쿠팡·네이버쇼핑', '이동 앱', '성별 분포'] as const

const CHART2_DEEP_INTRO_TEXT =
  'G마켓 최근 3개월 이탈 사용자의 38%가 쿠팡으로 이동했으며, 30대 여성 이탈률이 가장 높고 향후 이탈 가속화 가능성이 예측됩니다.'

const CHART2_DEEP_INTRO_HIGHLIGHTS = ['38%가 쿠팡으로', '30대 여성', '이탈 가속화'] as const

const CHART2_INDICATOR_PLAIN =
  '최근 3개월간 G마켓 이탈 사용자 중 쿠팡 이동 비율이 38%로 가장 높았으며, 네이버쇼핑(24%), 무신사(15%) 순으로 나타났습니다. 연령대별 성별 분포를 보면 20대는 여성 이탈 비율(55%)이 더 높고, 30대 이상부터는 남성 이탈 비율이 더 높게 나타나며 특히 50대 남성 이탈 비율이 60%로 가장 높았습니다.'

const CHART2_INDICATOR_BODY = (
  <>
    최근 3개월간 G마켓 이탈 사용자 중 <strong>쿠팡 이동 비율이 38%</strong>로 가장 높았으며,
    네이버쇼핑(24%), 무신사(15%) 순으로 나타났습니다. 연령대별 성별 분포를 보면{' '}
    <strong>20대는 여성 이탈 비율(55%)</strong>이 더 높고, 30대 이상부터는{' '}
    <strong>남성 이탈 비율이 더 높게</strong> 나타나며 특히{' '}
    <strong>50대 남성 이탈 비율이 60%</strong>로 가장 높았습니다.
  </>
)

const CHART2_CAUSE_PLAIN =
  '30대 여성 이탈의 주요 원인은 쿠팡의 로켓배송 및 와우 멤버십 혜택 확대로 분석됩니다. 특히 2025년 1월 쿠팡의 뷰티 카테고리 강화 이후 30대 여성 이탈이 전월 대비 12% 증가했습니다.'

const CHART2_CAUSE_BODY = (
  <>
    30대 여성 이탈의 주요 원인은 <strong>쿠팡의 로켓배송 및 와우 멤버십 혜택 확대</strong>로
    분석됩니다. 특히 2025년 1월 쿠팡의 뷰티 카테고리 강화 이후{' '}
    <strong>30대 여성 이탈이 전월 대비 12% 증가</strong>했습니다.
  </>
)

const CHART2_FORECAST_PLAIN =
  '현재 추이가 지속될 경우 2025년 2분기 내 30대 이탈률이 65%를 넘어설 것으로 예측됩니다. 특히 쿠팡의 멤버십 혜택이 추가 확대될 경우 이탈 가속화 가능성이 높습니다.'

const CHART2_FORECAST_BODY = (
  <>
    현재 추이가 지속될 경우 <strong>2025년 2분기 내 30대 이탈률이 65%</strong>를 넘어설 것으로
    예측됩니다. 특히 쿠팡의 멤버십 혜택이 추가 확대될 경우{' '}
    <strong>이탈 가속화 가능성</strong>이 높습니다.
  </>
)

const CHART2_INSIGHT1_PLAIN =
  '30대 여성 타겟 리텐션 캠페인이 가장 시급하며, 뷰티/패션 카테고리 혜택 강화가 효과적일 것으로 판단됩니다.'

const CHART2_INSIGHT2_PLAIN =
  '쿠팡 멤버십 혜택과 차별화된 자사 멤버십 프로그램 도입을 검토할 필요가 있습니다.'

const CHART_MONTH_LABELS = [
  '2024.04',
  '2024.05',
  '2024.06',
  '2024.07',
  '2024.08',
  '2024.09',
  '2024.10',
  '2024.11',
  '2024.12',
  '2025.01',
  '2025.02',
  '2025.03',
] as const

const CHART_BAR_SERIES = [
  120, 95, 110, 130, 105, 140, 160, 320, 150, 170, 155, 160,
] as const

const CHART_LINE_SERIES = [
  210, 220, 215, 225, 220, 230, 235, 240, 230, 235, 240, 245,
] as const

const CHART_INTRO_HIGHLIGHTS = ['꾸준한 증가세', '지속적인 증가', '11월 집중 증가'] as const

const CHART_DEEP_INTRO_TEXT =
  '최근 1년간 쿠팡 MAU와 신규 설치 건수 모두 꾸준한 증가세를 보였으며, 향후 3개월간 MAU는 약 8.5% 증가, 신규 설치는 11월 집중 증가가 예측됩니다.'

const CHART_DEEP_INTRO_HIGHLIGHTS = ['꾸준한 증가세', '8.5% 증가', '11월 집중 증가'] as const

const CHART_INDICATOR_PLAIN =
  '쿠팡의 MAU는 2024년 4월 대비 2025년 3월까지 꾸준한 증가세를 보이며, 1년간 257만 가량 증가해 안정적인 사용자 기반을 유지하고 있습니다. 신규 설치 건수는 11월 시점에 집중 증가하는 패턴이 반복되고 있으며, 현재 추이를 바탕으로 향후에도 지속적인 증가가 예측됩니다.'

const CHART_INDICATOR_BODY = (
  <>
    쿠팡의 MAU는 2024년 4월 대비 2025년 3월까지 꾸준한 증가세를 보이며, 1년간{' '}
    <strong>257만 가량 증가</strong>해 안정적인 사용자 기반을 유지하고 있습니다. 신규 설치 건수는{' '}
    <strong>11월 시점</strong>에 집중 증가하는 패턴이 반복되고 있으며, 현재 추이를 바탕으로
    향후에도 <strong>지속적인 증가</strong>가 예측됩니다.
  </>
)

const CHART_CAUSE_PLAIN =
  '쿠팡의 안정적 성장은 로켓배송 기반 락인 효과에서 비롯된 것으로 분석됩니다. 신규 유입보다 기존 사용자의 재방문율이 높아 MAU가 꾸준히 유지되는 구조이며, 이는 경쟁 서비스 대비 높은 사용자 충성도로 이어지고 있습니다.'

const CHART_CAUSE_BODY = (
  <>
    쿠팡의 안정적 성장은 <strong>로켓배송 기반 락인 효과</strong>에서 비롯된 것으로 분석됩니다.
    신규 유입보다 기존 사용자의 재방문율이 높아 MAU가 꾸준히 유지되는 구조이며, 이는 경쟁
    서비스 대비 높은 사용자 충성도로 이어지고 있습니다.
  </>
)

const CHART_DEEP_FORECAST_PLAIN =
  '현재 추이를 바탕으로, 향후 3개월간 MAU는 약 430만 명 수준으로 전월 대비 8.5% 증가할 것으로 예측됩니다. 11월 대규모 할인 행사 시점에 신규 설치 건수가 전월 대비 약 40% 이상 집중 증가할 것으로 예측되며, 단 프로모션 종료 후 이탈률 상승 패턴이 반복되고 있어 지속적인 사용자 유지는 제한적일 것으로 예측됩니다.'

const CHART_DEEP_FORECAST_BODY = (
  <>
    현재 추이를 바탕으로, 향후 3개월간 MAU는 <strong>약 430만 명</strong> 수준으로 전월 대비{' '}
    <strong>8.5% 증가</strong>할 것으로 예측됩니다. <strong>11월 대규모 할인 행사</strong> 시점에
    신규 설치 건수가 전월 대비 <strong>약 40% 이상 집중 증가</strong>할 것으로 예측되며, 단
    프로모션 종료 후 이탈률 상승 패턴이 반복되고 있어 지속적인 사용자 유지는 제한적일 것으로
    예측됩니다.
  </>
)

const CHART_INSIGHT_ITEM1_PLAIN =
  '쿠팡의 락인 구조를 고려하면 신규 사용자 유입보다 기존 사용자 재구매 유도 전략이 더 효과적일 것으로 판단됩니다. 또한 11월 할인 행사 이전 사전 마케팅 예산을 집중 배분하는 전략이 신규 설치 건수 극대화에 유효할 것으로 보입니다.'

const CHART_INSIGHT_ITEM2_PLAIN =
  '경쟁 서비스 공략 시에는 프로모션 종료 직후 이탈 구간을 타겟팅한 리텐션 캠페인이 효과적일 것으로 분석됩니다.'

const UNAVAILABLE_REPLY_TEXT =
  '저는 모바일 데이터 분석 전문 에이전트입니다. 앱 사용 현황, MAU, 신규 설치 등 모바일 데이터와 관련된 질문을 해주세요.\n예시) "쿠팡의 최근 1년간 MAU 추이를 분석해줘"'

const CHART_REPLY_PATTERN =
  /이탈|신규\s*설치|사용자|사용\s*시간|데이터|\bMAU\b|추이|업종|시장|비교|경쟁|분석/i

const TEXT_REPLY_PATTERN =
  /서비스|설명|용어|안내|모바일인덱스|\bINSIGHT\b|상품/i

function classifyReplyKind(question: string): ReplyKind {
  const q = question.replace(/\s+/g, ' ').trim()
  if (CHART_REPLY_PATTERN.test(q)) return 'chart'
  if (TEXT_REPLY_PATTERN.test(q)) return 'text'
  return 'unavailable'
}

type StreamPayload =
  | { kind: 'text'; text: string; mockCategory: TextMockCategory }
  | { kind: 'chart'; intro: string; depth: ChartAnswerDepth; variant: ChartMockVariant }
  | { kind: 'unavailable'; text: string }

function countChartRepliesInThread(thread: ChatLine[]): number {
  return thread.filter(
    (line) => line.role === 'assistant' && line.replyKind === 'chart',
  ).length
}

function chartVariantForThread(thread: ChatLine[]): ChartMockVariant {
  const chartCount = countChartRepliesInThread(thread)
  return chartCount % 2 === 0 ? 'combo' : 'churn'
}

function buildChartPayload(
  variant: ChartMockVariant,
  depth: ChartAnswerDepth,
): Extract<StreamPayload, { kind: 'chart' }> {
  const intro =
    variant === 'churn'
      ? depth === 'deep'
        ? CHART2_DEEP_INTRO_TEXT
        : CHART2_INTRO_TEXT
      : depth === 'deep'
        ? CHART_DEEP_INTRO_TEXT
        : CHART_INTRO_TEXT
  return { kind: 'chart', intro, depth, variant }
}

function buildStreamPayload(question: string, thread: ChatLine[]): StreamPayload {
  const kind = classifyReplyKind(question)
  if (kind === 'unavailable') {
    return { kind: 'unavailable', text: UNAVAILABLE_REPLY_TEXT }
  }
  if (kind === 'chart') {
    const variant = chartVariantForThread(thread)
    return buildChartPayload(variant, 'basic')
  }
  const { text, category } = getTextMockForQuestion(question)
  return { kind: 'text', text, mockCategory: category }
}

function isTypedComplete(typed: string, plain: string): boolean {
  return typed.length >= plain.length
}

function assistantPlainText(line: Extract<ChatLine, { role: 'assistant' }>): string {
  if (line.replyKind === 'chart') {
    const isChurn = line.chartMockVariant === 'churn'
    const cardTitle = isChurn ? CHART2_CARD_TITLE : CHART_CARD_TITLE
    const ind = line.chartIndicatorText ?? ''
    const cause = line.chartCauseText ?? ''
    const fore = line.chartForecastText ?? ''
    const ins1 = line.chartInsight1Text ?? ''
    const ins2 = line.chartInsight2Text ?? ''
    if (!line.chartVisible) return line.content
    if (line.chartDepth === 'deep') {
      return [
        line.content,
        cardTitle,
        `지표 설명: ${ind}`,
        `원인 분석: ${cause}`,
        `향후 예측: ${fore}`,
        `인사이트:\n- ${ins1}\n- ${ins2}`,
      ]
        .join('\n\n')
        .trim()
    }
    return `${line.content}\n\n${cardTitle}\n\n지표 설명: ${ind}`.trim()
  }
  return line.content
}

const MOCK_ANSWER_DATA =
  '쿠팡과 11번가의 최근 1년간 MAU를 분석한 결과, 쿠팡은 월평균 2,300만 명으로 꾸준한 성장세를 보이고 있으며, 11번가는 월평균 890만 명으로 소폭 감소 추세입니다. 특히 2024년 하반기부터 격차가 더욱 벌어지고 있어 주목할 필요가 있습니다.'

const MOCK_ANSWER_INDUSTRY =
  '식품 업종은 현재 배달 앱과 밀키트 서비스의 성장으로 모바일 사용자 수가 전년 대비 18% 증가했습니다. 1위 앱과 2위 앱의 신규 설치 격차는 약 340만 건으로, 1위 앱이 압도적인 시장 지배력을 유지하고 있습니다.'

const MOCK_ANSWER_DEFAULT =
  '모바일인덱스 INSIGHT 상품은 크게 세 가지 로 구분됩니다.\n' +
  '① 소비 인덱스\n' +
  '기업 카드 결제 데이터 기반의 소비 분석 상품입니다. 업종별 소비 트렌드와 고객 구매 패턴을 파악할 수 있습니다.\n' +
  '② 사용량 인덱스\n' +
  '앱 사용량 데이터 기반의 모바일 행동 분석 상품입니다. 앱별 MAU, 사용 시간, 신규 설치 등 주요 지표를 확인할 수 있습니다.\n' +
  '③ Multi Plan\n' +
  '기업 카드 결제와 앱 사용량 데이터를 통합 분석할 수 있는 상품입니다. 소비와 모바일 행동을 연계한 심층 분석이 가능합니다.\n' +
  '상품별 상세 데이터 제공 범위는 상품 안내 페이지에서 비교하실 수 있습니다.'

function selectTextMockCategory(question: string): TextMockCategory {
  const q = question.replace(/\s+/g, ' ').trim()
  if (/(mau|dau|데이터\s*분석|추이)/i.test(q)) return 'data'
  if (/(업종|시장)/i.test(q)) return 'industry'
  return 'default'
}

function getTextMockForQuestion(question: string): {
  text: string
  category: TextMockCategory
} {
  const category = selectTextMockCategory(question)
  const text =
    category === 'data'
      ? MOCK_ANSWER_DATA
      : category === 'industry'
        ? MOCK_ANSWER_INDUSTRY
        : MOCK_ANSWER_DEFAULT
  return { text, category }
}

function highlightTermsForCategory(category: TextMockCategory): readonly string[] {
  switch (category) {
    case 'data':
      return ['2,300만 명', '890만 명', '2024년 하반기']
    case 'industry':
      return ['18%', '340만 건', '1위 앱']
    default:
      return ['모바일인덱스 INSIGHT', 'MAU, DAU, 신규 설치, 사용 시간']
  }
}

const TYPING_INTERVAL_MS = 15

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(t)
      signal.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort)
  })
}

/** 띄어쓰기(공백) 단위로 누적 문자열 단계 생성 */
function wordStreamSlices(full: string): string[] {
  const tokens = full.match(/\S+\s*/g)
  if (!tokens?.length) return full ? [full] : ['']
  let acc = ''
  return tokens.map((token) => {
    acc += token
    return acc
  })
}

async function streamTextByWords(
  full: string,
  signal: AbortSignal,
  applySlice: (slice: string) => void,
): Promise<void> {
  const slices = wordStreamSlices(full)
  for (let i = 0; i < slices.length; i++) {
    if (signal.aborted) return
    applySlice(slices[i]!)
    if (i < slices.length - 1) {
      await sleep(TYPING_INTERVAL_MS, signal)
    }
  }
}

function splitAnswerWithKeywords(
  text: string,
  highlights: readonly string[],
): ReactNode[] {
  const terms = highlights.filter(Boolean)
  const out: ReactNode[] = []
  let cursor = 0
  let key = 0
  while (cursor < text.length) {
    let bestIdx = Infinity
    let bestTerm = ''
    for (const t of terms) {
      const j = text.indexOf(t, cursor)
      if (j !== -1 && j < bestIdx) {
        bestIdx = j
        bestTerm = t
      }
    }
    if (!bestTerm) {
      out.push(text.slice(cursor))
      break
    }
    if (bestIdx > cursor) {
      out.push(text.slice(cursor, bestIdx))
    }
    out.push(
      <span key={`kw-${key++}`} className={styles.keywordBadge}>
        {bestTerm}
      </span>,
    )
    cursor = bestIdx + bestTerm.length
  }
  return out
}

type ChartPanelView = 'chart' | 'table'
type ChartTableTab = 'apps' | 'cohort'

function ChartTableTabToggle({
  tab,
  onTabChange,
}: {
  tab: ChartTableTab
  onTabChange: (next: ChartTableTab) => void
}) {
  return (
    <div className={styles.chartTableTabBar} role="tablist" aria-label="표 보기 탭">
      <button
        type="button"
        role="tab"
        id="chart-table-tab-apps"
        aria-selected={tab === 'apps'}
        aria-controls="chart-table-panel-apps"
        className={tab === 'apps' ? styles.chartTableTabActive : styles.chartTableTab}
        onClick={() => onTabChange('apps')}
      >
        이탈 앱 분포
      </button>
      <button
        type="button"
        role="tab"
        id="chart-table-tab-cohort"
        aria-selected={tab === 'cohort'}
        aria-controls="chart-table-panel-cohort"
        className={tab === 'cohort' ? styles.chartTableTabActive : styles.chartTableTab}
        onClick={() => onTabChange('cohort')}
      >
        이탈자 분석
      </button>
    </div>
  )
}

function ChartViewToggle({
  view,
  onViewChange,
}: {
  view: ChartPanelView
  onViewChange: (next: ChartPanelView) => void
}) {
  return (
    <div className={styles.chartToggleTrack} role="group" aria-label="차트 보기 형식">
      <span
        className={`${styles.chartToggleSlider} ${
          view === 'table' ? styles.chartToggleSliderTable : ''
        }`}
        aria-hidden
      />
      <button
        type="button"
        className={styles.chartTogglePill}
        aria-pressed={view === 'chart'}
        aria-label="차트"
        onClick={() => onViewChange('chart')}
      >
        <span className={styles.chartToggleIconShell}>
          <span
            className={`${styles.chartToggleGlyph} ${styles.chartToggleGlyphChart} ${
              view === 'chart' ? styles.chartToggleGlyphOn : styles.chartToggleGlyphOff
            }`}
            aria-hidden
          />
        </span>
      </button>
      <button
        type="button"
        className={styles.chartTogglePill}
        aria-pressed={view === 'table'}
        aria-label="표"
        onClick={() => onViewChange('table')}
      >
        <span className={styles.chartToggleIconShell}>
          <span
            className={`${styles.chartToggleGlyph} ${styles.chartToggleGlyphTable} ${
              view === 'table' ? styles.chartToggleGlyphOn : styles.chartToggleGlyphOff
            }`}
            aria-hidden
          />
        </span>
      </button>
    </div>
  )
}

function ChartPanelBody({
  view,
  variant,
}: {
  view: ChartPanelView
  variant: 'card' | 'expanded'
}) {
  const expanded = variant === 'expanded'
  const mainBlockClass = expanded ? styles.chartExpandMainBlock : styles.chartMainBlock

  if (view === 'chart') {
    if (expanded) {
      return (
        <div className={styles.chartExpandViewStack}>
          <div className={styles.chartExpandSvgWrap}>
            <MockComboRechartsChart
              className={styles.chartExpandSvgFill}
              labels={CHART_MONTH_LABELS}
              barValues={CHART_BAR_SERIES}
              lineValues={CHART_LINE_SERIES}
            />
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.chartLegendItem}>
              <span
                className={`${styles.chartLegendDot} ${styles.chartLegendDotLine}`}
                aria-hidden
              />
              사용자 수 (MAU)
            </span>
            <span className={styles.chartLegendItem}>
              <span
                className={`${styles.chartLegendDot} ${styles.chartLegendDotBar}`}
                aria-hidden
              />
              신규 설치 건 수
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className={mainBlockClass}>
        <div className={styles.chartViewStack}>
          <div className={styles.chartSvgWrap}>
            <MockComboRechartsChart
              className={styles.chartSvgFill}
              labels={CHART_MONTH_LABELS}
              barValues={CHART_BAR_SERIES}
              lineValues={CHART_LINE_SERIES}
            />
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.chartLegendItem}>
              <span
                className={`${styles.chartLegendDot} ${styles.chartLegendDotLine}`}
                aria-hidden
              />
              사용자 수 (MAU)
            </span>
            <span className={styles.chartLegendItem}>
              <span
                className={`${styles.chartLegendDot} ${styles.chartLegendDotBar}`}
                aria-hidden
              />
              신규 설치 건 수
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={mainBlockClass}>
      <div className={expanded ? styles.chartExpandTableWrap : styles.chartTableWrap}>
        <table className={styles.chartTable}>
          <thead>
            <tr>
              <th className={styles.chartTh}>날짜</th>
              <th className={styles.chartTh}>월간 사용자 수 (MAU)</th>
              <th className={styles.chartTh}>신규 설치 건 수</th>
            </tr>
          </thead>
          <tbody>
            {CHART_MONTH_LABELS.map((m, i) => (
              <tr key={m}>
                <td className={styles.chartTd}>{m}</td>
                <td className={styles.chartTd}>
                  {CHART_LINE_SERIES[i]?.toLocaleString('ko-KR')}명
                </td>
                <td className={styles.chartTd}>
                  {CHART_BAR_SERIES[i]?.toLocaleString('ko-KR')}건
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ChartPanelBody2({
  view,
  tableTab,
  variant,
}: {
  view: ChartPanelView
  tableTab: ChartTableTab
  variant: 'card' | 'expanded'
}) {
  const expanded = variant === 'expanded'
  const mainBlockClass = expanded ? styles.chartExpandMainBlock : styles.chartMainBlock
  const tableWrapClass = expanded ? styles.chartExpandTableWrap : styles.chartTableWrap
  const chartTotalHeight = expanded ? 400 : MOCK_CHART_VARIANT2_TOTAL_HEIGHT

  if (view === 'chart') {
    return (
      <div className={mainBlockClass}>
        <div className={styles.chartSvgWrap} style={{ height: chartTotalHeight }}>
          <MockChartVariant2 height={chartTotalHeight} />
        </div>
      </div>
    )
  }

  const tablePanelId =
    tableTab === 'apps' ? 'chart-table-panel-apps' : 'chart-table-panel-cohort'

  return (
    <div
      id={tablePanelId}
      role="tabpanel"
      aria-labelledby={
        tableTab === 'apps' ? 'chart-table-tab-apps' : 'chart-table-tab-cohort'
      }
      className={tableWrapClass}
    >
      {tableTab === 'apps' ? (
        <table className={styles.chartTable}>
          <thead>
            <tr>
              <th className={styles.chartTh}>이동 앱</th>
              <th className={styles.chartTh}>이탈 비율</th>
            </tr>
          </thead>
          <tbody>
            {CHART2_APP_TABLE_ROWS.map((row) => (
              <tr key={row.app}>
                <td className={styles.chartTd}>{row.app}</td>
                <td className={styles.chartTd}>{row.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className={styles.chartTable}>
          <thead>
            <tr>
              <th className={styles.chartTh}>연령대</th>
              <th className={styles.chartTh}>남성 이탈 비율</th>
              <th className={styles.chartTh}>여성 이탈 비율</th>
              <th className={styles.chartTh}>주요 이동 앱</th>
            </tr>
          </thead>
          <tbody>
            {CHART2_COHORT_TABLE_ROWS.map((row) => (
              <tr key={row.age}>
                <td className={styles.chartTd}>{row.age}</td>
                <td className={styles.chartTd}>{row.male}</td>
                <td className={styles.chartTd}>{row.female}</td>
                <td className={styles.chartTd}>{row.topApp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ChartV1TitleSection({ titleId }: { titleId?: string }) {
  return (
    <div className={styles.chartCardTitleBlock}>
      <div className={styles.chartCardTitleWrap}>
        <img
          src={imgAppicon}
          alt=""
          width={20}
          height={20}
          className={styles.chartCardAppIcon}
        />
        <h3 id={titleId} className={styles.chartCardTitle}>
          {CHART_CARD_TITLE}
        </h3>
      </div>
      <p className={styles.chartCardSubtitle}>{CHART_CARD_SUBTITLE}</p>
    </div>
  )
}

function ChartV2TitleSection({ titleId }: { titleId?: string }) {
  return (
    <div className={styles.chartCardTitleBlock}>
      <div className={styles.chartCardTitleWrap}>
        <img
          src={imgAppicon2}
          alt=""
          width={20}
          height={20}
          className={styles.chartCardAppIcon}
        />
        <h3 id={titleId} className={styles.chartCardTitle}>
          {CHART2_CARD_TITLE}
        </h3>
      </div>
      <p className={styles.chartCardSubtitle}>{CHART2_CARD_SUBTITLE}</p>
    </div>
  )
}

function ChartMockCard({
  onImageSave,
  onExcelDownload,
  onExpand,
}: {
  onImageSave?: () => void
  onExcelDownload?: () => void
  onExpand?: (currentView: ChartPanelView) => void
}) {
  const [view, setView] = useState<ChartPanelView>('chart')
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartCardUpper}>
        <div className={styles.chartCardHeader}>
          <ChartV1TitleSection />
          <ChartViewToggle view={view} onViewChange={setView} />
        </div>
        <ChartPanelBody view={view} variant="card" />
      </div>
      <div className={styles.chartCardFooter}>
        <button type="button" className={styles.chartFooterAction} onClick={onImageSave}>
          <img src={icoDownload} alt="" className={styles.chartFooterIcon} />
          <span>이미지 저장</span>
        </button>
        <span className={styles.chartFooterDivider} aria-hidden />
        <button type="button" className={styles.chartFooterAction} onClick={onExcelDownload}>
          <img src={icoExcel} alt="" className={styles.chartFooterIcon} />
          <span>엑셀 다운로드</span>
        </button>
        <span className={styles.chartFooterDivider} aria-hidden />
        <button
          type="button"
          className={styles.chartFooterAction}
          onClick={() => onExpand?.(view)}
        >
          <img src={icoExpand} alt="" className={styles.chartFooterIcon} />
          <span>확장 보기</span>
        </button>
      </div>
    </div>
  )
}

function ChartMockCard2({
  onImageSave,
  onExcelDownload,
  onExpand,
}: {
  onImageSave?: () => void
  onExcelDownload?: () => void
  onExpand?: (currentView: ChartPanelView, tableTab: ChartTableTab) => void
}) {
  const [view, setView] = useState<ChartPanelView>('chart')
  const [tableTab, setTableTab] = useState<ChartTableTab>('apps')

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartCardUpper}>
        <div className={styles.chartCardHeader}>
          <ChartV2TitleSection />
          <ChartViewToggle view={view} onViewChange={setView} />
        </div>
        {view === 'chart' ? (
          <ChartPanelBody2 view="chart" tableTab={tableTab} variant="card" />
        ) : (
          <div className={`${styles.chartMainBlock} ${styles.chartMainBlockTable}`}>
            <ChartTableTabToggle tab={tableTab} onTabChange={setTableTab} />
            <ChartPanelBody2 view="table" tableTab={tableTab} variant="card" />
          </div>
        )}
      </div>
      <div className={styles.chartCardFooter}>
        <button type="button" className={styles.chartFooterAction} onClick={onImageSave}>
          <img src={icoDownload} alt="" className={styles.chartFooterIcon} />
          <span>이미지 저장</span>
        </button>
        <span className={styles.chartFooterDivider} aria-hidden />
        <button type="button" className={styles.chartFooterAction} onClick={onExcelDownload}>
          <img src={icoExcel} alt="" className={styles.chartFooterIcon} />
          <span>엑셀 다운로드</span>
        </button>
        <span className={styles.chartFooterDivider} aria-hidden />
        <button
          type="button"
          className={styles.chartFooterAction}
          onClick={() => onExpand?.(view, tableTab)}
        >
          <img src={icoExpand} alt="" className={styles.chartFooterIcon} />
          <span>확장 보기</span>
        </button>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [openMenu, setOpenMenu] = useState<'bookmark' | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [loadingVariant, setLoadingVariant] = useState<'basic' | 'complex'>('basic')
  const [deepDiveLoading, setDeepDiveLoading] = useState(false)
  const [thread, setThread] = useState<ChatLine[]>([])
  const [favoriteQuestions, setFavoriteQuestions] = useState<string[]>(() => [
    ...INITIAL_FAVORITE_QUESTIONS,
  ])
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false)
  const streamAbortRef = useRef<AbortController | null>(null)
  const threadRef = useRef<ChatLine[]>([])

  /** 답변 피드백 — line.id 기준 */
  type FeedbackPhase = 'liked' | 'disliked'
  const [feedbackByLine, setFeedbackByLine] = useState<Record<string, FeedbackPhase>>({})
  const [deepDiveUsedByLine, setDeepDiveUsedByLine] = useState<Record<string, boolean>>({})
  const [feedbackModalLineId, setFeedbackModalLineId] = useState<string | null>(null)
  const [feedbackReasons, setFeedbackReasons] = useState<Record<string, boolean>>({})
  const [feedbackComment, setFeedbackComment] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isChartExpanded, setIsChartExpanded] = useState(false)
  const [expandedChartView, setExpandedChartView] = useState<ChartPanelView>('chart')
  const [expandedChartVariant, setExpandedChartVariant] = useState<ChartMockVariant>('combo')
  const [expandedTableTab, setExpandedTableTab] = useState<ChartTableTab>('apps')
  const [modalPortalEl, setModalPortalEl] = useState<HTMLDivElement | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const downloadTimerRef = useRef<number | null>(null)

  const handleModalPortalRef = useCallback((node: HTMLDivElement | null) => {
    setModalPortalEl(node)
  }, [])

  const resolveModalPortal = useCallback((): HTMLElement => {
    return (
      modalPortalEl ??
      document.getElementById(APP_MODAL_ROOT_ID) ??
      document.body
    )
  }, [modalPortalEl])

  const showFeedbackToast = useCallback((msg: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToastMessage(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 3200)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      if (downloadTimerRef.current) window.clearTimeout(downloadTimerRef.current)
    }
  }, [])

  const runDownloadAction = useCallback(
    (toastText: string) => {
      if (downloadTimerRef.current) window.clearTimeout(downloadTimerRef.current)
      setIsDownloading(true)
      downloadTimerRef.current = window.setTimeout(() => {
        setIsDownloading(false)
        downloadTimerRef.current = null
        showFeedbackToast(toastText)
      }, 2000)
    },
    [showFeedbackToast],
  )

  const handleChartImageSave = useCallback(() => {
    runDownloadAction('차트 이미지가 저장되었습니다.')
  }, [runDownloadAction])

  const handleChartExcelDownload = useCallback(() => {
    runDownloadAction('엑셀 파일이 다운로드되었습니다.')
  }, [runDownloadAction])

  const handleChartExpandImageSave = useCallback(() => {
    runDownloadAction('차트 이미지가 저장되었습니다.')
  }, [runDownloadAction])

  const handleChartExpandExcelDownload = useCallback(() => {
    runDownloadAction('엑셀 파일이 다운로드되었습니다.')
  }, [runDownloadAction])

  const openChartExpand = useCallback(
    (
      currentView: ChartPanelView,
      variant: ChartMockVariant = 'combo',
      tableTab: ChartTableTab = 'apps',
    ) => {
      setExpandedChartView(currentView)
      setExpandedChartVariant(variant)
      setExpandedTableTab(tableTab)
      const portalRoot = document.getElementById(APP_MODAL_ROOT_ID)
      if (portalRoot instanceof HTMLDivElement) {
        setModalPortalEl(portalRoot)
      }
      setIsChartExpanded(true)
    },
    [],
  )

  const closeChartExpand = useCallback(() => {
    setIsChartExpanded(false)
  }, [])

  useEffect(() => {
    if (!isChartExpanded) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeChartExpand()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isChartExpanded, closeChartExpand])

  const handleLikeFeedback = useCallback(
    (lineId: string) => {
      setFeedbackByLine((prev) => ({ ...prev, [lineId]: 'liked' }))
      showFeedbackToast('피드백 감사합니다. 소중한 의견이 반영되었습니다.')
    },
    [showFeedbackToast],
  )

  const handleDislikeFeedback = useCallback((lineId: string) => {
    setFeedbackReasons({})
    setFeedbackComment('')
    setFeedbackModalLineId(lineId)
  }, [])

  const closeFeedbackModal = useCallback(() => {
    setFeedbackModalLineId(null)
  }, [])

  const submitFeedbackModal = useCallback(() => {
    if (!feedbackModalLineId) return
    if (!Object.values(feedbackReasons).some(Boolean)) return
    setFeedbackByLine((prev) => ({ ...prev, [feedbackModalLineId]: 'disliked' }))
    setFeedbackModalLineId(null)
    showFeedbackToast('소중한 의견 감사합니다. 더 나은 답변을 위해 반영하겠습니다.')
  }, [feedbackModalLineId, feedbackReasons, showFeedbackToast])

  const hasConversation = thread.length > 0
  const sendDisabled = message.trim().length === 0 || isSending
  const showChatHeader = hasConversation
  const headerQuestionText =
    thread.find((l): l is Extract<ChatLine, { role: 'user' }> => l.role === 'user')
      ?.content ?? ''

  const recommendedQuestions = RECOMMENDED_QUESTIONS_BY_TAB[activeTab]

  const userQuestionIndexByLineId = useMemo(() => {
    const m = new Map<string, number>()
    let u = 0
    for (const line of thread) {
      if (line.role === 'user') m.set(line.id, u++)
    }
    return m
  }, [thread])

  const threadPanelGroups = MOCK_THREAD_PANEL_GROUPS

  const scrollToQuestion = useCallback(
    (lineId: string) => {
      const qIndex = userQuestionIndexByLineId.get(lineId)
      if (qIndex === undefined) return
      document.getElementById(`question-${qIndex}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    },
    [userQuestionIndexByLineId],
  )

  function newId() {
    return crypto.randomUUID()
  }

  function handleResetToHome() {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setIsSending(false)
    setLoadingVariant('basic')
    setDeepDiveLoading(false)
    setOpenMenu(null)
    setThread([])
    setMessage('')
    setIsThreadPanelOpen(false)
    setFeedbackByLine({})
    setDeepDiveUsedByLine({})
    setFeedbackModalLineId(null)
    setFeedbackReasons({})
    setFeedbackComment('')
    setToastMessage(null)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }

  function applyQuestionToComposer(text: string) {
    setMessage(text)
    queueMicrotask(() => {
      textareaRef.current?.focus()
      const len = text.length
      textareaRef.current?.setSelectionRange(len, len)
    })
  }

  function removeFavoriteQuestion(text: string) {
    setFavoriteQuestions((prev) => prev.filter((q) => q !== text))
  }

  function toggleFavoriteForQuestion(text: string) {
    setFavoriteQuestions((prev) =>
      prev.includes(text) ? prev.filter((q) => q !== text) : [...prev, text],
    )
  }

  async function runMockAssistantStream(
    payload: StreamPayload,
    options?: { deepDiveLoading?: boolean },
  ) {
    streamAbortRef.current?.abort()
    const ac = new AbortController()
    streamAbortRef.current = ac
    setIsSending(true)
    setLoadingVariant('basic')
    setDeepDiveLoading(Boolean(options?.deepDiveLoading))
    const isDeepChart = payload.kind === 'chart' && payload.depth === 'deep'
    try {
      if (isDeepChart) {
        await sleep(7000, ac.signal)
        setLoadingVariant('complex')
        await sleep(5000, ac.signal)
      } else {
        await sleep(2000 + Math.random() * 1000, ac.signal)
      }
      setThread((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, showScrollPadding: false }
        }
        return next
      })
      if (payload.kind === 'unavailable') {
        const full = payload.text
        await streamTextByWords(full, ac.signal, (slice) => {
          setThread((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                content: slice,
                replyKind: 'unavailable',
              }
            }
            return next
          })
        })
      } else if (payload.kind === 'chart') {
        const intro = payload.intro
        const isDeep = payload.depth === 'deep'
        const isChurn = payload.variant === 'churn'
        const indicatorPlain = isChurn ? CHART2_INDICATOR_PLAIN : CHART_INDICATOR_PLAIN
        const causePlain = isChurn ? CHART2_CAUSE_PLAIN : CHART_CAUSE_PLAIN
        const forecastPlain = isChurn ? CHART2_FORECAST_PLAIN : CHART_DEEP_FORECAST_PLAIN
        const insight1Plain = isChurn ? CHART2_INSIGHT1_PLAIN : CHART_INSIGHT_ITEM1_PLAIN
        const insight2Plain = isChurn ? CHART2_INSIGHT2_PLAIN : CHART_INSIGHT_ITEM2_PLAIN
        await streamTextByWords(intro, ac.signal, (slice) => {
          const introDone = slice.length >= intro.length
          setThread((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                content: slice,
                replyKind: 'chart',
                chartDepth: payload.depth,
                chartMockVariant: payload.variant,
                chartVisible: introDone,
                chartSectionsReady: false,
                chartIndicatorText: '',
                chartCauseText: '',
                chartForecastText: '',
                chartInsight1Text: '',
                chartInsight2Text: '',
              }
            }
            return next
          })
        })
        await sleep(CHART_COMBO_ANIMATION_MS + 500, ac.signal)
        if (ac.signal.aborted) return
        setThread((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, chartSectionsReady: true }
          }
          return next
        })
        await streamTextByWords(indicatorPlain, ac.signal, (slice) => {
          setThread((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'assistant') {
              next[next.length - 1] = { ...last, chartIndicatorText: slice }
            }
            return next
          })
        })
        if (isDeep) {
          await streamTextByWords(causePlain, ac.signal, (slice) => {
            setThread((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, chartCauseText: slice }
              }
              return next
            })
          })
          await streamTextByWords(forecastPlain, ac.signal, (slice) => {
            setThread((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, chartForecastText: slice }
              }
              return next
            })
          })
          await streamTextByWords(insight1Plain, ac.signal, (slice) => {
            setThread((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, chartInsight1Text: slice }
              }
              return next
            })
          })
          await streamTextByWords(insight2Plain, ac.signal, (slice) => {
            setThread((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, chartInsight2Text: slice }
              }
              return next
            })
          })
        }
      } else {
        await streamTextByWords(payload.text, ac.signal, (slice) => {
          setThread((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                content: slice,
                replyKind: 'text',
                mockCategory: payload.mockCategory,
              }
            }
            return next
          })
        })
      }
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    } finally {
      setIsSending(false)
      setLoadingVariant('basic')
      setDeepDiveLoading(false)
      streamAbortRef.current = null
    }
  }

  async function handleSendQuestion(
    override?: string,
    options?: { questionDepth?: QuestionDepth },
  ) {
    const question = (override ?? message).trim()
    if (!question || isSending) return

    setOpenMenu(null)
    setMessage('')

    const questionDepth = options?.questionDepth ?? 1
    const payload = buildStreamPayload(question, thread)
    const userLine: ChatLine = {
      id: newId(),
      role: 'user',
      content: question,
      questionDepth,
    }
    const asstLine: ChatLine = {
      id: newId(),
      role: 'assistant',
      content: '',
      showScrollPadding: true,
      replyKind:
        payload.kind === 'chart'
          ? 'chart'
          : payload.kind === 'text'
            ? 'text'
            : 'unavailable',
      ...(payload.kind === 'chart'
        ? { chartDepth: payload.depth, chartMockVariant: payload.variant }
        : {}),
      ...(payload.kind === 'text' ? { mockCategory: payload.mockCategory } : {}),
    }

    flushSync(() => {
      setThread((prev) => [...prev, userLine])
    })

    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const targetEl = document.querySelector(
      `[data-line-id="${userLine.id}"]`,
    ) as HTMLElement | null
    const container = document.querySelector(
      '[class*="chat-scroll-container"]',
    ) as HTMLElement | null

    if (targetEl && container) {
      const scrollTarget = Math.max(
        0,
        targetEl.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop,
      )
      setThread((prev) => [...prev, asstLine])
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.scrollTop = scrollTarget
        })
      })
    } else {
      setThread((prev) => [...prev, asstLine])
    }

    await runMockAssistantStream(payload)
  }

  async function handleCopyAnswer(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  async function handleDeepChartAnalysis(assistantLineId: string) {
    if (isSending || deepDiveUsedByLine[assistantLineId]) return
    const prev = threadRef.current
    const assistantIndex = prev.findIndex((l) => l.id === assistantLineId)
    if (assistantIndex < 1) return
    const userLine = prev[assistantIndex - 1]
    const assistantLine = prev[assistantIndex]
    if (
      userLine.role !== 'user' ||
      assistantLine.role !== 'assistant' ||
      assistantLine.replyKind !== 'chart' ||
      assistantLine.chartDepth === 'deep'
    ) {
      return
    }

    const variant = assistantLine.chartMockVariant ?? 'combo'
    const deepQuestion = `${userLine.content} (심층 분석)`
    const payload = buildChartPayload(variant, 'deep')

    setDeepDiveUsedByLine((used) => ({ ...used, [assistantLineId]: true }))

    const userLineNew: ChatLine = {
      id: newId(),
      role: 'user',
      content: deepQuestion,
      questionDepth: userLine.questionDepth,
    }
    const asstLine: ChatLine = {
      id: newId(),
      role: 'assistant',
      content: '',
      showScrollPadding: true,
      replyKind: 'chart',
      chartDepth: 'deep',
      chartMockVariant: variant,
    }

    flushSync(() => {
      setThread((threadPrev) => [...threadPrev, userLineNew])
    })

    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const targetEl = document.querySelector(
      `[data-line-id="${userLineNew.id}"]`,
    ) as HTMLElement | null
    const container = document.querySelector(
      '[class*="chat-scroll-container"]',
    ) as HTMLElement | null

    if (targetEl && container) {
      const scrollTarget = Math.max(
        0,
        targetEl.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop,
      )
      setThread((threadPrev) => [...threadPrev, asstLine])
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.scrollTop = scrollTarget
        })
      })
    } else {
      setThread((threadPrev) => [...threadPrev, asstLine])
    }

    await runMockAssistantStream(payload, { deepDiveLoading: true })
  }

  async function handleRegenerateLast() {
    if (isSending) return
    const prev = threadRef.current
    if (prev.length < 2) return
    const last = prev[prev.length - 1]
    if (last.role !== 'assistant') return
    const prevUser = prev[prev.length - 2]
    if (prevUser.role !== 'user') return
    let payload = buildStreamPayload(prevUser.content, prev.slice(0, -1))
    if (payload.kind === 'chart' && last.chartDepth === 'deep') {
      payload = buildChartPayload(last.chartMockVariant ?? payload.variant, 'deep')
    }
    const next: ChatLine[] = [
      ...prev.slice(0, -1),
      {
        ...last,
        content: '',
        replyKind:
          payload.kind === 'chart'
            ? 'chart'
            : payload.kind === 'text'
              ? 'text'
              : 'unavailable',
        chartVisible: false,
        chartSectionsReady: false,
        chartIndicatorText: undefined,
        chartCauseText: undefined,
        chartForecastText: undefined,
        chartInsight1Text: undefined,
        chartInsight2Text: undefined,
        ...(payload.kind === 'chart'
          ? { chartDepth: payload.depth, chartMockVariant: payload.variant }
          : {}),
        ...(payload.kind === 'text' ? { mockCategory: payload.mockCategory } : {}),
      },
    ]
    setThread(next)
    await runMockAssistantStream(payload)
  }

  useEffect(() => {
    threadRef.current = thread
  }, [thread])

  const updateScrollDownVisible = useCallback(() => {
    const container = chatScrollRef.current
    if (!container) {
      setShowScrollDownBtn(false)
      return
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollDownBtn(distanceFromBottom > CHAT_SCROLL_BOTTOM_THRESHOLD)
  }, [])

  const scrollChatToBottom = useCallback(() => {
    const container = chatScrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [])

  useEffect(() => {
    const container = chatScrollRef.current
    if (!container || thread.length === 0) {
      setShowScrollDownBtn(false)
      return
    }
    updateScrollDownVisible()
    container.addEventListener('scroll', updateScrollDownVisible, { passive: true })
    const resizeObserver = new ResizeObserver(updateScrollDownVisible)
    resizeObserver.observe(container)
    return () => {
      container.removeEventListener('scroll', updateScrollDownVisible)
      resizeObserver.disconnect()
    }
  }, [thread.length, updateScrollDownVisible])

  useEffect(() => {
    if (!isSending) return
    const container = chatScrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [thread, isSending])

  useEffect(() => {
    if (openMenu === null) return
    function handlePointerDown(ev: PointerEvent) {
      const el = composerRef.current
      if (el && !el.contains(ev.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [openMenu])

  useEffect(() => {
    if (openMenu === 'bookmark' && favoriteQuestions.length === 0) {
      setOpenMenu(null)
    }
  }, [favoriteQuestions.length, openMenu])

  useEffect(() => {
    if (thread.length > 0 || isSending) return
    const frame = requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [thread.length, isSending])

  useEffect(
    () => () => {
      streamAbortRef.current?.abort()
    },
    [],
  )

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key !== 'Enter') return
    if (e.shiftKey) return
    e.preventDefault()
    if (isSending || !message.trim()) return
    void handleSendQuestion()
  }

  const composerPlaceholder = isSending
    ? '답변을 생성하고 있습니다'
    : hasConversation
      ? '관련해서 질문하기'
      : 'MI AI Agent에게 무엇이든 물어보세요.'

  return (
    <Layout
      modalPortalRef={handleModalPortalRef}
      onResetToHome={handleResetToHome}
      onShowToast={showFeedbackToast}
      currentThreadTitle={headerQuestionText}
    >
      <div className={styles.chatMainColumn}>
        <div className={styles.chatMainPadded}>
              {showChatHeader ? (
                <header className={styles.chatHeader}>
                  <h2 className={styles.chatHeaderTitle}>{headerQuestionText}</h2>
                  <button
                    type="button"
                    className={styles.chatFlowBtn}
                    aria-expanded={isThreadPanelOpen}
                    aria-label={
                      isThreadPanelOpen ? '질문 흐름 닫기' : '질문 흐름 보기'
                    }
                    onClick={() => setIsThreadPanelOpen((open) => !open)}
                  >
                    <span className={styles.chatFlowBtnText}>
                      {isThreadPanelOpen ? '질문 흐름 닫기' : '질문 흐름 보기'}
                    </span>
                    <img
                      src={isThreadPanelOpen ? icoClose : icoOpen}
                      alt=""
                      width={20}
                      height={20}
                      className={styles.chatFlowBtnIcon}
                    />
                  </button>
                </header>
              ) : null}
              <div className={styles.contentInner}>
            {hasConversation ? (
              <div ref={chatScrollRef} className={styles['chat-scroll-container']}>
                <div
                  className={`${styles.mainContent} ${styles.mainContentChat} ${styles.chatStage}`}
                >
              {thread.map((line, index) => {
                if (line.role === 'user') {
                  const starred = favoriteQuestions.includes(line.content)
                  const qIndex = userQuestionIndexByLineId.get(line.id)!
                  return (
                    <div
                      key={line.id}
                      id={`question-${qIndex}`}
                      data-line-id={line.id}
                      className={styles.questionBubbleWrap}
                      style={{ overflowAnchor: 'auto' }}
                    >
                      <div className={styles.questionBubbleRow}>
                        <TooltipWrap
                          label={
                            starred
                              ? '즐겨찾는 질문 해제'
                              : '즐겨찾는 질문에 추가'
                          }
                        >
                          <button
                            type="button"
                            className={styles.questionStarBtn}
                            aria-label={
                              starred
                                ? '즐겨찾는 질문 해제'
                                : '즐겨찾는 질문에 추가'
                            }
                            aria-pressed={starred}
                            onClick={() => toggleFavoriteForQuestion(line.content)}
                          >
                            <span className={styles.questionStarInner}>
                              <img
                                src={icoBookmarkBorder}
                                alt=""
                                width={20}
                                height={20}
                                className={styles.questionStarImgBorder}
                              />
                              <img
                                src={icoBookmarkFilled}
                                alt=""
                                width={20}
                                height={20}
                                className={styles.questionStarImgFilled}
                              />
                            </span>
                          </button>
                        </TooltipWrap>
                        <div className={styles.questionBubble}>
                          <p className={styles.questionText}>{line.content}</p>
                        </div>
                      </div>
                    </div>
                  )
                }

                const isLast = index === thread.length - 1
                const showLoader = isLast && isSending && !line.content
                if (showLoader) {
                  return (
                    <Fragment key={line.id}>
                      <div
                        className={styles.loadingBlock}
                        data-variant={loadingVariant}
                      >
                        <div className={styles.loadingLogoRow}>
                          <img
                            src={icoSymbol}
                            alt=""
                            width={30}
                            height={30}
                            className={styles.loadingAgentIcon}
                          />
                          <span className={styles.loadingAgentTitle}>MI AI Agent</span>
                        </div>
                        <div className={styles.loadingAnswerCol}>
                          <p className={styles.loadingGradientText}>
                            {loadingVariant === 'complex'
                              ? '데이터를 분석하고 인사이트를 생성하고 있습니다'
                              : deepDiveLoading
                                ? '심층 분석을 시작합니다'
                                : '답변을 생성하고 있습니다'}
                            <span className={styles.loadingDots} aria-hidden>
                              <span>.</span>
                              <span>.</span>
                              <span>.</span>
                            </span>
                          </p>
                          <div className={styles.loadingSkeletonCol} aria-hidden>
                            <div className={styles.loadingSkeletonBar} />
                            <div className={styles.loadingSkeletonBar} />
                            <div
                              className={`${styles.loadingSkeletonBar} ${styles.loadingSkeletonBarShort}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ height: '200px', flexShrink: 0 }} />
                    </Fragment>
                  )
                }

                const assistantLine = line as Extract<ChatLine, { role: 'assistant' }>
                const textCategory = assistantLine.mockCategory
                const showTextRich =
                  assistantLine.replyKind === 'text' &&
                  Boolean(textCategory) &&
                  assistantLine.content &&
                  (!isLast || !isSending)

                const showChartCard =
                  assistantLine.replyKind === 'chart' && Boolean(assistantLine.chartVisible)

                const chartSectionsReady = Boolean(assistantLine.chartSectionsReady)

                const chartMockVariant = assistantLine.chartMockVariant ?? 'combo'
                const isChurnChart = chartMockVariant === 'churn'
                const isDeepChart = assistantLine.chartDepth === 'deep'
                const chartInd = assistantLine.chartIndicatorText ?? ''
                const chartCause = assistantLine.chartCauseText ?? ''
                const chartFore = assistantLine.chartForecastText ?? ''
                const chartIns1 = assistantLine.chartInsight1Text ?? ''
                const chartIns2 = assistantLine.chartInsight2Text ?? ''
                const chartIndicatorPlain = isChurnChart
                  ? CHART2_INDICATOR_PLAIN
                  : CHART_INDICATOR_PLAIN
                const chartCausePlain = isChurnChart ? CHART2_CAUSE_PLAIN : CHART_CAUSE_PLAIN
                const chartForecastPlain = isChurnChart
                  ? CHART2_FORECAST_PLAIN
                  : CHART_DEEP_FORECAST_PLAIN
                const chartInsight1Plain = isChurnChart
                  ? CHART2_INSIGHT1_PLAIN
                  : CHART_INSIGHT_ITEM1_PLAIN
                const chartInsight2Plain = isChurnChart
                  ? CHART2_INSIGHT2_PLAIN
                  : CHART_INSIGHT_ITEM2_PLAIN
                const chartIndComplete = isTypedComplete(chartInd, chartIndicatorPlain)
                const chartCauseComplete = isTypedComplete(chartCause, chartCausePlain)
                const chartForeComplete = isTypedComplete(chartFore, chartForecastPlain)
                const chartIns1Complete = isTypedComplete(chartIns1, chartInsight1Plain)
                const chartIns2Complete = isTypedComplete(chartIns2, chartInsight2Plain)
                const chartReplyComplete =
                  assistantLine.replyKind !== 'chart' ||
                  (Boolean(assistantLine.chartVisible) &&
                    chartSectionsReady &&
                    chartIndComplete &&
                    (isDeepChart
                      ? chartCauseComplete &&
                        chartForeComplete &&
                        chartIns1Complete &&
                        chartIns2Complete
                      : true) &&
                    !(isLast && isSending))

                const showAnswerFooter =
                  Boolean(line.content) && !(isLast && isSending) && chartReplyComplete

                const showBasicChartDeepDive =
                  assistantLine.replyKind === 'chart' &&
                  (assistantLine.chartDepth ?? 'basic') === 'basic'
                const isUnavailableReply = assistantLine.replyKind === 'unavailable'
                const feedbackPhase = feedbackByLine[line.id]
                const liked = feedbackPhase === 'liked'
                const disliked = feedbackPhase === 'disliked'

                return (
                  <article key={line.id} className={styles.answerArticle}>
                    <div className={styles.answerHeaderRow}>
                      <div className={styles.answerHeaderIdentity}>
                        <img
                          src={icoSymbol}
                          alt=""
                          width={30}
                          height={30}
                          className={styles.loadingAgentIcon}
                        />
                        <span className={styles.answerAgentTitle}>MI AI Agent</span>
                      </div>
                      {isDeepChart ? (
                        <span className={styles.answerDepthBadge}>심화</span>
                      ) : null}
                    </div>
                    <div className={styles.answerBody}>
                      {assistantLine.replyKind === 'chart' ? (
                        <div className={styles.chartAnswerStack}>
                          {assistantLine.content ? (
                            <div className={styles.chartIntroRich}>
                              {splitAnswerWithKeywords(
                                assistantLine.content,
                                isChurnChart
                                  ? isDeepChart
                                    ? CHART2_DEEP_INTRO_HIGHLIGHTS
                                    : CHART2_INTRO_HIGHLIGHTS
                                  : isDeepChart
                                    ? CHART_DEEP_INTRO_HIGHLIGHTS
                                    : CHART_INTRO_HIGHLIGHTS,
                              )}
                            </div>
                          ) : null}
                          {showChartCard ? (
                            isChurnChart ? (
                              <ChartMockCard2
                                onImageSave={handleChartImageSave}
                                onExcelDownload={handleChartExcelDownload}
                                onExpand={(view, tab) =>
                                  openChartExpand(view, 'churn', tab)
                                }
                              />
                            ) : (
                              <ChartMockCard
                                onImageSave={handleChartImageSave}
                                onExcelDownload={handleChartExcelDownload}
                                onExpand={(view) => openChartExpand(view, 'combo')}
                              />
                            )
                          ) : null}
                          {chartSectionsReady ? (
                            <>
                              <div className={styles.answerSectionBlock}>
                                <h4 className={styles.answerSectionTitle}>📊 지표 설명</h4>
                                {chartIndComplete ? (
                                  <div className={styles.answerSectionBody}>
                                    {isChurnChart ? CHART2_INDICATOR_BODY : CHART_INDICATOR_BODY}
                                  </div>
                                ) : (
                                  <p className={styles.answerSectionBody}>{chartInd}</p>
                                )}
                              </div>
                              {isDeepChart && chartIndComplete ? (
                                <div className={styles.answerSectionBlock}>
                                  <h4 className={styles.answerSectionTitle}>🔍 원인 분석</h4>
                                  {chartCauseComplete ? (
                                    <div className={styles.answerSectionBody}>
                                      {isChurnChart ? CHART2_CAUSE_BODY : CHART_CAUSE_BODY}
                                    </div>
                                  ) : (
                                    <p className={styles.answerSectionBody}>{chartCause}</p>
                                  )}
                                </div>
                              ) : null}
                              {isDeepChart && chartIndComplete && chartCauseComplete ? (
                                <div className={styles.answerSectionBlock}>
                                  <h4 className={styles.answerSectionTitle}>📌 향후 예측</h4>
                                  {chartForeComplete ? (
                                    <div className={styles.answerSectionBody}>
                                      {isChurnChart
                                        ? CHART2_FORECAST_BODY
                                        : CHART_DEEP_FORECAST_BODY}
                                    </div>
                                  ) : (
                                    <p className={styles.answerSectionBody}>{chartFore}</p>
                                  )}
                                </div>
                              ) : null}
                              {isDeepChart && chartForeComplete ? (
                                <>
                                  <div
                                    className={styles.chartInsightDivider}
                                    aria-hidden
                                  />
                                  <div className={styles.answerSectionBlock}>
                                    <h4 className={styles.answerSectionTitle}>💡 인사이트</h4>
                                    <ul className={styles.chartInsightList}>
                                      <li className={styles.chartInsightItem}>
                                        {chartIns1Complete ? (
                                          <>
                                            <span
                                              className={styles.chartInsightCheck}
                                              aria-hidden
                                            >
                                              ✓
                                            </span>
                                            <span className={styles.chartInsightText}>
                                              {chartInsight1Plain}
                                            </span>
                                          </>
                                        ) : chartIns1 ? (
                                          <p className={styles.chartInsightTyping}>
                                            {chartIns1}
                                          </p>
                                        ) : null}
                                      </li>
                                      {(chartIns1Complete || chartIns2) && (
                                        <li className={styles.chartInsightItem}>
                                          {chartIns2Complete ? (
                                            <>
                                              <span
                                                className={styles.chartInsightCheck}
                                                aria-hidden
                                              >
                                                ✓
                                              </span>
                                              <span className={styles.chartInsightText}>
                                                {chartInsight2Plain}
                                              </span>
                                            </>
                                          ) : chartIns2 ? (
                                            <p className={styles.chartInsightTyping}>
                                              {chartIns2}
                                            </p>
                                          ) : null}
                                        </li>
                                      )}
                                    </ul>
                                  </div>
                                </>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : showTextRich ? (
                        <div className={styles.answerTextRich}>
                          {splitAnswerWithKeywords(
                            assistantLine.content,
                            highlightTermsForCategory(textCategory!),
                          )}
                        </div>
                      ) : (
                        <pre className={styles.answerText}>{assistantLine.content}</pre>
                      )}
                      {showAnswerFooter ? (
                        <div className={styles.answerFooterRow}>
                          <div className={styles.answerActions}>
                            {!isUnavailableReply ? (
                              <>
                                <AnswerActionIconBtn
                                  label="복사하기"
                                  tooltip="복사하기"
                                  iconSrc={icoCopy}
                                  onClick={() =>
                                    void handleCopyAnswer(assistantPlainText(assistantLine))
                                  }
                                />
                                {isLast ? (
                                  <AnswerActionIconBtn
                                    label="재시도"
                                    tooltip="재시도"
                                    iconSrc={icoReplay}
                                    disabled={isSending}
                                    onClick={() => void handleRegenerateLast()}
                                  />
                                ) : null}
                              </>
                            ) : null}
                            <AnswerFeedbackIconBtn
                              label="도움이 됐어요"
                              tooltip="도움이 됐어요"
                              lineIconSrc={icoLikeLine}
                              activeIconSrc={icoLike}
                              active={liked}
                              disabled={liked}
                              onClick={() => handleLikeFeedback(line.id)}
                            />
                            <AnswerFeedbackIconBtn
                              label="아쉬워요"
                              tooltip="아쉬워요"
                              lineIconSrc={icoHateLine}
                              activeIconSrc={icoHate}
                              active={disliked}
                              disabled={disliked}
                              onClick={() => handleDislikeFeedback(line.id)}
                            />
                          </div>
                          {showBasicChartDeepDive ? (
                            <AnswerDeepDiveBtn
                              disabled={
                                isSending || Boolean(deepDiveUsedByLine[line.id])
                              }
                              onClick={() => void handleDeepChartAnalysis(line.id)}
                            />
                          ) : null}
                        </div>
                      ) : null}
                      {(() => {
                        if (
                          !showAnswerFooter ||
                          (assistantLine.replyKind !== 'chart' &&
                            assistantLine.replyKind !== 'text')
                        ) {
                          return null
                        }
                        const prev = thread[index - 1]
                        const previousUserQuestion =
                          prev && prev.role === 'user' ? prev.content : ''
                        if (!previousUserQuestion) return null
                        return (
                          <FollowupMap
                            context={assistantLine.replyKind}
                            rootQuestion={previousUserQuestion}
                            onSelect={(text, depth) => {
                              setMessage(text)
                              void handleSendQuestion(text, { questionDepth: depth })
                            }}
                          />
                        )
                      })()}
                    </div>
                  </article>
                )
              })}
                <div className={styles.chatScrollAnchor} aria-hidden />
                </div>
              </div>
            ) : (
              <div className={styles.mainContent}>
              <div className={`${styles.heroSection} ${styles.heroFadeIn}`}>
                <div className={styles.hero}>
                  <h1 className={styles.heroTitle}>
                    <span className={styles.heroLine1}>데이터 전문가 없이</span>
                    <span className={styles.heroLine2}>
                      <span className={styles.heroGradient}>똑똑하게 데이터를 분석</span>
                      <img
                        src={icoSymbol}
                        alt=""
                        width={30}
                        height={30}
                        className={styles.heroSparkle}
                      />
                      <span className={styles.heroPlainTail}>해보세요</span>
                    </span>
                  </h1>
                  <p className={styles.heroDesc}>
                    심층적인 분석을 통해 더 새로운 시각의 인사이트를 제공합니다
                  </p>
                </div>
              </div>

              <div className={`${styles.questionSection} ${styles.questionFadeIn}`}>
                <div className={styles.tabRow} role="tablist" aria-label="질문 유형">
                  {TABS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={i === activeTab}
                      className={i === activeTab ? styles.tabActive : styles.tab}
                      onClick={() => setActiveTab(i)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className={styles.recommGrid}>
                  {recommendedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={styles.recommCard}
                      onClick={() => applyQuestionToComposer(q)}
                      aria-label={`입력창에 넣기: ${q}`}
                    >
                      <p className={styles.recommText}>{q}</p>
                      <span className={styles.addToChatIcon} aria-hidden>
                        <IconPlus />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              </div>
            )}
              </div>
            <div className={styles.composerWrap}>
              <div className={styles.composerFieldWrap}>
                {hasConversation && showScrollDownBtn ? (
                  <button
                    type="button"
                    className={styles.scrollDownBtn}
                    aria-label="맨 아래로 스크롤"
                    onClick={scrollChatToBottom}
                  >
                    <img
                      src={icoArrow}
                      alt=""
                      width={20}
                      height={20}
                      className={styles.scrollDownBtnIcon}
                    />
                  </button>
                ) : null}
          <div
            ref={composerRef}
            className={
              isSending
                ? `${styles.searchBox} ${styles.searchBoxLoading}`
                : styles.searchBox
            }
          >
            <label htmlFor="landing-chat-input" className={styles.visuallyHidden}>
              메시지 입력
            </label>
            <textarea
              ref={textareaRef}
              id="landing-chat-input"
              className={styles.textarea}
              placeholder={composerPlaceholder}
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={isSending}
            />
            <div className={styles.searchBottom}>
              <div className={styles.searchBottomRight}>
                <div
                  className={`${styles.dropdownWrap} ${styles.dropdownWrapEnd}`}
                >
                  <button
                    type="button"
                    className={styles.bookmarkInner}
                    aria-expanded={openMenu === 'bookmark'}
                    aria-haspopup="listbox"
                    aria-label="즐겨찾는 질문"
                    disabled={isSending}
                    onClick={() =>
                      setOpenMenu((m) => (m === 'bookmark' ? null : 'bookmark'))
                    }
                  >
                    <img
                      src={icoBookmark}
                      alt=""
                      width={20}
                      height={20}
                      className={styles.bookmarkTriggerIcon}
                    />
                    <span className={styles.bookmarkLabel}>즐겨찾는 질문</span>
                    <span className={styles.chevron} aria-hidden>
                      <IconChevronDown />
                    </span>
                  </button>
                  {openMenu === 'bookmark' ? (
                    <div
                      className={styles.dropdownPanelBookmark}
                      role="listbox"
                      aria-label="즐겨찾는 질문 목록"
                    >
                      {favoriteQuestions.length === 0 ? (
                        <p className={styles.bookmarkEmpty}>
                          즐겨찾는 질문이 없습니다.
                        </p>
                      ) : (
                        favoriteQuestions.map((q) => (
                          <div
                            key={q}
                            className={styles.bookmarkDropdownRow}
                          >
                            <button
                              type="button"
                              role="option"
                              className={styles.bookmarkRowLabel}
                              onClick={() => {
                                applyQuestionToComposer(q)
                                setOpenMenu(null)
                              }}
                            >
                              {q}
                            </button>
                            <button
                              type="button"
                              className={styles.bookmarkRowStar}
                              aria-label={`즐겨찾기 해제: ${q}`}
                              onClick={(ev) => {
                                ev.stopPropagation()
                                removeFavoriteQuestion(q)
                              }}
                            >
                              <img
                                src={icoBookmark}
                                alt=""
                                width={17}
                                height={16}
                                className={styles.bookmarkRowStarImg}
                              />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={
                    isSending
                      ? `${styles.sendBtn} ${styles.sendBtnPause}`
                      : sendDisabled
                        ? styles.sendBtn
                        : `${styles.sendBtn} ${styles.sendBtnActive}`
                  }
                  disabled={sendDisabled}
                  aria-label={isSending ? '응답 생성 중' : '메시지 보내기'}
                  onClick={() => {
                    setOpenMenu(null)
                    if (!sendDisabled) {
                      void handleSendQuestion()
                    }
                  }}
                >
                  <img
                    src={isSending ? icoPause : icoSend}
                    alt=""
                    width={32}
                    height={32}
                    className={styles.sendIcon}
                  />
                </button>
              </div>
            </div>
          </div>
              </div>
        </div>
      </div>
      </div>
      {hasConversation && isThreadPanelOpen ? (
        <QuestionFlowPanel
          groups={threadPanelGroups}
          onSelectQuestion={scrollToQuestion}
        />
      ) : null}
      {feedbackModalLineId
        ? createPortal(
            <div
              className={styles.feedbackOverlay}
              role="presentation"
              onClick={closeFeedbackModal}
            >
          <div
            className={styles.feedbackModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.feedbackModalHeader}>
              <h3 id="feedback-modal-title" className={styles.feedbackModalTitle}>
                어떤 점이 아쉬우셨나요?
              </h3>
              <div className={styles.feedbackModalDivider} aria-hidden />
            </div>
            <ul className={styles.feedbackReasonList}>
              {FEEDBACK_REASONS.map((reason) => {
                const checked = Boolean(feedbackReasons[reason])
                return (
                  <li key={reason} className={styles.feedbackReasonItem}>
                    <label className={styles.feedbackCheckLabel}>
                      <input
                        type="checkbox"
                        className={styles.feedbackCheckInput}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                          setFeedbackReasons((prev) => ({
                            ...prev,
                            [reason]: next,
                          }))
                        }}
                      />
                      <span
                        className={`${styles.feedbackCheckBox}${
                          checked ? ` ${styles.feedbackCheckBoxChecked}` : ''
                        }`}
                        aria-hidden
                      >
                        {checked ? (
                          <svg
                            className={styles.feedbackCheckBoxIcon}
                            width="12"
                            height="9"
                            viewBox="0 0 12 9"
                            aria-hidden
                          >
                            <path
                              d="M1 4.5L4.5 8L11 1.5"
                              stroke="white"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <span
                        className={`${styles.feedbackCheckText}${
                          checked ? ` ${styles.feedbackCheckTextChecked}` : ''
                        }`}
                      >
                        {reason}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <textarea
              className={styles.feedbackTextarea}
              placeholder="추가로 의견을 남겨주세요. (선택)"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              rows={4}
            />
            <div className={styles.feedbackFooter}>
              <button
                type="button"
                className={styles.feedbackCancelBtn}
                onClick={closeFeedbackModal}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.feedbackSubmitBtn}
                disabled={!Object.values(feedbackReasons).some(Boolean)}
                onClick={submitFeedbackModal}
              >
                제출
              </button>
            </div>
          </div>
            </div>,
            resolveModalPortal(),
          )
        : null}
      {isChartExpanded
        ? createPortal(
            <div
              className={styles.chartExpandOverlay}
              role="presentation"
              onClick={closeChartExpand}
            >
              <div
                className={styles.chartExpandWrapper}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.chartExpandCloseBtn}
                  aria-label="닫기"
                  onClick={closeChartExpand}
                >
                  <img
                    src={icoModalClose}
                    alt=""
                    width={40}
                    height={40}
                    className={styles.chartExpandCloseIcon}
                  />
                </button>
                <div
                  className={styles.chartExpandModal}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="chart-expand-title"
                >
                  <div className={styles.chartExpandModalUpper}>
                    <div className={styles.chartExpandModalHeader}>
                      {expandedChartVariant === 'churn' ? (
                        <ChartV2TitleSection titleId="chart-expand-title" />
                      ) : (
                        <ChartV1TitleSection titleId="chart-expand-title" />
                      )}
                      <ChartViewToggle
                        view={expandedChartView}
                        onViewChange={setExpandedChartView}
                      />
                    </div>
                    {expandedChartVariant === 'churn' ? (
                      expandedChartView === 'chart' ? (
                        <ChartPanelBody2
                          view="chart"
                          tableTab={expandedTableTab}
                          variant="expanded"
                        />
                      ) : (
                        <div
                          className={`${styles.chartExpandMainBlock} ${styles.chartMainBlockTable}`}
                        >
                          <ChartTableTabToggle
                            tab={expandedTableTab}
                            onTabChange={setExpandedTableTab}
                          />
                          <ChartPanelBody2
                            view="table"
                            tableTab={expandedTableTab}
                            variant="expanded"
                          />
                        </div>
                      )
                    ) : (
                      <ChartPanelBody view={expandedChartView} variant="expanded" />
                    )}
                  </div>
                  <div className={styles.chartExpandFooterWrap}>
                    <div className={styles.chartCardFooter}>
                      {expandedChartView === 'chart' ? (
                        <>
                          <button
                            type="button"
                            className={styles.chartFooterAction}
                            onClick={handleChartExpandImageSave}
                          >
                            <img
                              src={icoDownload}
                              alt=""
                              className={styles.chartFooterIcon}
                            />
                            <span>이미지 저장</span>
                          </button>
                          <span className={styles.chartFooterDivider} aria-hidden />
                        </>
                      ) : null}
                      <button
                        type="button"
                        className={styles.chartFooterAction}
                        onClick={handleChartExpandExcelDownload}
                      >
                        <img src={icoExcel} alt="" className={styles.chartFooterIcon} />
                        <span>엑셀 다운로드</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            resolveModalPortal(),
          )
        : null}
      {toastMessage
        ? createPortal(
            <div className={styles.feedbackToast} role="status" aria-live="polite">
              <img
                src={icoCheck}
                alt=""
                width={20}
                height={20}
                className={styles.feedbackToastIcon}
              />
              <span className={styles.feedbackToastText}>{toastMessage}</span>
            </div>,
            resolveModalPortal(),
          )
        : null}
      {isDownloading
        ? createPortal(
            <div className={styles.downloadOverlay} role="status" aria-live="polite">
              <div className={styles.downloadSpinner} aria-hidden />
            </div>,
            resolveModalPortal(),
          )
        : null}
    </Layout>
  )
}
