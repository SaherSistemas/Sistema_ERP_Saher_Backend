import { Semana } from "../Ofertas.interface";
import { Op, Sequelize, literal, WhereOptions } from 'sequelize';

export const DIA_A_NUMERO: Record<Semana, number> = {
  LUN: 1, MAR: 2, MIE: 3, JUE: 4, VIE: 5, SAB: 6, DOM: 7,
};

function normalizaTokenDia(raw: string): Semana | undefined {
  const t = raw
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const alias: Record<string, Semana> = {
    LUN: 'LUN', LUNES: 'LUN', MON: 'LUN', MONDAY: 'LUN',
    MAR: 'MAR', MARTES: 'MAR', TUE: 'MAR', TUESDAY: 'MAR',
    MIE: 'MIE', MIERCOLES: 'MIE', WED: 'MIE', WEDNESDAY: 'MIE',
    JUE: 'JUE', JUEVES: 'JUE', THU: 'JUE', THURSDAY: 'JUE',
    VIE: 'VIE', VIERNES: 'VIE', FRI: 'VIE', FRIDAY: 'VIE',
    SAB: 'SAB', SABADO: 'SAB', SAT: 'SAB', SATURDAY: 'SAB',
    DOM: 'DOM', DOMINGO: 'DOM', SUN: 'DOM', SUNDAY: 'DOM',
  };

  return alias[t];
}

// export function parseDiasSemana(diasSemana: string): number[] {
//   const norm = diasSemana.trim().toUpperCase().replace(/\s+/g, "");

//   if (norm === "*" || norm === "TODOS" || norm === "ALL") return [1,2,3,4,5,6,7];
//   if (norm === "LABORAL" || norm === "WEEKDAY" || norm === "SEMANA_LABORAL") return [1,2,3,4,5];

//   const parts = norm.split(",");
//   const out = new Set<number>();

//   for (const p0 of parts) {
//     if (!p0) continue;

//     if (p0.includes("-")) {
//       const [iniRaw, finRaw] = p0.split("-");
//       const aTok = normalizaTokenDia(iniRaw);
//       const bTok = normalizaTokenDia(finRaw);
//       if (!aTok || !bTok) continue;

//       let a = DIA_A_NUMERO[aTok];
//       const b = DIA_A_NUMERO[bTok];

//       out.add(a);
//       while (a !== b) {
//         a = a === 7 ? 1 : a + 1;
//         out.add(a);
//       }
//     } else {
//       const tok = normalizaTokenDia(p0);
//       if (tok) out.add(DIA_A_NUMERO[tok]);
//     }
//   }
//   return Array.from(out).sort((x, y) => x - y);
// }

export function parseDiasSemana(raw: string): number[] {
  if (!raw) return [1, 2, 3, 4, 5, 6, 7]; // todos
  return String(raw)
    .split("-")
    .map(s => s.trim().toUpperCase())
    .map(s => (
      s === "LUN" ? 1 :
        s === "MAR" ? 2 :
          s === "MIE" ? 3 :
            s === "JUE" ? 4 :
              s === "VIE" ? 5 :
                s === "SAB" ? 6 :
                  s === "DOM" ? 7 : null
    ))
    .filter(Boolean) as number[];
}


import moment from "moment-timezone";

export function obtenerDiaSemanaISO(fecha: Date, tz: string): number {
  return Number(moment.tz(fecha, tz).format("E")); // 1=Lun ... 7=Dom
}



export function getLocalTimeInTz(date: Date, tz = "America/Mazatlan"): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function getLocalDateInTz(date: Date, tz = "America/Mazatlan"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
