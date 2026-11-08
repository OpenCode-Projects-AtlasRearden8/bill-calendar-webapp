"use strict";

const runBillSuite = require("./test-runner.js");
const C = require("./app.js");
const spec = require("./tests.js");

const { results, failures, total } = runBillSuite(spec);
results.forEach(function (r) {
  console.log((r.pass ? "ok  " : "FAIL") + " " + r.name + (r.error ? " — " + r.error : ""));
});
console.log("");
console.log("Tests: " + (total - failures) + "/" + total + " passed, " + failures + " failed");
process.exit(failures === 0 ? 0 : 1);
