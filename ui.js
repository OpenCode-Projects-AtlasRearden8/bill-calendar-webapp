(function () {
  "use strict";

  const state = {
    bills: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    fileName: "",
  };

  const SampleCsv = [
    "name,amount,dueDay,autopay",
    "Rent,1600,1,yes",
    "Car Insurance,129.61,7,no",
    "Streaming,11.99,12,autopay",
    "Electricity,142.37,15,no",
    "Internet,79.99,20,yes",
    "Phone,55.00,24,no",
    "Credit Card,220,26,no",
    "Water/Trash,46.80,30,no",
  ].join("\n");

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function today() {
    return new Date();
  }

  function labelForPrint() {
    if (state.fileName) return state.fileName;
    return "sample-bills";
  }

  function render() {
    const C = window.BillCal;
    const ref = today();
    const monthName = C.MONTH_NAMES[state.month] + " " + state.year;
    $("month-label").textContent = monthName;
    $("print-title").textContent = "Money Calendar — " + monthName;
    $("print-source").textContent = "Bills source: " + labelForPrint();

    const bills = C.monthBills(state.bills, state.year, state.month);
    const total = C.monthTotal(state.bills, state.year, state.month);
    const manualTotal = bills.reduce(function (s, b) {
      return s + (b.autopay ? 0 : b.amount);
    }, 0);
    $("month-total").textContent = C.formatMoney(total) + " total · " + C.formatMoney(manualTotal) + " to pay by hand";
    $("print-total").textContent = C.formatMoney(total) + " total due · " + C.formatMoney(manualTotal) + " manual";

    const inWeek =
      ref.getFullYear() === state.year && ref.getMonth() === state.month
        ? C.thisWeeksBills(state.bills, state.year, state.month, ref)
        : [];
    renderThisWeek(inWeek);
    renderGrid(ref);

    const count = state.bills.length;
    $("bill-count").textContent = count === 0
      ? "No bills loaded — pick a CSV or load the sample."
      : count + " bill" + (count === 1 ? "" : "s") + " loaded.";
  }

  function renderThisWeek(list) {
    const C = window.BillCal;
    const box = $("this-week");
    const printBox = $("print-this-week");
    box.innerHTML = "";
    printBox.innerHTML = "";
    if (list.length === 0) {
      const empty = el("p", "week-empty", "Nothing due by hand this week — you're set.");
      box.appendChild(empty);
      printBox.appendChild(empty.cloneNode(true));
      return;
    }
    list.forEach(function (b) {
      const row = el("span", "week-item");
      row.appendChild(el("strong", null, b.name));
      row.appendChild(document.createTextNode(" — " + C.formatMoney(b.amount) + " due " + DAY(b.date)));
      if (b.autopay) row.appendChild(el("em", "tag", "autopay"));
      box.appendChild(row);
    });
    list.forEach(function (b) {
      const row = el("span", "week-item");
      row.appendChild(el("strong", null, b.name + " " + C.formatMoney(b.amount)));
      printBox.appendChild(row);
    });
  }

  function DAY(d) {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return names[d.getDay()] + " " + d.getDate();
  }

  function renderGrid(ref) {
    const C = window.BillCal;
    const grid = $("calendar");
    grid.innerHTML = "";
    const showThisWeek = ref.getFullYear() === state.year && ref.getMonth() === state.month;
    const headerRow = grid.appendChild(el("div", "cal-head cal-row"));
    C.DAY_NAMES.forEach(function (n) {
      headerRow.appendChild(el("div", "cal-dow", n));
    });
    const weeks = C.buildMonth(state.year, state.month, state.bills, showThisWeek ? ref : null);
    weeks.forEach(function (week) {
      const row = grid.appendChild(el("div", "cal-row"));
      week.forEach(function (cell) {
        const day = el("div", "cal-day" + (cell.inMonth ? "" : " out") + (cell.isToday ? " today" : "") + (showThisWeek && cell.isThisWeek && cell.inMonth ? " this-week" : ""));
        day.appendChild(el("span", "cal-num", String(cell.date.getDate())));
        cell.bills.forEach(function (b) {
          const bEl = el("span", "bill" + (b.autopay ? " auto" : ""));
          bEl.appendChild(el("span", "bill-name", b.name + (b.autopay ? " ✔" : "")));
          bEl.appendChild(el("span", "bill-amt", C.formatMoney(b.amount)));
          day.appendChild(bEl);
        });
        row.appendChild(day);
      });
    });
  }

  function go(delta) {
    let m = state.month + delta;
    if (m < 0) { m = 11; state.year--; }
    if (m > 11) { m = 0; state.year++; }
    state.month = m;
    render();
  }

  function loadText(text, fileName) {
    state.bills = window.BillCal.parseCsv(text);
    state.fileName = fileName || "";
    render();
  }

  function init() {
    const picker = $("csv-file");
    picker.addEventListener("change", function () {
      const file = picker.files && picker.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        loadText(String(reader.result), file.name);
      };
      reader.readAsText(file);
    });
    const drop = $("drop");
    ["dragover", "dragenter"].forEach(function (evt) {
      drop.addEventListener(evt, function (e) {
        e.preventDefault();
        drop.classList.add("over");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      drop.addEventListener(evt, function () {
        drop.classList.remove("over");
      });
    });
    drop.addEventListener("drop", function (e) {
      e.preventDefault();
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        loadText(String(reader.result), file.name);
      };
      reader.readAsText(file);
    });
    $("btn-sample").addEventListener("click", function () {
      loadText(SampleCsv, "sample-bills.csv");
    });
    $("btn-prev").addEventListener("click", function () { go(-1); });
    $("btn-next").addEventListener("click", function () { go(1); });
    $("btn-today").addEventListener("click", function () {
      const t = new Date();
      state.year = t.getFullYear();
      state.month = t.getMonth();
      render();
    });
    $("btn-print").addEventListener("click", function () { window.print(); });
    loadText(SampleCsv, "sample-bills.csv");
  }

  window.BillApp = { init: init, render: render, loadText: loadText, state: state };
})();
