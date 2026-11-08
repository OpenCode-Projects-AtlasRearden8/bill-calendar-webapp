"use strict";

const C = require("./app.js");

function makeElement(tag) {
  const obj = {
    tag: tag,
    className: "",
    classNameBase: "",
    textContent: "",
    innerHTML: "",
    children: [],
    listeners: {},
    appendChild(child) {
      if (!child.classNameBase) child.classNameBase = child.className;
      obj.children.push(child);
      return child;
    },
    cloneNode() {
      const clone = makeElement(obj.tag);
      clone.className = obj.className;
      clone.textContent = obj.textContent;
      return clone;
    },
    addEventListener(type, fn) {
      (obj.listeners[type] = obj.listeners[type] || []).push(fn);
    },
  };
  let storedHtml = "";
  Object.defineProperty(obj, "innerHTML", {
    get: function () { return storedHtml; },
    set: function (v) {
      storedHtml = String(v);
      if (storedHtml === "") obj.children.length = 0;
    },
  });
  obj.classList = {
    add(c) {
      if (obj.className.split(/\s+/).indexOf(c) === -1) obj.className = (obj.className + " " + c).trim();
    },
    remove(c) {
      obj.className = obj.className.split(/\s+/).filter(function (x) { return x !== c; }).join(" ");
    },
    contains(c) {
      return obj.className.split(/\s+/).indexOf(c) !== -1;
    },
  };
  return obj;
}

const elements = {};
["month-label", "print-title", "print-source", "month-total", "print-total", "this-week", "print-this-week", "calendar", "bill-count", "csv-file", "drop", "btn-sample", "btn-prev", "btn-next", "btn-today", "btn-print"].forEach(function (id) {
  elements[id] = makeElement("div#" + id);
});

global.document = {
  getElementById(id) {
    if (!elements[id]) elements[id] = makeElement("#" + id);
    return elements[id];
  },
  createElement(tag) {
    return makeElement(tag);
  },
  createTextNode(text) {
    return { tag: "#text", textContent: text, className: "" };
  },
};
global.window = global;
global.window.BillCal = C;

require("./ui.js");
const ui = global.window.BillApp;

let failures = 0;
function check(label, cond) {
  if (!cond) {
    failures++;
    console.log("FAIL " + label);
  } else {
    console.log("ok   " + label);
  }
}

function dayCells() {
  const out = [];
  (function walk(node) {
    (node.children || []).forEach(function (n) {
      if (typeof n.className === "string" && n.className.indexOf("cal-day") !== -1) out.push(n);
      walk(n);
    });
  })(elements.calendar);
  return out;
}
function dowCells() {
  const out = [];
  (function walk(node) {
    (node.children || []).forEach(function (n) {
      if (typeof n.className === "string" && n.className.indexOf("cal-dow") !== -1) out.push(n);
      walk(n);
    });
  })(elements.calendar);
  return out;
}

ui.init();

check("month label renders", elements["month-label"].textContent.length > 0);
check("print title renders", elements["print-title"].textContent.indexOf("Money Calendar") !== -1);
check("7 day-of-week headers", dowCells().length === 7);
check("42 day cells (6 weeks)", dayCells().length === 42);
check("sample bills loaded", ui.state.bills.length === 8);
check("month total has dollar sign", elements["month-total"].textContent.indexOf("$") !== -1);
check("cal-day carries .bill chips", dayCells().some(function (c) { return c.children.some(function (b) { return b.className.indexOf("bill") !== -1; }); }));
check("autopay chip styled", dayCells().some(function (c) { return c.children.some(function (b) { return b.className.indexOf("auto") !== -1; }); }));

ui.loadText("name,amount,dueDay,autopay\nCoffee,3.50,10,no", "tiny.csv");
check("loadText replaces bills", ui.state.bills.length === 1 && ui.state.bills[0].name === "Coffee");
check("file name shown in print source", elements["print-source"].textContent.indexOf("tiny.csv") !== -1);
check("bill count updates", elements["bill-count"].textContent.indexOf("1 bill") !== -1);

ui.loadText("", "");
check("empty csv -> no bills, hint shown", ui.state.bills.length === 0 && elements["bill-count"].textContent.indexOf("No bills") !== -1);

const before = ui.state.year + "|" + ui.state.month;
elements["btn-next"].listeners.click[0]();
const afterNext = ui.state.year + "|" + ui.state.month;
elements["btn-prev"].listeners.click[0]();
check("prev/next change month", afterNext !== before && ui.state.year + "|" + ui.state.month === before);

ui.loadText("name,amount,dueDay,autopay\nRent,1600,1,yes\nInsurance,129.61,16,no", "smoke.csv");
elements["btn-today"].listeners.click[0]();
check("today cell flagged after Today click", dayCells().filter(function (c) { return c.classList.contains("today"); }).length === 1);
check("current week highlighted (7 cells)", dayCells().filter(function (c) { return c.classList.contains("this-week"); }).length === 7);
check("no leftover render duplicates", dayCells().length === 42);

ui.loadText("name,amount,dueDay,autopay\nX,1,35,yes\nY,2,3,yes", "edge.csv");
check("invalid dueDay skipped in UI", ui.state.bills.length === 1);
check("loaded bills replaced grid", ui.state.bills[0].name === "Y");

const tip = elements["this-week"].children[0];
check("this-week pane renders text or empty note", !!tip);

console.log("");
console.log("Smoke: " + (failures === 0 ? "ALL PASSED" : failures + " FAILED"));
process.exit(failures === 0 ? 0 : 1);
