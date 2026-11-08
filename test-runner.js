function runBillSuite(spec) {
  const results = [];
  let failures = 0;

  function t(name, fn) {
    const tA = {
      equal: function (actual, expected, label) {
        if (actual !== expected) {
          throw new Error(
            (label || name) + " — expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual)
          );
        }
      },
      deepEqual: function (actual, expected, label) {
        const a = JSON.stringify(actual);
        const e = JSON.stringify(expected);
        if (a !== e) throw new Error((label || name) + " — expected " + e + ", got " + a);
      },
      true: function (cond, label) {
        if (cond !== true) throw new Error((label || name) + " — expected true, got " + String(cond));
      },
      ok: function (cond, label) {
        if (!cond) throw new Error((label || name) + " — expected truthy, got " + String(cond));
      },
      close: function (actual, expected, label) {
        if (Math.abs(actual - expected) > 0.005) {
          throw new Error((label || name) + " — expected ~" + expected + ", got " + actual);
        }
      },
    };
    let asserted = false;
    const wrapped = {
      equal: function (a, b, l) { asserted = true; return tA.equal(a, b, l); },
      deepEqual: function (a, b, l) { asserted = true; return tA.deepEqual(a, b, l); },
      true: function (a, l) { asserted = true; return tA.true(a, l); },
      ok: function (a, l) { asserted = true; return tA.ok(a, l); },
      close: function (a, b, l) { asserted = true; return tA.close(a, b, l); },
    };
    try {
      fn(wrapped);
      if (!asserted) throw new Error("no assertions ran");
      results.push({ name: name, pass: true, error: null });
    } catch (e) {
      results.push({ name: name, pass: false, error: e.message });
      failures++;
    }
  }

  spec.tests.forEach(function (tt) {
    t(tt.name, tt.fn);
  });
  return { results: results, failures: failures, total: spec.tests.length };
}
(function (root) {
  if (typeof module === "object" && module.exports) {
    module.exports = runBillSuite;
  } else {
    root.runBillSuite = runBillSuite;
  }
})(typeof self !== "undefined" ? self : this);
