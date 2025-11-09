
export type Vector3 = [ number, number, number ];

export type Matrix3x3 = [
  Vector3,
  Vector3,
  Vector3
];


// Dot product: takes two vectors and returns the sum of component-wise multiplication
export function dotProduct(v1: Vector3, v2: Vector3): number {
  return v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
}

// Matrix-vector multiplication: result = matrix × vector
// Each component of the result is the dot product of the corresponding matrix row with the vector
export function multiplyMatrixVector(matrix: Matrix3x3, vector: Vector3): Vector3 {
  return [
    dotProduct(matrix[0], vector),
    dotProduct(matrix[1], vector),
    dotProduct(matrix[2], vector),
  ];
}


// Matrix multiplication: result = A × B
export function multiplyMatrices(
  A: Matrix3x3,
  B: Matrix3x3
): Matrix3x3 {
  const result: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  for (let r = 0; r < 3; r++) {
    const row = A[r];
    for (let c = 0; c < 3; c++) {
      const col: Vector3 = [
        B[0][c],
        B[1][c],
        B[2][c]
      ];
      result[r][c] = dotProduct(row, col);
    }
  }

  return result;
}


// Build the rotation matrix from Euler angles (alpha, beta, gamma)
// Based on the W3C Device Orientation Event specification
// https://www.w3.org/TR/orientation-event/#worked-example
// https://www.w3.org/TR/orientation-event/equation13a.png
export function buildRotationMatrix(alphaRad: number, betaRad: number, gammaRad: number): Matrix3x3 {
    const cA = Math.cos(alphaRad);
    const sA = Math.sin(alphaRad);
    const cB = Math.cos(betaRad);
    const sB = Math.sin(betaRad);
    const cG = Math.cos(gammaRad);
    const sG = Math.sin(gammaRad);

    // Full rotation matrix R from equation13a.png
    return [
        [cA*cG - sA*sB*sG,  -cB*sA,        cG*sA*sB + cA*sG],
        [cG*sA + cA*sB*sG,   cA*cB,        sA*sG - cA*cG*sB],
        [-cB*sG,             sB,            cB*cG          ],
    ];
}


// Build rotation matrix from extracted angles (roll, elevation, heading)
// Order: R = R(roll) * R(elevation) * R(heading)
// This constructs a rotation matrix from the extracted angles to compare with the raw device matrix
export function buildRotationMatrixFromAngles(heading: number, elevation: number, roll: number): Matrix3x3 {

    // Convert degrees to radians
    const h = heading * (Math.PI / 180);
    const e = elevation * (Math.PI / 180);
    const r = roll * (Math.PI / 180);

    // Heading rotation (around Y-axis)
    const ch = Math.cos(-h);
    const sh = Math.sin(-h);
    const Rh: Matrix3x3 = [
        [ch, 0, sh],
        [0, 1, 0],
        [-sh, 0, ch]
    ];

    // Elevation rotation (around X-axis)
    const ce = Math.cos(e);
    const se = Math.sin(e);
    const Re: Matrix3x3 = [
        [1, 0, 0],
        [0, ce, -se],
        [0, se, ce]
    ];

    // Roll rotation (around Z-axis)
    const cr = Math.cos(-r);
    const sr = Math.sin(-r);
    const Rr: Matrix3x3 = [
        [cr, -sr, 0],
        [sr, cr, 0],
        [0, 0, 1]
    ];


    const RhRe: Matrix3x3 = multiplyMatrices(Rh, Re);
    const R: Matrix3x3 = multiplyMatrices(RhRe, Rr);

    return R;
}
