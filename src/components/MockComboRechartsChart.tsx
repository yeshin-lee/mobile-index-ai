import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './MockComboRechartsChart.module.css'

export type ComboDatum = {
  month: string
  mau: number
  installs: number
}

type Props = {
  labels: readonly string[]
  barValues: readonly number[]
  lineValues: readonly number[]
  className?: string
}

const Y_TICKS = [0, 50, 100, 150, 200, 250, 300, 350, 400] as const

/** 라인 시리즈 animationDuration과 동기 — 답변 스트리밍 대기용 */
export const CHART_COMBO_ANIMATION_MS = 1000

/** 차트 플롯 영역 고정 높이 (범례 16px + gap 16px = chartMainBlock 272px) */
export const CHART_PLOT_HEIGHT = 240

const CHART_MARGIN = { top: 10, right: 40, bottom: 0, left: 40 } as const

const GRID_STROKE = '#54545f'
const Y_AXIS_LABEL_GAP = 10
const Y_AXIS_TICK_WIDTH = 28
const Y_AXIS_WIDTH = Y_AXIS_TICK_WIDTH + Y_AXIS_LABEL_GAP + 14

const AXIS_LABEL_STYLE = { fill: '#94949f', fontSize: 10, fontWeight: 500 }

function parseAxisLabelViewBox(viewBox: unknown) {
  if (!viewBox || typeof viewBox !== 'object') return null
  const vb = viewBox as Record<string, unknown>
  const x = vb.x
  const y = vb.y
  const width = vb.width
  const height = vb.height
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number'
  ) {
    return null
  }
  return { x, y, width, height }
}

function LeftYAxisLabel(props: { viewBox?: unknown }) {
  const viewBox = parseAxisLabelViewBox(props.viewBox)
  if (!viewBox) return null
  const x = viewBox.x + viewBox.width - Y_AXIS_TICK_WIDTH - Y_AXIS_LABEL_GAP
  const y = viewBox.y + viewBox.height / 2
  return (
    <text
      x={x}
      y={y}
      fill={AXIS_LABEL_STYLE.fill}
      fontSize={AXIS_LABEL_STYLE.fontSize}
      fontWeight={AXIS_LABEL_STYLE.fontWeight}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(-90, ${x}, ${y})`}
    >
      사용자 수 (MAU)
    </text>
  )
}

function RightYAxisLabel(props: { viewBox?: unknown }) {
  const viewBox = parseAxisLabelViewBox(props.viewBox)
  if (!viewBox) return null
  const x = viewBox.x + Y_AXIS_TICK_WIDTH + Y_AXIS_LABEL_GAP
  const y = viewBox.y + viewBox.height / 2
  return (
    <text
      x={x}
      y={y}
      fill={AXIS_LABEL_STYLE.fill}
      fontSize={AXIS_LABEL_STYLE.fontSize}
      fontWeight={AXIS_LABEL_STYLE.fontWeight}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(90, ${x}, ${y})`}
    >
      신규 설치 건 수
    </text>
  )
}

function ChartTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: ComboDatum }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{row.month}</p>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>MAU</span>
        <span className={styles.tooltipVal}>{row.mau.toLocaleString('ko-KR')}</span>
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipLabel}>신규 설치</span>
        <span className={styles.tooltipVal}>{row.installs.toLocaleString('ko-KR')}</span>
      </div>
    </div>
  )
}

export function MockComboRechartsChart({
  labels,
  barValues,
  lineValues,
  className,
}: Props) {
  const data = useMemo((): ComboDatum[] => {
    const n = Math.min(labels.length, barValues.length, lineValues.length)
    return Array.from({ length: n }, (_, i) => ({
      month: labels[i]!,
      mau: lineValues[i]!,
      installs: barValues[i]!,
    }))
  }, [labels, barValues, lineValues])

  return (
    <div
      className={className}
      style={{ width: '100%', height: CHART_PLOT_HEIGHT }}
    >
      <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={CHART_MARGIN} barCategoryGap="18%">
          <CartesianGrid
            stroke={GRID_STROKE}
            strokeWidth={1}
            horizontal
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: '#8f8f9a', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            height={24}
            tickMargin={4}
            padding={{ left: 0, right: 0 }}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            domain={[0, 400]}
            ticks={[...Y_TICKS]}
            tick={{ fill: '#8f8f9a', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={Y_AXIS_WIDTH}
            label={{ content: LeftYAxisLabel }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 400]}
            ticks={[...Y_TICKS]}
            tick={{ fill: '#8f8f9a', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={Y_AXIS_WIDTH}
            label={{ content: RightYAxisLabel }}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.14)', strokeWidth: 1 }}
            content={ChartTooltipContent}
            wrapperStyle={{ outline: 'none', zIndex: 20 }}
            animationDuration={200}
          />
          <Bar
            yAxisId="right"
            dataKey="installs"
            name="신규 설치"
            fill="#36c986"
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="mau"
            name="MAU"
            stroke="#f6a866"
            strokeWidth={2.25}
            dot={{
              r: 3.5,
              fill: '#f6a866',
              stroke: '#2a2a30',
              strokeWidth: 1.25,
            }}
            activeDot={{ r: 4.5 }}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
