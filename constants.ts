
export interface NISClass {
  class: string;
  minEarnings: number;
  maxEarnings: number | null;
  contribution: number;
}

export const NIS_TABLE_2026: NISClass[] = [
  { class: 'I', minEarnings: 200.00, maxEarnings: 339.99, contribution: 14.60 },
  { class: 'II', minEarnings: 340.00, maxEarnings: 449.99, contribution: 21.30 },
  { class: 'III', minEarnings: 450.00, maxEarnings: 609.99, contribution: 28.60 },
  { class: 'IV', minEarnings: 610.00, maxEarnings: 759.99, contribution: 37.00 },
  { class: 'V', minEarnings: 760.00, maxEarnings: 929.99, contribution: 45.60 },
  { class: 'VI', minEarnings: 930.00, maxEarnings: 1119.99, contribution: 55.40 },
  { class: 'VII', minEarnings: 1120.00, maxEarnings: 1299.99, contribution: 65.30 },
  { class: 'VIII', minEarnings: 1300.00, maxEarnings: 1489.99, contribution: 75.30 },
  { class: 'IX', minEarnings: 1490.00, maxEarnings: 1709.99, contribution: 86.40 },
  { class: 'X', minEarnings: 1710.00, maxEarnings: 1909.99, contribution: 97.70 },
  { class: 'XI', minEarnings: 1910.00, maxEarnings: 2139.99, contribution: 109.40 },
  { class: 'XII', minEarnings: 2140.00, maxEarnings: 2379.99, contribution: 122.00 },
  { class: 'XIII', minEarnings: 2380.00, maxEarnings: 2629.99, contribution: 135.30 },
  { class: 'XIV', minEarnings: 2630.00, maxEarnings: 2919.99, contribution: 149.90 },
  { class: 'XV', minEarnings: 2920.00, maxEarnings: 3137.99, contribution: 163.60 },
  { class: 'XVI', minEarnings: 3138.00, maxEarnings: null, contribution: 169.50 },
];

export const calculateNISContribution = (grossWeeklyEarnings: number): number => {
  if (grossWeeklyEarnings < 200.00) return 0;
  
  const nisClass = NIS_TABLE_2026.find(c => 
    grossWeeklyEarnings >= c.minEarnings && 
    (c.maxEarnings === null || grossWeeklyEarnings <= c.maxEarnings)
  );
  
  return nisClass ? nisClass.contribution : 0;
};
