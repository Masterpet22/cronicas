import { BIRTHDAY_MONTHS, normalizeBirthday } from "../birthday.js?v=0.127.0";

export const BIRTH_MONTH_KANJI = Object.freeze(["一","二","三","四","五","六","七","八","九","十","十一","十二"]);

export function characterResonanceSymbol(character) {
  const birthday = normalizeBirthday(character?.birthday);
  return birthday
    ? { symbol:BIRTH_MONTH_KANJI[birthday.month-1],month:birthday.month,label:`${BIRTHDAY_MONTHS[birthday.month-1]} · ${BIRTH_MONTH_KANJI[birthday.month-1]}` }
    : { symbol:"☯",month:null,label:"Yin yang · Sin fecha de nacimiento" };
}
