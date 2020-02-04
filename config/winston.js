const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  //TODO: find a way to insert the calling function name/lineNo
  const logStructure = `{"timestamp":"${timestamp}","level":"${level}","message":"${message}"}`;
  return logStructure;
})

const options = {
  file: {
    level: 'info',
    filename: `./logs/info.log`,
    maxsize: 5242880,
    maxFiles: 5,
    format: combine(
      //label({ label: "" }),
      timestamp(),
      myFormat,
    ),
  },
  console: {
    level: 'debug',
    format: combine(
      format.colorize(),
      //label({ label: "" }),
      timestamp(),
      myFormat,
    ),
  },
};

const logger = new createLogger({
  transports: [
    new transports.File(options.file),
  ],
  exitOnError: false,
});

// If not in production log to 'console'
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console(options.console));
}

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};

module.exports = logger;
