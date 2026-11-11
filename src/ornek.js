// Deneme için hazır yıldız üçgen devresi (doğru bağlantı).
// Raylar: 0 üst, 1 orta, 2 alt.
import { etiketle } from './malzemeler.js';

export function ornekDevre() {
  const comps = [
    { id: 'c1', type: 'besleme3f', rail: 0, x: -28.5 },
    { id: 'c3', type: 'sigorta3', rail: 0, x: -17 },
    { id: 'c4', type: 'sigorta1', rail: 0, x: -11.5 },
    { id: 'c5', type: 'kontaktor', rail: 0, x: -5.5 },
    { id: 'c6', type: 'kontaktor', rail: 0, x: 3 },
    { id: 'c7', type: 'kontaktor', rail: 0, x: 11.5 },
    { id: 'c8', type: 'zaman', rail: 0, x: 18 },
    { id: 'c9', type: 'termik', rail: 1, x: -5.5 },
    { id: 'c10', type: 'dur', rail: 1, x: 6 },
    { id: 'c11', type: 'basla', rail: 1, x: 10.5 },
    { id: 'c12', type: 'lamba', rail: 1, x: 15 },
    { id: 'c13', type: 'motor', rail: 2, x: -5.5 },
  ];
  etiketle(comps);
  const K = 'kahve', S = 'siyah', G = 'gri', R = 'kirmizi', M = 'mavi', PE = 'sariyesil';
  const w = [
    ['c1.L1', 'c3.1', K], ['c1.L2', 'c3.3', S], ['c1.L3', 'c3.5', G],
    ['c3.2', 'c5.1', K], ['c3.4', 'c5.3', S], ['c3.6', 'c5.5', G],
    ['c5.2', 'c9.1', K], ['c5.4', 'c9.3', S], ['c5.6', 'c9.5', G],
    ['c9.2', 'c13.U1', K], ['c9.4', 'c13.V1', S], ['c9.6', 'c13.W1', G],
    ['c7.1', 'c13.U1', K], ['c7.3', 'c13.V1', S], ['c7.5', 'c13.W1', G],
    ['c7.2', 'c13.W2', K], ['c7.4', 'c13.U2', S], ['c7.6', 'c13.V2', G],
    ['c6.1', 'c13.U2', S], ['c6.3', 'c13.V2', G], ['c6.5', 'c13.W2', K],
    ['c6.2', 'c6.4', S], ['c6.4', 'c6.6', S],
    ['c3.2', 'c4.1', K], ['c4.2', 'c9.95', R], ['c9.96', 'c10.11', R],
    ['c10.12', 'c11.13', R], ['c11.14', 'c5.A1', R],
    ['c10.12', 'c5.13', R], ['c5.14', 'c5.A1', R],
    ['c5.14', 'c8.A1', R], ['c8.A1', 'c8.15', R],
    ['c8.16', 'c7.21', R], ['c7.22', 'c6.A1', R],
    ['c8.18', 'c6.21', R], ['c6.22', 'c7.A1', R],
    ['c5.14', 'c12.X1', R],
    ['c1.PE', 'c13.PE', PE],
    ['c1.N', 'c5.A2', M], ['c5.A2', 'c6.A2', M], ['c6.A2', 'c7.A2', M], ['c7.A2', 'c8.A2', M], ['c8.A2', 'c12.X2', M],
  ].map(([a, b, color]) => ({ a, b, color }));
  return { comps, wires: w };
}
