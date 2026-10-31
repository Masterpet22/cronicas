export function normalizeBirthday(value) {
  if (!value || !Number.isInteger(Number(value.month)) || !Number.isInteger(Number(value.day))) return null;
  const month = Number(value.month), day = Number(value.day);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(2000, month, 0)).getUTCDate() ? { month, day } : null;
}
export const BIRTHDAY_MONTHS = Object.freeze(["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]);
