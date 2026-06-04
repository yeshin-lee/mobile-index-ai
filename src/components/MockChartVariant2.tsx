import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './MockChartVariant2.module.css'

export const MOCK_CHART_VARIANT2_PLOT_HEIGHT = 240
export const MOCK_CHART_VARIANT2_LEGEND_GAP = 16
export const MOCK_CHART_VARIANT2_LEGEND_HEIGHT = 16
export const MOCK_CHART_VARIANT2_TOTAL_HEIGHT =
  MOCK_CHART_VARIANT2_PLOT_HEIGHT +
  MOCK_CHART_VARIANT2_LEGEND_GAP +
  MOCK_CHART_VARIANT2_LEGEND_HEIGHT

/** @deprecated MOCK_CHART_VARIANT2_TOTAL_HEIGHT 사용 */
export const MOCK_CHART_VARIANT2_DEFAULT_HEIGHT = MOCK_CHART_VARIANT2_TOTAL_HEIGHT

const PIE_DATA = [
  { name: '쿠팡', value: 38, color: '#8b5cf6' },
  { name: '네이버쇼핑', value: 24, color: '#60a5fa' },
  { name: '무신사', value: 15, color: '#f472b6' },
  { name: '올리브영', value: 12, color: '#facc15' },
  { name: '기타', value: 11, color: '#94a3b8' },
] as const

const STACK_LEGEND = [
  { name: '남성', color: '#34d399' },
  { name: '여성', color: '#fb923c' },
] as const

const STACK_DATA = [
  { age: '20대', male: 45, female: 55 },
  { age: '30대', male: 52, female: 48 },
  { age: '40대', male: 56, female: 44 },
  { age: '50대', male: 60, female: 40 },
] as const

const GRID_STROKE = '#484851'
const TICK_STYLE = { fill: '#e4e4e7', fontSize: 10, fontWeight: 500 as const }

const PIE_MARGIN = { top: 4, right: 4, bottom: 4, left: 4 } as const
const BAR_MARGIN = { top: 8, right: 8, bottom: 4, left: 0 } as const

type PieDatum = (typeof PIE_DATA)[number]

type Props = {
  /** 전체 높이(차트 + gap + 범례). 기본 272px */
  height?: number
  className?: string
}

function ChartLegend({
  items,
}: {
  items: ReadonlyArray<{ name: string; color: string }>
}) {
  return (
    <div className={styles.legend} aria-hidden>
      {items.map((item) => (
        <span key={item.name} className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ backgroundColor: item.color }}
          />
          {item.name}
        </span>
      ))}
    </div>
  )
}

function PieTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: PieDatum }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{row.name}</p>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>비율</span>
        <span className={styles.tooltipVal}>{row.value}%</span>
      </div>
    </div>
  )
}

function StackTooltipContent(props: {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{
    dataKey?: string | number
    name?: string
    value?: number
  }>
}) {
  const { active, payload, label } = props
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label != null ? String(label) : ''}</p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>{entry.name}</span>
          <span className={styles.tooltipVal}>{entry.value}%</span>
        </div>
      ))}
    </div>
  )
}

type StackTooltipProps = Parameters<typeof StackTooltipContent>[0]

export function MockChartVariant2({
  height = MOCK_CHART_VARIANT2_TOTAL_HEIGHT,
  className,
}: Props) {
  const shellClassName = [styles.shell, className].filter(Boolean).join(' ')
  const plotHeight =
    height - MOCK_CHART_VARIANT2_LEGEND_GAP - MOCK_CHART_VARIANT2_LEGEND_HEIGHT

  return (
    <div className={shellClassName} style={{ height }}>
      <div className={styles.root}>
        <div className={styles.chartRow} style={{ height: plotHeight }}>
          <div className={styles.chartHalf}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={PIE_MARGIN}>
                <Pie
                  data={[...PIE_DATA]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="78%"
                  innerRadius={0}
                  paddingAngle={1}
                  stroke="transparent"
                  isAnimationActive
                  animationDuration={800}
                >
                  {PIE_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={PieTooltipContent}
                  wrapperStyle={{ outline: 'none', zIndex: 20 }}
                  animationDuration={200}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartHalf}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...STACK_DATA]} margin={BAR_MARGIN} barCategoryGap="22%">
                <CartesianGrid
                  stroke={GRID_STROKE}
                  strokeWidth={1}
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="age"
                  tick={TICK_STYLE}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={22}
                  tickMargin={4}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={TICK_STYLE}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                  content={(tooltipProps) => (
                    <StackTooltipContent {...(tooltipProps as StackTooltipProps)} />
                  )}
                  wrapperStyle={{ outline: 'none', zIndex: 20 }}
                  animationDuration={200}
                />
                <Bar
                  stackId="a"
                  dataKey="male"
                  name="남성"
                  fill="#34d399"
                  maxBarSize={40}
                  isAnimationActive
                  animationDuration={800}
                />
                <Bar
                  stackId="a"
                  dataKey="female"
                  name="여성"
                  fill="#fb923c"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.legendRow}>
          <div className={styles.legendHalf}>
            <ChartLegend items={PIE_DATA} />
          </div>
          <div className={styles.legendHalf}>
            <ChartLegend items={STACK_LEGEND} />
          </div>
        </div>
      </div>
    </div>
  )
}
