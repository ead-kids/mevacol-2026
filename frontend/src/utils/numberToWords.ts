// Conversor de valores numéricos a palabras en pesos colombianos (M/CTE)
export function numberToWordsCOP(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'CERO PESOS M/CTE';

  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const teens = [
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
    'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'
  ];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const hundreds = [
    '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS',
    'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
  ];

  function convertGroup(n: number): string {
    let output = '';
    if (n === 100) return 'CIEN';

    const c = Math.floor(n / 100);
    const remainder = n % 100;
    const d = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (c > 0) output += hundreds[c] + ' ';

    if (remainder >= 10 && remainder <= 19) {
      output += teens[remainder - 10] + ' ';
    } else if (remainder === 20) {
      output += 'VEINTE ';
    } else if (remainder > 20 && remainder < 30) {
      output += 'VEINTI' + units[u] + ' ';
    } else {
      if (d > 0) {
        output += tens[d] + (u > 0 ? ' Y ' : ' ');
      }
      if (u > 0 && remainder >= 30) {
        output += units[u] + ' ';
      } else if (u > 0 && d === 0) {
        output += units[u] + ' ';
      }
    }

    return output.trim();
  }

  const rounded = Math.floor(Math.abs(amount));
  if (rounded === 0) return 'CERO PESOS M/CTE';

  const millions = Math.floor(rounded / 1000000);
  const thousands = Math.floor((rounded % 1000000) / 1000);
  const unitsPart = rounded % 1000;

  let result = '';

  if (millions > 0) {
    if (millions === 1) {
      result += 'UN MILLÓN ';
    } else {
      result += convertGroup(millions) + ' MILLONES ';
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'UN MIL ';
    } else {
      result += convertGroup(thousands) + ' MIL ';
    }
  }

  if (unitsPart > 0) {
    result += convertGroup(unitsPart) + ' ';
  }

  result = result.trim() + ' PESOS M/CTE';
  return result.replace(/\s+/g, ' ');
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
