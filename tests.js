(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./app.js"));
  } else {
    root.BillTests = factory(window.BillCal);
  }
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  const tests = [];

  function test(name, fn) {
    tests.push({ name: name, fn: fn });
  }

  const SAMPLE = [
    "name,amount,dueDay,autopay",
    'Rent,"1600.00",1,yes',
    "Electricity,$142.37,15,no",
    "Internet,79.99,20,true",
    "Phone,55,24,0",
    'Gym,"1,299.00",31,ON',
  ].join("\n");

  const BAD = [
    "name,amount,dueDay,autopay",
    ",10,5,no",
    "X,notmoney,5,no",
    "Y,10,notanumber,no",
    "Z,10,99,no",
    "W,10,,no",
    "Good,10,5,1",
  ].join("\n");

  const QUOTES =
    'name,amount,dueDay,autopay\n"Bill, Jr",50,10,yes\n"Say """"Hi"""" to plumbing","200",12,x';

  test("parseCsv reads name, amount, dueDay, autopay", function (t) {
    const bills = C.parseCsv(SAMPLE);
    t.equal(bills.length, 5, "row count");
    t.deepEqual(bills[0], { name: "Rent", amount: 1600, dueDay: 1, autopay: true });
    t.equal(bills[1].autopay, false, "Electricity not on autopay");
    t.equal(bills[2].amount, 79.99);
    t.equal(bills[3].autopay, false, "0 means no");
    t.equal(bills[4].autopay, true, "ON means yes");
    t.equal(bills[4].amount, 1299, "dollars and commas stripped");
  });

  test("parseCsv handles quoted fields with commas", function (t) {
    const bills = C.parseCsv(QUOTES);
    t.equal(bills.length, 2);
    t.equal(bills[0].name, "Bill, Jr");
    t.equal(bills[1].name, 'Say ""Hi"" to plumbing');
    t.equal(bills[1].amount, 200);
  });

  test("parseCsv skips bad rows but keeps good ones", function (t) {
    const bills = C.parseCsv(BAD);
    t.equal(bills.length, 1);
    t.equal(bills[0].name, "Good");
    t.equal(bills[0].amount, 10);
  });

  test("parseCsv is tolerant of blank input and empty file", function (t) {
    t.deepEqual(C.parseCsv(""), []);
    t.deepEqual(C.parseCsv(null), []);
    t.deepEqual(C.parseCsv("\n\n"), []);
  });

  test("monthBills maps each bill into the month and sorts by due date", function (t) {
    const bills = C.parseCsv(SAMPLE);
    const list = C.monthBills(bills, 2026, 0);
    t.equal(list.length, 5);
    t.equal(list[0].name, "Rent");
    t.deepEqual(
      list.map(function (b) { return b.dueDay; }),
      [1, 15, 20, 24, 31]
    );
    t.deepEqual(
      list.map(function (b) { return b.date.getDate(); }),
      [1, 15, 20, 24, 31]
    );
    t.deepEqual(
      list.map(function (b) { return b.date.getMonth(); }),
      [0, 0, 0, 0, 0]
    );
  });

  test("due day clamps to last day of short months", function (t) {
    t.equal(C.effectiveDueDay(31, 2026, 1), C.daysInMonth(2026, 1));
    t.equal(C.effectiveDueDay(31, 2026, 1), 28);
    t.equal(C.effectiveDueDay(30, 2024, 1), C.daysInMonth(2024, 1));
    t.equal(C.effectiveDueDay(30, 2024, 1), 29);
    const bills = C.parseCsv(SAMPLE);
    const feb = C.monthBills(bills, 2026, 1);
    t.deepEqual(
      feb.map(function (b) { return b.date.getDate(); }),
      [1, 15, 20, 24, 28]
    );
  });

  test("isDueInWeek matches the Sunday-to-Saturday window", function (t) {
    const friday = new Date(2026, 0, 16);
    const sun = new Date(2026, 0, 11);
    const sat = new Date(2026, 0, 17);
    t.deepEqual(C.weekWindow(friday), { start: sun, end: sat });
    t.equal(C.isDueInWeek(new Date(2026, 0, 15), friday), true);
    t.equal(C.isDueInWeek(sun, friday), true);
    t.equal(C.isDueInWeek(sat, friday), true);
    t.equal(C.isDueInWeek(new Date(2026, 0, 10), friday), false);
    t.equal(C.isDueInWeek(new Date(2026, 0, 18), friday), false);
  });

  test("thisWeeksBills filters to manual (non-autopay) bills in the week", function (t) {
    const bills = C.parseCsv(SAMPLE);
    const manual = C.thisWeeksBills(bills, 2026, 0, new Date(2026, 0, 16));
    t.deepEqual(
      manual.map(function (b) { return b.name; }),
      ["Electricity"]
    );
    t.deepEqual(
      C.thisWeeksBills(bills, 2026, 1, new Date(2026, 1, 25)).map(function (b) {
        return b.name;
      }),
      ["Phone"]
    );
  });

  test("monthTotal sums all bills for the month", function (t) {
    const bills = C.parseCsv(SAMPLE);
    const total = C.monthTotal(bills, 2026, 0);
    t.close(total, 1600 + 142.37 + 79.99 + 55 + 1299);
  });

  test("formatMoney adds commas and two decimals", function (t) {
    t.equal(C.formatMoney(0), "$0.00");
    t.equal(C.formatMoney(9.5), "$9.50");
    t.equal(C.formatMoney(1234.5), "$1,234.50");
    t.equal(C.formatMoney(1000000), "$1,000,000.00");
    t.equal(C.formatMoney(-42), "-$42.00");
    t.equal(C.formatMoney(NaN), "—");
  });

  test("buildMonth produces 6 seven-day rows starting on Sunday", function (t) {
    const weeks = C.buildMonth(2026, 0, C.parseCsv(SAMPLE), new Date(2026, 0, 16));
    t.equal(weeks.length, 6);
    weeks.forEach(function (w) {
      t.equal(w.length, 7);
      w.forEach(function (cell) {
        t.ok(cell.date instanceof Date);
      });
      t.equal(w[0].date.getDay(), 0);
    });
    t.equal(weeks[0][0].date.getTime(), new Date(2025, 11, 28).getTime());
    t.equal(weeks[5][6].date.getTime(), new Date(2026, 1, 7).getTime());
    t.equal(weeks[2][4].bills.length, 1, "Jan 15 grid has Electricity");
    t.equal(weeks[2][4].bills[0].amount, 142.37);
  });

  test("buildMonth flags today and this week only when given a ref date", function (t) {
    const bits = C.buildMonth(2026, 0, [], new Date(2026, 0, 16));
    let flagged = [];
    bits.forEach(function (w, wi) {
      w.forEach(function (cell, ci) {
        if (cell.isToday) flagged.push([wi, ci]);
      });
    });
    t.deepEqual(flagged, [[2, 5]], "Jan 16 2026 is a Friday in week 3");
    const weekCells = [];
    bits.forEach(function (w, wi) {
      w.forEach(function (cell) {
        if (cell.isThisWeek) weekCells.push(wi);
      });
    });
    t.equal(weekCells.length, 7);
    const noRef = C.buildMonth(2026, 0, [], null);
    let none = true;
    noRef.forEach(function (w) {
      w.forEach(function (cell) {
        if (cell.isToday || cell.isThisWeek) none = false;
      });
    });
    t.ok(none, "no today/week flags without a ref date");
  });

  test("out-of-month grid cells carry no bills", function (t) {
    const weeks = C.buildMonth(2026, 0, C.parseCsv(SAMPLE), null);
    let outside = 0;
    weeks.forEach(function (w) {
      w.forEach(function (cell) {
        if (!cell.inMonth) {
          outside++;
          t.equal(cell.bills.length, 0, "trailing day stays empty");
        }
      });
    });
    t.ok(outside >= 11, "grid has trailing/leading cells");
  });

  test("normalizeFlag accepts the yes-style set and rejects no-style", function (t) {
    ["yes", "YES", "y", "true", "TRUE", "1", "x", "on", "autopay", "auto"].forEach(function (v) {
      t.equal(C.normalizeFlag(v), true, v + " is truthy");
    });
    ["no", "N", "false", "0", "", "maybe", null, undefined].forEach(function (v) {
      t.equal(C.normalizeFlag(v), false, String(v) + " is falsy");
    });
  });

  test("parseAmount strips $ and commas, rejects non-numbers", function (t) {
    t.equal(C.parseAmount("$1,234.56"), 1234.56);
    t.equal(C.parseAmount("  12 "), 12);
    t.true(isNaN(C.parseAmount("abc")));
    t.true(isNaN(C.parseAmount("")));
  });

  return { tests: tests };
});
