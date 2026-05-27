const VERSION = 6
const SIZE = 21 + (VERSION - 1) * 4
const DATA_CODEWORDS = 136
const BLOCK_DATA_CODEWORDS = 68
const ECC_CODEWORDS = 18
const ALIGNMENT_POSITIONS = [6, 34]

type Matrix = boolean[][]

const EXP_TABLE: number[] = []
const LOG_TABLE: number[] = []

let value = 1
for (let index = 0; index < 255; index++) {
  EXP_TABLE[index] = value
  LOG_TABLE[value] = index
  value <<= 1
  if (value & 0x100) value ^= 0x11d
}
for (let index = 255; index < 512; index++) {
  EXP_TABLE[index] = EXP_TABLE[index - 255]
}

export function createQrSvg(text: string) {
  const bytes = Array.from(Buffer.from(text, 'utf8'))

  if (bytes.length > 134) {
    throw new Error('QR payload is too long')
  }

  const data = createDataCodewords(bytes)
  const codewords = createCodewords(data)
  const { matrix } = createBestMatrix(codewords)

  return matrixToSvg(matrix)
}

function createDataCodewords(bytes: number[]) {
  const bits: number[] = []

  appendBits(bits, 0b0100, 4)
  appendBits(bits, bytes.length, 8)
  bytes.forEach((byte) => appendBits(bits, byte, 8))

  const capacity = DATA_CODEWORDS * 8
  appendBits(bits, 0, Math.min(4, capacity - bits.length))

  while (bits.length % 8) bits.push(0)

  const codewords: number[] = []
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(bits.slice(index, index + 8).reduce((sum, bit) => (sum << 1) | bit, 0))
  }

  for (let pad = 0; codewords.length < DATA_CODEWORDS; pad++) {
    codewords.push(pad % 2 ? 0x11 : 0xec)
  }

  return codewords
}

function createCodewords(data: number[]) {
  const blocks = [
    data.slice(0, BLOCK_DATA_CODEWORDS),
    data.slice(BLOCK_DATA_CODEWORDS, BLOCK_DATA_CODEWORDS * 2),
  ]
  const eccBlocks = blocks.map((block) => createErrorCorrection(block, ECC_CODEWORDS))
  const result: number[] = []

  for (let index = 0; index < BLOCK_DATA_CODEWORDS; index++) {
    blocks.forEach((block) => result.push(block[index]))
  }

  for (let index = 0; index < ECC_CODEWORDS; index++) {
    eccBlocks.forEach((block) => result.push(block[index]))
  }

  return result
}

function createBestMatrix(codewords: number[]) {
  let best = createMatrix(codewords, 0)
  let bestPenalty = getPenaltyScore(best.matrix)

  for (let mask = 1; mask < 8; mask++) {
    const candidate = createMatrix(codewords, mask)
    const penalty = getPenaltyScore(candidate.matrix)

    if (penalty < bestPenalty) {
      best = candidate
      bestPenalty = penalty
    }
  }

  return best
}

function createMatrix(codewords: number[], mask: number) {
  const matrix = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false))
  const reserved = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false))

  drawFunctionPatterns(matrix, reserved, mask)
  drawData(matrix, reserved, codewords, mask)
  drawFormatBits(matrix, reserved, mask)

  return { matrix, reserved }
}

function drawFunctionPatterns(matrix: Matrix, reserved: Matrix, mask: number) {
  drawFinder(matrix, reserved, 0, 0)
  drawFinder(matrix, reserved, SIZE - 7, 0)
  drawFinder(matrix, reserved, 0, SIZE - 7)

  for (let index = 0; index < SIZE; index++) {
    if (!reserved[6][index]) setFunctionModule(matrix, reserved, 6, index, index % 2 === 0)
    if (!reserved[index][6]) setFunctionModule(matrix, reserved, index, 6, index % 2 === 0)
  }

  for (const row of ALIGNMENT_POSITIONS) {
    for (const col of ALIGNMENT_POSITIONS) {
      if (reserved[row][col]) continue
      drawAlignment(matrix, reserved, row, col)
    }
  }

  setFunctionModule(matrix, reserved, 4 * VERSION + 9, 8, true)
  drawFormatBits(matrix, reserved, mask)
}

function drawFinder(matrix: Matrix, reserved: Matrix, row: number, col: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const y = row + dy
      const x = col + dx

      if (y < 0 || y >= SIZE || x < 0 || x >= SIZE) continue

      const isInside = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6
      const isDark =
        isInside &&
        (dy === 0 || dy === 6 || dx === 0 || dx === 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4))

      setFunctionModule(matrix, reserved, y, x, isDark)
    }
  }
}

function drawAlignment(matrix: Matrix, reserved: Matrix, row: number, col: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      setFunctionModule(matrix, reserved, row + dy, col + dx, distance !== 1)
    }
  }
}

function drawFormatBits(matrix: Matrix, reserved: Matrix, mask: number) {
  const bits = getFormatBits(mask)

  for (let index = 0; index <= 5; index++) setFunctionModule(matrix, reserved, index, 8, getBit(bits, index))
  setFunctionModule(matrix, reserved, 7, 8, getBit(bits, 6))
  setFunctionModule(matrix, reserved, 8, 8, getBit(bits, 7))
  setFunctionModule(matrix, reserved, 8, 7, getBit(bits, 8))
  for (let index = 9; index < 15; index++) setFunctionModule(matrix, reserved, 8, 14 - index, getBit(bits, index))

  for (let index = 0; index < 8; index++) {
    setFunctionModule(matrix, reserved, 8, SIZE - 1 - index, getBit(bits, index))
  }
  for (let index = 8; index < 15; index++) {
    setFunctionModule(matrix, reserved, SIZE - 15 + index, 8, getBit(bits, index))
  }
  setFunctionModule(matrix, reserved, SIZE - 8, 8, true)
}

function drawData(matrix: Matrix, reserved: Matrix, codewords: number[], mask: number) {
  let bitIndex = 0
  let upward = true

  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right--

    for (let vert = 0; vert < SIZE; vert++) {
      const row = upward ? SIZE - 1 - vert : vert

      for (let offset = 0; offset < 2; offset++) {
        const col = right - offset

        if (reserved[row][col]) continue

        const byte = codewords[Math.floor(bitIndex / 8)] || 0
        let isDark = ((byte >>> (7 - (bitIndex % 8))) & 1) !== 0

        if (getMaskBit(mask, row, col)) isDark = !isDark

        matrix[row][col] = isDark
        bitIndex++
      }
    }

    upward = !upward
  }
}

function matrixToSvg(matrix: Matrix) {
  const quietZone = 4
  const viewSize = SIZE + quietZone * 2
  const paths: string[] = []

  matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) paths.push(`M${x + quietZone},${y + quietZone}h1v1h-1z`)
    })
  })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" role="img" aria-label="Plant Bud phone upload QR" shape-rendering="crispEdges">`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    '<path fill="#000000" d="',
    paths.join(''),
    '"/>',
    '</svg>',
  ].join('')
}

function appendBits(bits: number[], valueToAppend: number, length: number) {
  for (let index = length - 1; index >= 0; index--) {
    bits.push((valueToAppend >>> index) & 1)
  }
}

function setFunctionModule(matrix: Matrix, reserved: Matrix, row: number, col: number, isDark: boolean) {
  matrix[row][col] = isDark
  reserved[row][col] = true
}

function getFormatBits(mask: number) {
  const data = (0b01 << 3) | mask
  let bits = data << 10

  for (let index = 14; index >= 10; index--) {
    if (((bits >>> index) & 1) !== 0) bits ^= 0x537 << (index - 10)
  }

  return (((data << 10) | bits) ^ 0x5412) & 0x7fff
}

function getBit(valueToRead: number, index: number) {
  return ((valueToRead >>> index) & 1) !== 0
}

function getMaskBit(mask: number, row: number, col: number) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0
    case 1:
      return row % 2 === 0
    case 2:
      return col % 3 === 0
    case 3:
      return (row + col) % 3 === 0
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
  }
}

function createErrorCorrection(data: number[], degree: number) {
  const divisor = createDivisor(degree)
  const result = Array.from({ length: degree }, () => 0)

  data.forEach((byte) => {
    const factor = byte ^ result.shift()!
    result.push(0)

    divisor.forEach((coefficient, index) => {
      result[index] ^= multiply(coefficient, factor)
    })
  })

  return result
}

function createDivisor(degree: number) {
  const result = Array.from({ length: degree }, () => 0)

  result[degree - 1] = 1

  let root = 1
  for (let index = 0; index < degree; index++) {
    for (let coefficient = 0; coefficient < degree; coefficient++) {
      result[coefficient] = multiply(result[coefficient], root)
      if (coefficient + 1 < degree) result[coefficient] ^= result[coefficient + 1]
    }
    root = multiply(root, 2)
  }

  return result
}

function multiply(left: number, right: number) {
  if (!left || !right) return 0
  return EXP_TABLE[LOG_TABLE[left] + LOG_TABLE[right]]
}

function getPenaltyScore(matrix: Matrix) {
  let penalty = 0

  for (let row = 0; row < SIZE; row++) {
    penalty += getLinePenalty(matrix[row])
  }

  for (let col = 0; col < SIZE; col++) {
    penalty += getLinePenalty(matrix.map((row) => row[col]))
  }

  for (let row = 0; row < SIZE - 1; row++) {
    for (let col = 0; col < SIZE - 1; col++) {
      const color = matrix[row][col]
      if (
        color === matrix[row][col + 1] &&
        color === matrix[row + 1][col] &&
        color === matrix[row + 1][col + 1]
      ) {
        penalty += 3
      }
    }
  }

  const dark = matrix.flat().filter(Boolean).length
  const total = SIZE * SIZE
  const percent = (dark * 100) / total

  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10

  return penalty
}

function getLinePenalty(line: boolean[]) {
  let penalty = 0
  let runColor = line[0]
  let runLength = 1

  for (let index = 1; index < line.length; index++) {
    if (line[index] === runColor) {
      runLength++
    } else {
      if (runLength >= 5) penalty += runLength - 2
      runColor = line[index]
      runLength = 1
    }
  }

  if (runLength >= 5) penalty += runLength - 2

  return penalty
}
