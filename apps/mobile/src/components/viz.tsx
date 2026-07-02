/**
 * Micro-visualizações do LoopOS — progresso, barras e linha de tendência.
 *
 * Componentes pequenos e refinados para a Home (e reutilizáveis nos módulos):
 * - ProgressBar: barra horizontal arredondada (metas, leitura)
 * - TimeProgress: indicador temporal (semana/mês/ano) com label + barra fina
 * - WeekBars: gráfico de barras minimalista (volume por dia)
 * - TrendLine: gráfico de linha SVG (km por dia)
 *
 * Direção: leitura rápida, sem grid pesado, sem cara de dashboard técnico.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';
import { colors } from './ui.js';

// ─── ProgressBar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** Progresso de 0 a 1 (valores fora do intervalo são grampeados). */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
}

export function ProgressBar({
  value,
  height = 6,
  color = colors.accent,
  trackColor = 'rgba(255, 255, 255, 0.08)',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// ─── TimeProgress ─────────────────────────────────────────────────────────────

interface TimeProgressProps {
  label: string;
  /** Progresso de 0 a 1. */
  value: number;
}

/** Indicador temporal editorial: "SEMANA  57%" + barra fina, sem caixa. */
export function TimeProgress({ label, value }: TimeProgressProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={vizStyles.timeItem}>
      <View style={vizStyles.timeLabelRow}>
        <Text style={vizStyles.timeLabel}>{label.toUpperCase()}</Text>
        <Text style={vizStyles.timePct}>{pct}%</Text>
      </View>
      <ProgressBar value={value} height={3} color={colors.textSecondary} />
    </View>
  );
}

// ─── WeekBars ─────────────────────────────────────────────────────────────────

export interface DayPoint {
  /** Inicial do dia (S, T, Q...). */
  label: string;
  value: number;
  /** Destaca a barra (ex.: hoje). */
  emphasis?: boolean;
}

interface WeekBarsProps {
  data: DayPoint[];
  height?: number;
}

/** Barras minimalistas por dia — sem eixos, leitura de relance. */
export function WeekBars({ data, height = 56 }: WeekBarsProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={[vizStyles.barsRow, { height: height + 18 }]}>
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max((d.value / max) * height, 3) : 3;
        return (
          <View key={`${d.label}-${i}`} style={vizStyles.barCol}>
            <View
              style={[
                vizStyles.bar,
                {
                  height: h,
                  backgroundColor:
                    d.value === 0
                      ? 'rgba(255, 255, 255, 0.07)'
                      : d.emphasis
                        ? colors.accent
                        : 'rgba(167, 139, 250, 0.45)',
                },
              ]}
            />
            <Text style={vizStyles.barLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── TrendLine ────────────────────────────────────────────────────────────────

interface TrendLineProps {
  data: DayPoint[];
  height?: number;
  /** Formata os valores do eixo/último ponto (ex.: km). */
  formatValue?: (v: number) => string;
}

/**
 * Linha de tendência SVG com área sutil — km por dia, estilo Fitness.
 * Eixo Y discreto (máx/0) à esquerda e valor sobre o último ponto com dado.
 */
export function TrendLine({
  data,
  height = 56,
  formatValue = (v) => String(v),
}: TrendLineProps) {
  const width = 100; // viewBox relativo; estica para a largura do card
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const padY = 8;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - padY - (d.value / max) * (height - padY * 2),
    zero: d.value === 0,
    value: d.value,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `0,${height} ${polyline} ${width},${height}`;
  // Último ponto com registro (para rotular o valor)
  const lastWithData = [...points].reverse().find((p) => !p.zero) ?? null;
  const topY = padY;
  const baseY = height - padY;

  return (
    <View style={vizStyles.trendRow}>
      {/* Eixo Y: máx e 0, discretos */}
      <View style={[vizStyles.axisCol, { height }]}>
        <Text style={vizStyles.axisLabel}>{formatValue(max)}</Text>
        <Text style={vizStyles.axisLabel}>0</Text>
      </View>

      <View style={vizStyles.trendChart}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Guias horizontais sutis (topo = máx, base = 0) */}
          <Polyline
            points={`0,${topY} ${width},${topY}`}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={0.8}
          />
          <Polyline
            points={`0,${baseY} ${width},${baseY}`}
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth={0.8}
          />
          <Polygon points={area} fill="rgba(167, 139, 250, 0.10)" />
          <Polyline
            points={polyline}
            fill="none"
            stroke={colors.accent}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map(
            (p, i) =>
              !p.zero && (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === points.length - 1 ? 2.8 : 1.8}
                  fill={colors.accent}
                />
              ),
          )}
        </Svg>

        {/* Valor sobre o último ponto com dado (coordenada Y não é esticada) */}
        {lastWithData && (
          <View
            style={[
              vizStyles.pointValueWrap,
              {
                top: Math.max(lastWithData.y - 16, 0),
                left: `${Math.min((lastWithData.x / width) * 100, 88)}%`,
              },
            ]}
          >
            <Text style={vizStyles.pointValue}>
              {formatValue(lastWithData.value)}
            </Text>
          </View>
        )}

        <View style={vizStyles.lineLabels}>
          {data.map((d, i) => (
            <Text key={`${d.label}-${i}`} style={vizStyles.barLabel}>
              {d.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const vizStyles = StyleSheet.create({
  timeItem: {
    flex: 1,
    gap: 6,
  },
  timeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  timePct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  bar: {
    width: '100%',
    maxWidth: 22,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 1,
  },
  trendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  axisCol: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 4,
    minWidth: 18,
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  trendChart: {
    flex: 1,
  },
  pointValueWrap: {
    position: 'absolute',
  },
  pointValue: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
});
