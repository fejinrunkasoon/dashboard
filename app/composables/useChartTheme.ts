/**
 * Theme-aware colors for Chart.js (canvas cannot use CSS vars reliably).
 * Dark mode → lighter grid/ticks; light mode → darker ones.
 */
export function useChartTheme() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')

  const gridColor = computed(() =>
    isDark.value ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
  )

  const tickColor = computed(() =>
    isDark.value ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.55)'
  )

  const legendColor = computed(() =>
    isDark.value ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)'
  )

  /** Radar tick label backdrop (Chart.js default is near-white). */
  const tickBackdropColor = computed(() =>
    isDark.value ? 'rgba(20, 20, 20, 0.8)' : 'rgba(255, 255, 255, 0.75)'
  )

  /** Doughnut/pie segment border matching chart surface. */
  const surfaceColor = computed(() =>
    isDark.value ? '#141414' : '#ffffff'
  )

  function cartesianAxis(extra: Record<string, unknown> = {}) {
    const extraTicks = (extra.ticks as Record<string, unknown> | undefined) ?? {}
    const extraGrid = (extra.grid as Record<string, unknown> | undefined) ?? {}
    const extraBorder = (extra.border as Record<string, unknown> | undefined) ?? {}
    const { ticks: _t, grid: _g, border: _b, ...rest } = extra
    return {
      ...rest,
      grid: { color: gridColor.value, ...extraGrid },
      border: { color: gridColor.value, ...extraBorder },
      ticks: {
        color: tickColor.value,
        ...extraTicks
      }
    }
  }

  return {
    isDark,
    gridColor,
    tickColor,
    legendColor,
    tickBackdropColor,
    surfaceColor,
    cartesianAxis
  }
}
