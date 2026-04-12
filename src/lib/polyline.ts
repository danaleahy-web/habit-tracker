/**
 * Decode a Google encoded polyline string into [lat, lng] pairs.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }

  return points
}

/**
 * Convert decoded points into an SVG path string, scaled to fit a viewBox.
 */
export function polylineToSvgPath(
  points: [number, number][],
  width: number,
  height: number,
  padding = 8
): string {
  if (points.length < 2) return ''

  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latRange = maxLat - minLat || 0.001
  const lngRange = maxLng - minLng || 0.001

  const drawW = width - padding * 2
  const drawH = height - padding * 2

  const scale = Math.min(drawW / lngRange, drawH / latRange)

  const mapped = points.map(([lat, lng]) => {
    const x = padding + (lng - minLng) * scale + (drawW - lngRange * scale) / 2
    // Flip Y since lat increases upward but SVG Y increases downward
    const y = padding + (maxLat - lat) * scale + (drawH - latRange * scale) / 2
    return [x, y] as [number, number]
  })

  return mapped.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}
