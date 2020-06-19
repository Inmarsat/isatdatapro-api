/**
 * Custom Winston logger producing JSON format
 * {UTC timestamp, level, message, <meta>}
 * 
 */
'use strict';

const { createLogger, format, transports, config } = require('winston');
const { combine, timestamp, colorize, printf } = format;

/**
 * Generates the custom JSON formatting
 * @param {object} info Logger object parameters and metadata
 * @returns {string} formatted log entry
 */
const customFormat = printf(info => {
  const expectedTags = [
    'timestamp',
    'level',
    'message',
  ];
  let formatString = `` +
    `"timestamp":"${info.timestamp}",` +
    `"level":"${info.level}",` +
    `"message":"${info.message}"`;
  for (let k in info) {
    if (info.hasOwnProperty(k) && !expectedTags.includes(k)) {
      formatString += ',' + `"${k}":"${info[k]}"`;
    }
  }
  return '{' + formatString + '}';
});

//: Logger configuration for different outputs
const options = {
  file: {
    level: 'info',
    filename: `./logs/info.log`,
    handleException: true,
    humanReadableUnhandledException: true,
    maxsize: 5242880,
    maxFiles: 5,
    format: combine(
      timestamp(),
      customFormat,
    ),
  },
  console: {
    level: 'debug',
    format: combine(
      timestamp(),
      colorize(),
      customFormat,
    ),
  },
};

/**
 * Instantiates the logger object with default file output
 * TODO: test exception handling cases
 */
const logger = createLogger({
  defaultMeta: { component: 'isatdatapro-api' },
  transports: [
    new transports.File(options.file)
  ],
  /* Log exceptions to file
  exceptionHandlers: [
    new transports.File(options.file)
  ]
  //*/
});

//: Log to console when not in production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console(options.console));
}

//: Stream output to the log file
logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};

/**
 * Returns the short name of the module
 * @param {string} filename The file/path name of the module
 * @returns {string}
 */
const getModuleName = (caller) => {
  const modulePathParts = caller.split('/');
  const moduleName = modulePathParts[modulePathParts.length - 1];
  return moduleName;  
}

/**
 * Registers a calling module name for the logger as metadata.
 * @param {string} caller The module name invoking the log
 */
const loggerProxy = (caller) => {
  const callerMeta = { module: `${getModuleName(caller)}`};
  const getMeta = (meta) => {
    if (meta instanceof Object && meta !== null) {
      return Object.assign(callerMeta, meta);
    }
    return callerMeta;
  }
  const proxy = {
    error: (msg, meta) => {
      logger.error(msg, getMeta(meta));
    },
    warn: (msg, meta) => {
      logger.warn(msg, getMeta(meta));
    },
    info: (msg, meta) => {
      logger.info(msg, getMeta(meta));
    },
    verbose: (msg, meta) => {
      logger.verbose(msg, getMeta(meta));
    },
    debug: (msg, meta) => {
      logger.debug(msg, getMeta(meta));
    },
    silly: (msg, meta) => {
      logger.silly(msg, getMeta(meta));
    },
    getModuleName: (caller) => {
      return getModuleName(caller);
    }
  };
  return proxy;
}

module.exports = { logger, loggerProxy };

/* QUICK LOCAL TEST - COMMENT THIS LINE TO RUN
const testPathName = '/various/path/parts/myFuncName.js';
let l = loggerProxy(testPathName);
l.warn('test message', {testMeta: "myTestMeta"});
console.log('Module: ' + l.getModuleName(testPathName));
//*/