(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BillCal = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function splitCsvLine(line) {
    const fields = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(field);
        field = "";
      } else {
        field += ch;
      }
    }
    fields.push(field);
    return fields.map(function (f) {
      return f.trim();
    });
  }

  function parseAmount(raw) {
    if (raw === null || raw === undefined) return NaN;
    const cleaned = String(raw).replace(/[$,\s]/g, "");
    if (cleaned === "") return NaN;
    const value = Number(cleaned);
    return value;
  }

  function normalizeFlag(raw) {
    const value = String(raw == null ? "" : raw).trim().toLowerCase();
    return ["true", "yes", "y", "1", "x", "auto", "autopay", "on"].indexOf(value) !== -1;
  }

  function parseCsv(text) {
    if (typeof text !== "string") return [];
    const lines = text.split(/\r?\n/).filter(function (l) {
      return l.trim() !== "";
    });
    if (lines.length === 0) return [];
    const header = splitCsvLine(lines[0]).map(function (h) {
      return h.toLowerCase().replace(/[^a-z_]/g, "_");
    });
    const idx = {
      name: header.indexOf("name"),
      amount: header.indexOf("amount"),
      dueDay: header.findIndex(function (h) {
        return h === "due_day" || h === "dueday" || h === "due";
      }),
      autopay: header.indexOf("autopay"),
    };
    const bills = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      const name = idx.name !== -1 ? cols[idx.name] : cols[0];
      if (!name) continue;
      const amount = parseAmount(idx.amount !== -1 ? cols[idx.amount] : cols[1]);
      const dueDayRaw = idx.dueDay !== -1 ? cols[idx.dueDay] : cols[2];
      const dueDay = Number(String(dueDayRaw).replace(/[^0-9]/g, ""));
      const autopay = idx.autopay !== -1 ? normalizeFlag(cols[idx.autopay]) : false;
      if (!isFinite(amount) || !isFinite(dueDay) || dueDay < 1 || dueDay > 31) continue;
      bills.push({ name: name, amount: amount, dueDay: dueDay, autopay: autopay });
    }
    return bills;
  }

  function daysInMonth(year, monthIdx) {
    return new Date(year, monthIdx + 1, 0).getDate();
  }

  function effectiveDueDay(dueDay, year, monthIdx) {
    return Math.min(dueDay, daysInMonth(year, monthIdx));
  }

  function monthBills(bills, year, monthIdx) {
    const out = [];
    for (let i = 0; i < bills.length; i++) {
      const b = bills[i];
      if (b.dueDay >= 1 && b.dueDay <= 31) {
        out.push({
          name: b.name,
          amount: b.amount,
          dueDay: b.dueDay,
          autopay: !!b.autopay,
          date: new Date(year, monthIdx, effectiveDueDay(b.dueDay, year, monthIdx)),
        });
      }
    }
    out.sort(function (a, b) {
      return a.date - b.date;
    });
    return out;
  }

  function startOfWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function weekWindow(refDate) {
    const start = startOfWeek(refDate);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start: start, end: end };
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isDueInWeek(dueDate, refDate) {
    const w = weekWindow(refDate);
    return dueDate >= w.start && dueDate <= w.end;
  }

  function thisWeeksBills(bills, year, monthIdx, refDate) {
    return monthBills(bills, year, monthIdx).filter(function (b) {
      return isDueInWeek(b.date, refDate) && !b.autopay;
    });
  }

  function buildMonth(year, monthIdx, bills, refDate) {
    bills = bills || [];
    refDate = refDate || null;
    const first = new Date(year, monthIdx, 1);
    const gridStart = startOfWeek(first);
    const totalDays = 42;
    const weeks = [];
    let currentWeek = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const inMonth = d.getMonth() === monthIdx;
      const dayBills = inMonth
        ? monthBills(bills, d.getFullYear(), d.getMonth()).filter(function (b) {
            return b.date.getDate() === d.getDate();
          })
        : [];
      const cell = {
        date: d,
        inMonth: inMonth,
        isToday: refDate ? sameDay(d, refDate) : false,
        isThisWeek: refDate ? isDueInWeek(d, refDate) : false,
        bills: dayBills,
      };
      currentWeek.push(cell);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    return weeks;
  }

  function formatMoney(value) {
    if (!isFinite(value)) return "—";
    const sign = value < 0 ? "-" : "";
    const fixed = Math.abs(value).toFixed(2);
    const parts = fixed.split(".");
    const withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + withCommas + "." + parts[1];
  }

  function monthTotal(bills, year, monthIdx) {
    return monthBills(bills, year, monthIdx).reduce(function (sum, b) {
      return sum + b.amount;
    }, 0);
  }

  return {
    DAY_NAMES: DAY_NAMES,
    MONTH_NAMES: MONTH_NAMES,
    parseCsv: parseCsv,
    parseAmount: parseAmount,
    normalizeFlag: normalizeFlag,
    daysInMonth: daysInMonth,
    effectiveDueDay: effectiveDueDay,
    monthBills: monthBills,
    startOfWeek: startOfWeek,
    weekWindow: weekWindow,
    isDueInWeek: isDueInWeek,
    thisWeeksBills: thisWeeksBills,
    buildMonth: buildMonth,
    formatMoney: formatMoney,
    monthTotal: monthTotal,
  };
});

if (typeof document !== "undefined" && typeof module !== "object") {
  window.addEventListener("DOMContentLoaded", function () {
    if (window.BillApp) window.BillApp.init();
  });
}
