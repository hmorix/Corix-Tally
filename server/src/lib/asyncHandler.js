// Express 4 doesn't catch rejected promises from async route handlers on
// its own — wrapping every handler in this wires uncaught errors (including
// the assertOwnsCompany() throws below) into the error-handling middleware
// in src/index.js, instead of hanging the request or crashing the process.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
