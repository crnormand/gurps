function getTokenHitAreaAsPolygon(token) {
  let points =
    token.hitArea?.points.map((value, index) => {
      return index % 2 === 1 ? value + token.x : value + token.y
    }) || []

  // Modify the points array by swapping the x and y coordinates.
  // For some reason, the token.hitArea.points are in (y, x) order.
  for (let i = 0; i < points.length; i += 2) {
    let temp = points[i]
    points[i] = points[i + 1]
    points[i + 1] = temp
  }
  return points
}

function isInsideTokenBoundingBox(dropX, dropY, token) {
  return dropX >= token.x && dropX <= token.x + token.w && dropY >= token.y && dropY <= token.y + token.h
}

function isInsidePolygon(x, y, polygon) {
  // A polygon must have 3 (x, y) coordinates.
  if (polygon.length < 6) return false

  let inside = false

  for (let i = 0, j = polygon.length - 2; i < polygon.length; i += 2) {
    const xi = polygon[i],
      yi = polygon[i + 1]
    const xj = polygon[j],
      yj = polygon[j + 1]

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
    j = i
  }

  return inside
}

export { getTokenHitAreaAsPolygon, isInsidePolygon, isInsideTokenBoundingBox }
