# kit

Copied from the anatomy skill (github.com/wheresryan22/anatomy @bc943e4, MIT, see LICENSE).

Local change: `iso-kit.mjs` rounds path coordinates to 0.01 instead of 0.1 (`tenth`), because the film zooms 10–20× into small parts and 0.1-unit steps show as jaggies.

Local change: `audit.mjs` `box()` accepts its two corners in any order (the film's phone frame runs u along −y).
