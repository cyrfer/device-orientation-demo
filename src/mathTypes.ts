
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
