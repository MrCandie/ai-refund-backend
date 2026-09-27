const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    // message: err.statusCode.toString().toLowerCase().startsWith("4")
    //   ? err.message
    //   : "Unable to complete your request at this time",
    message: err.message,
    stack: err.stack,
  });
};

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  sendErrDev(err, res);
};
