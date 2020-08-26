/**
 * IsatData Pro API V1
 * @module isatdatapro-api
 */

'use strict';

const request = require('request');
const winston = require('../config/winston');
const templates = require('./apiRemapTemplates');
let apiUrl = 'https://api.inmarsat.com/v1/idp/gateway/rest/';

/**
 * Logs using winston configured in ./config/winston
 * @ignore
 */
const logger = winston.logger;

/**
 * An authentication pair for the IDP Messaging API V1, used for various operations
 * @typedef {Object} ApiV1Auth
 * @property {string} accessId The mailbox unique access_id
 * @property {string} password The mailbox password
 */

/**
 * Returns a URI for an authenticated (GET) operation on the IDP API V1.  Replaces spaces with %20.
 * @private
 * @param {string} baseUri The API operation e.g. get_return_messages
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {Object} filters Various parameters specific to the GET operation
 * @returns {string} a URI including formatted authentication and query parameters
 */
function getUri_(baseUri, auth, filters) {
  let uri = baseUri + '?access_id=' + auth.accessId + '&password=' + auth.password;
  for (let f in filters) {
    if (filters.hasOwnProperty(f)) {
      uri += '&' + f + '=' + String(filters[f]);
    }
  }
  uri = uri.replace(/ /g, '%20').trim();
  return uri;
}

/**
 * Obfuscates the authentication credentials (accesssId, password) from the (GET) URI query string for log security
 * TODO: support for password obfuscation on all operations e.g. POST body, not keyed with '='
 * @private
 * @param {string} debugMessage The message with password readable
 * @returns {string} Debug message with password obfuscated for logging
 */
function obfuscateLog_(debugMessage) {
  if (debugMessage.indexOf('password=') !== -1
      || debugMessage.indexOf('access_id=') !== -1) {
    const obscure = '***';
    const messageComponents = debugMessage.split(/[?&]/);
    let replaceMessage = messageComponents[0];
    for (let c = 1; c < messageComponents.length; c++) {
      if (messageComponents[c].split('=')[0] === 'password') {
        messageComponents[c] = '&password=' + obscure;
      } else if (messageComponents[c].split('=')[0] === 'access_id') {
        messageComponents[c] = '?access_id=' + obscure;
      } else {
        replaceMessage += '&';
      }
      replaceMessage += messageComponents[c];
    }
    return replaceMessage;
  } else {
    return debugMessage;
  }
}

/**
 * Returns the reason for HTTP request failure
 * @private
 * @param {Object} err Error object from request, or null
 * @param {Object} resp HTTP error status code or null
 * @param {string} uri The URI target
 * @returns {string} reason
 */
function handleRequestError_(err, resp, uri) {
  let reason = '';
  if (err) {
    if (err.code === 'ETIMEDOUT') {
      reason += err.connect ? 'TIMEOUT_CONNECT' : 'TIMEOUT_READ';
    } else {
      reason += (JSON.stringify(err.code)).replace(/"/g, '');
    }
  } else if (resp) {
    reason += 'HTTP ' + resp.statusCode;
  } else {
    throw new Error('err and resp not specified');
  }
  if (uri) { reason += ': ' + obfuscateLog_(uri) }
  logger.error(reason);
  return reason;
}

/**
 * Allows overriding the default URL with a string beginning http
 * @private
 * @param {Object[]} args An array of undocumented arguments including a string
 */
function overrideUrl_(args) {
  for (let a=0; a < args.length; a++) {
    if ((typeof(args[a]) == 'string') && args[a].startsWith('http')) {
      return args[a];
    }
  }
  return apiUrl;
}

/**
 * Returns the Message Gateway System software version details
 * @returns {Promise<string>} IDP Message Gateway System software version
 */
async function getIdpVersion() {
  apiUrl = overrideUrl_(arguments);
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + 'info_version.json/',
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        logger.debug(options.uri + ' returned ' + result);
        resolve(result);
      }
    });
  });
  const mgsVersion = await promise;
  return mgsVersion;
}

/**
 * Returns an IDP message gateway formatted timestamp from an ISO string,
 * truncated to seconds
 * @private
 * @param {string} isoString 
 */
function isoToIdpTime_(isoString) {
  if (typeof(isoString) === 'string' && isoString[isoString.length - 1] === 'Z') {
    const parts = isoString.split('T');
    if (parts.length === 2 && parts[0].length === 10 && parts[1].length >= 9) {
      let [ cYear, cMonth, cDay ] = parts[0].split('-');
      if (Number(cYear) >= 1970 
          && (Number(cMonth) > 0 && Number(cMonth) < 13)) {
        switch(Number(cMonth)) {
          case 2:
            if (Number(cDay) < 1 || Number(cDay) > 29) return false;
            break;
          case 4:
          case 6:
          case 9:
          case 11:
            if (Number(cDay) < 1 || Number(cDay) > 30) return false;
            break;
          default:
            if (Number(cDay) < 1 || Number(cDay) > 31) return false;
        }
      }
      let [ cHour, cMinute, cCompSecond ] = parts[1].split(':');
      if ((Number(cHour) >= 0 && Number(cHour) < 24)
          && (Number(cMinute) >= 0 && Number(cMinute) < 60)){
        let [ cSecond, cMs ] = cCompSecond.split('Z')[0].split('.');
        if (Number(cSecond) >= 0 && Number(cSecond) < 60) {
          return parts[0] + ' ' + cHour + ':' + cMinute + ':' + cSecond;
        }
      }
    }
  }
  return false;  
}

/**
 * Returns an IDP message gateway formatted timestamp, defaults to 1970-01-01 00:00:00
 * @param {Object} date A Javascript Date object
 * @returns {string} An IDP message gateway formatted timestamp 'YYYY-MM-DD hh:mm:ss'
 */
function dateToIdpTime(date) {
  let idpTime = '1970-01-01 00:00:00';
  //TODO: allow for ISO string conversion
  if (!isNaN(date) && date instanceof Date) {
    idpTime = date.toISOString().split('.')[0].replace('T', ' ');
  } else if (isoToIdpTime_(date)) {
    idpTime = isoToIdpTime_(date);
  } else {
    logger.warn(`${date} is not an instance of Date - returning ${idpTime}`);
  }
  if (!validateIdpTimeFormat_(idpTime)) {
    throw new Error('Unexpected date conversion error');
  }
  return idpTime;
}

/**
 * Returns true if the timestamp is IDP format
 * @private
 * @param {string} timestamp A candidate IDP message gateway formatted timestamp 'YYYY-MM-DD hh:mm:ss'
 * @returns {boolean}
 */
function validateIdpTimeFormat_(timestamp) {
  let valid = false;
  if (typeof(timestamp) === 'string' && timestamp.length === 19) {
    const timestampParts = timestamp.split(' ');
    const dateParts = timestampParts[0].split('-');
    const timeParts = timestampParts[1].split(':');
    if (dateParts.length === 3 && timeParts.length === 3) {
      const year = Number(dateParts[0]);
      const month = Number(dateParts[1]);
      const day = Number(dateParts[2]);
      const hour = Number(timeParts[0]);
      const minute = Number(timeParts[1]);
      const second = Number(timeParts[2]);
      if (1970 <= year <= 9999 && 1 <= month <= 12 && 1 <= day <= 31 
          && 0 <= hour <= 23 && 0 <= minute <= 59 && 0 <= second <= 59) {
        //TODO: validate day of month including leap year etc.
        valid = true;
      }
  
    }
  }
  return valid;
}

/**
 * Returns a Javascript Date object by converting an IDP message gateway formatted timestamp
 * @param {string} idpTimeUtc An IDP message gateway formatted timestamp 'YYYY-MM-DD hh:mm:ss'
 * @returns {Date} Javascript Date object
 * @throws {Error} If the passed in value is not a valid IDP datestamp
 */
function idpTimeToDate(idpTimeUtc) {
  if (validateIdpTimeFormat_(idpTimeUtc)) {
    let isoTime = idpTimeUtc.replace(' ', 'T') + 'Z';
    return new Date(isoTime);
  } else {
    throw new Error('Value must be a valid IDP datestamp yyyy-mm-dd HH:MM:SS');
  }
}

/**
 * Returns current UTC time at the MGS
 * @returns {Promise<Date>} UTC time at the message gateway
 */
async function getIdpTime() {
  apiUrl = overrideUrl_(arguments);
  const promise = new Promise(function (resolve, reject) {
    const options = {
      uri: apiUrl + 'info_utc_time.json/',
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        logger.debug(options.uri + ' returned ' + result);
        resolve(result);
      }
    });
  });
  const idpTimeUtc = await promise;
  return idpTimeToDate(idpTimeUtc);
}

/**
 * Returns the JSON object with camelized keys e.g. {"ErrorID": 0} becomes {"errorId": 0}
 * @private
 * @param {Object} jsonObject A JSON object with non-camelized keys e.g. ErrorID
 * @param {Object} template A template with context-specific mappings
 * @returns {Object} The object with its keys camelCase
 */
function remapJsonKeys_(jsonObject, template) {
  /**
   * Converts a string to camelCase
   * @param {string} str 
   */
  function camelize(str) {
    // maps original API keys to modern JSON keys
    // Note: ideally convert ID context-dependent to MessageId, MobileId, BroadcastId
    if (str in template) {
      return template[str];
    } else {
      return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
      });
    }
  }
  /**
   * Converts keys of an object to camelCase
   * @param {Object} obj The object to camelize
   * @returns {Object} camelized object
   */
  function camelizeObjectKeys(obj) {
    let newObj = {};
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      let newKey = camelize(key);
      if (obj[key] instanceof Array && !key.includes('Raw')) {
        let newArr = [];
        for (let i=0; i < obj[key].length; i++) {
          newArr.push(camelizeObjectKeys(obj[key][i]));
        }
        newObj[newKey] = newArr;
      } else if (obj[key] instanceof Object && !(obj[key] instanceof Array)) {
        newObj[newKey] = camelizeObjectKeys(obj[key]);
      } else {
        // TODO: return ISOstring format timestamp (remove false)
        if (key.includes('UTC') && (obj[key] !== "" && obj[key] !== null)) {
          newObj[newKey] = obj[key].replace(' ', 'T') + 'Z';
        } else {
          newObj[newKey] = obj[key];
        }
      }
    }
    return newObj;
  }
  // main function
  let newJsonObject;
  if (jsonObject instanceof Array) {
    newJsonObject = [];
    for (let i = 0; i < jsonObject.length; i++) {
      newJsonObject.push(camelizeObjectKeys(jsonObject[i]));
    }
  } else {
    newJsonObject = camelizeObjectKeys(jsonObject);
  }
  return newJsonObject;
}

function mapJsonKeys_(jsonObject, template) {
  function deCamelize(str) {
    // maps original API keys to modern JSON keys
    // Note: ideally convert ID context-dependent to MessageId, MobileId, BroadcastId
    try {
      let foundKey = getKeyByValue_(template, str);
      if (typeof(foundKey) !== 'undefined') {
        return foundKey;
      } else {
        return str;
      }
    } catch (err) {
      //TODO
      console.log(err);
    }
  }
  /**
   * Converts keys of an object to camelCase
   * @param {Object} obj The object to camelize
   * @returns {Object} camelized object
   */
  function deCamelizeObjectKeys(obj) {
    let newObj = {};
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      let newKey = deCamelize(key);
      if (obj[key] instanceof Array && !key.includes('Raw')) {
        let newArr = [];
        for (let i=0; i < obj[key].length; i++) {
          newArr.push(deCamelizeObjectKeys(obj[key][i]));
        }
        newObj[newKey] = newArr;
      } else if (obj[key] instanceof Object  && !(obj[key] instanceof Array)) {
        newObj[newKey] = deCamelizeObjectKeys(obj[key]);
      } else {
        newObj[newKey] = obj[key];
      }
    }
    return newObj;
  }
  // main function
  let newJsonObject;
  if (jsonObject instanceof Array) {
    newJsonObject = [];
    for (let i = 0; i < jsonObject.length; i++) {
      newJsonObject.push(deCamelizeObjectKeys(jsonObject[i]));
    }
  } else {
    newJsonObject = deCamelizeObjectKeys(jsonObject);
  }
  return newJsonObject;
}

/**
 * Describes an error code returned by the IDP Messaging API
 * @typedef {Object} ErrorDefinition
 * @property {number} id The unique error number
 * @property {string} name The unique name
 * @property {string} description A verbose description of the error
 */

/**
 * Returns an array of error definitions based on an API error code
 * @returns {Promise<ErrorDefinition[]>} See {@link ErrorDefinition}
 */
async function getErrorDefinitions() {
  apiUrl = overrideUrl_(arguments);
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + 'info_errors.json/',
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        logger.debug(options.uri + ' returned ' + result.length + ' error codes');
        resolve(result);
      }
    });
  });
  let errorDefinitions = await promise;
  return remapJsonKeys_(errorDefinitions, templates.ERROR_DEFINITION);
}

/**
 * Returns a descriptive error name based on an API error code
 * @param {(string|number)} errorId The ErrorID number returned by the API operation
 * @returns {Promise<string>} An error name/description or 'UNDEFINED'
 */
async function getErrorName(errorId) {
  let errorName = 'UNDEFINED';
  const errorDescriptions = await getErrorDefinitions();
  errorDescriptions.forEach(function (element) {
    if (Number(element.errorId) === Number(errorId)) {
      errorName = element.name;
    }
  })
  return errorName;
}

/**
 * A data structure containing various content and metadata within a message,
 * present if a codec is provisioned on the Mailbox
 * @typedef {Object} Field
 * @property {string} name A descriptive name of the field, usually in camelCase notation
 * @property {string} [dataType] Supported types
 *     <br>&nbsp;&nbsp;'enum' is presented as string on decode, may be number or string on encode
 *     <br>&nbsp;&nbsp;'boolean' is presented as a string Value
 *     <br>&nbsp;&nbsp;'unsignedint', 'signedint' are presented as a string Value
 *     <br>&nbsp;&nbsp;'string'
 *     <br>&nbsp;&nbsp;'data' is a string, base64 encoded
 *     <br>&nbsp;&nbsp;'array' is an object with Elements instead of Value
 *     <br>&nbsp;&nbsp;'message' is an object with Message instead of Value
 *     <br>&nbsp;&nbsp;'dynamic' TBC
 *     <br>&nbsp;&nbsp;'property' TBC
 * @property {string} [stringValue] Present if Type is 'enum', 'boolean', 'unsignedint', 'signedint', 'string', 'data'
 * @property {Object[]} [arrayElements] present if Type is 'array'
 * @property {number} [arrayElements.index] index of the Elements array
 * @property {Field[]} [arrayElements.fields] A list of field objects
 * @property {Message} [message] present if Type is 'message'
 */

/**
 * A set of metadata encapsulating data transported over the satellite network as a message
 * @typedef {Object} Message
 * @property {boolean} [isForward] indicates if the message is Mobile-Terminated (aka To-Mobile aka Forward)
 * @property {number} codecServiceId Service Identification Number the first byte of payload optionally used for codec
 * @property {number} codecMessageId Message Identification Number the second byte of payload optionally used for codec
 * @property {string} name A short name for the message, typically using camelCase notation
 * @property {Field[]} fields An array of Field types
 */

/**
 * A set of metadata relating to a Mobile-Originated (aka From-Mobile aka Return) message
 * @typedef {Object} ReturnMessage
 * @property {number} messageId A unique number assigned by the MGS upon receipt of the message
 * @property {string} receiveTimeUtc An ISO timestamp YYYY-MM-DDTHH:MM:SSZ when the message was received at the Satellite Access Station
 * @property {string} regionName The name of the satellite regional beam the message was received on
 * @property {number} size The size of the message received over-the-air, in bytes
 * @property {string} mailboxTimeUtc An ISO timestamp YYYY-MM-DDTHH:MM:SSZ when the message is ready for retrieval in the Mailbox
 * @property {string} mobileId The unique Mobile ID of the terminal/modem that sent the message
 * @property {number} codecServiceId Service Identification Number the first byte of payload optionally used for codec
 * @property {number[]} [payloadRaw] An array of bytes as decimal numbers (0..255)
 *     <br>&nbsp;&nbsp;present if requested in the get_return_messages operation
 * @property {Message} [payloadJson] A JSON data structured {@link Message}
 *     <br>&nbsp;&nbsp;present if the MGS has decoded the raw payload using a Message Definition File on the Mailbox
 */

/**
 * A filter to apply when retrieving Mobile-Originated messages
 * @typedef {Object} FilterGetMobileOrigintated
 * @property {string|Date} [startTimeUtc] Start time (high water mark from prior nextStartUtc) ISO format 'YYYY-MM-DDTHH:MM:SSZ'
 *     <br>&nbsp;&nbsp;required if startMessageId is not present, ignored if startMessageId is present
 * @property {number} [startMessageId] Start message ID (high water mark from prior NextStartID) 
 *     <br>&nbsp;&nbsp;required if startTimeUtc is not present
 * @property {string|Date} [endTimeUtc] Optional end time if startTimeUtc is used, to return a range of messages 
 *     rather than all since startTimeUtc
 * @property {string} [mobileId] Optional filter to retrieve only messages for a single terminal/modem
 * @property {boolean} [includeRawPayload=true] A flag indicating if ReturnMessage.RawPayload should be returned
 * @property {boolean} [includeFieldType=true] A flag indicating if ReturnMessage.Payload.Fields should include the Type property
 */

/**
 * The JSON structured response to the retrieving Mobile-Originated messages
 * @typedef {Object} GetReturnMessagesResponse
 * @property {number} errorId An API error code (0 means no error)
 * @property {boolean} more A flag indicating if more messages are available to retrieve
 * @property {string} nextStartTimeUtc An ISO timestamp YYYY-MM-DDTHH:MM:SSZ for the next high water mark retrieval, empty string if none
 * @property {number} nextStartId Unique ReturnMessage.ID of the next message available to retrieve from the MGS/Mailbox, -1 if none
 * @property {(ReturnMessage[]|null)} messages An array of {@link ReturnMessage} objects or null if none meet the filter/range criteria
 */

/**
 * Returns a response object containing retrieved messages that match the filter
 * @param {ApiV1Auth} auth Mailbox authentication parameters see {@link ApiV1Auth}
 * @param {FilterGetMobileOrigintated} filter See {@link FilterGetMobileOrigintated}
 * @returns {Promise<GetReturnMessagesResponse>} See {@link GetReturnMessagesResponse}
 */
async function getReturnMessages(auth, filter) {
  apiUrl = overrideUrl_(arguments);
  let apiFilter = {
    include_raw_payload: filter.includeRawPayload ? filter.includeRawPayload : true,
    include_type: filter.includeFieldType ? filter.includeFieldType : true,
  };
  if (typeof (filter.startMessageId) === 'number') {
    apiFilter.from_id = filter.startMessageId;
  } else if (filter.startTimeUtc) {
    apiFilter.start_utc = dateToIdpTime(filter.startTimeUtc);
    if (!validateIdpTimeFormat_(apiFilter.start_utc)) {
      throw new Error(`Invalid startTimeUtc ${filter.startTimeUtc}`);
    }
  } else {
    throw new Error('Missing startMessageId or startTimeUtc');
  }
  if (filter.endTimeUtc) {
    apiFilter.end_utc = dateToIdpTime(filter.endTimeUtc);
    if (!validateIdpTimeFormat_(filter.end_utc)) {
      throw new Error(`Invalid endTimeUtc ${filter.endTimeUtc}`);
    }
  }
  if (typeof (filter.mobileId) === 'string') {
    apiFilter.mobile_id = mobileId;
  }

  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + getUri_('get_return_messages.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        if (result.Messages) {
          const messagesRetrievedCount = result.Messages !== null ? result.Messages.length : 0;
          const moreMessages = result.More ? ' more messages from ' + result.NextStartId : '';
          logger.debug(messagesRetrievedCount + ' messages retrieved from Mailbox ' + auth.accessId + moreMessages);
        }
        resolve(result);
      }
    });
  });

  let response = await promise;
  return remapJsonKeys_(response, templates.GET_RETURN);
}

/** 
 * Enumerated type for TerminalWakeupPeriod 
 * @readonly
 * @enum {number}
*/
const WakeupPeriods = {
  'None': 0,
  'Seconds30': 1,
  'Seconds60': 2,
  'Minutes3': 3,
  'Minutes10': 4,
  'Minutes30': 5,
  'Minutes60': 6,
  'Minutes2': 7,
  'Minutes5': 8,
  'Minutes15': 9,
};

/**
 * TODO: what if not found?
 * @private
 * @param {Object} obj 
 * @param {*} value 
 */
function getKeyByValue_(obj, value) {
  return Object.keys(obj).find(key => obj[key] === value);
}

/**
 * Returns the enumerated string of the WakeupPeriod
 * @param {number} period The TerminalWakeupPeriod
 * @returns {string} see {@link WakeupPeriods}
 */
function getWakeupPeriod(period) {
  return getKeyByValue_(WakeupPeriods, period);
}

/**
 * Data structure for a Mobile-Terminated (aka To-Mobile aka Forward) message
 * @typedef {Object} ForwardMessage
 * @property {string} mobileId A unique Mobile ID or Broadcast ID to send the message to
 * @property {string} [userMessageId] An optional ID that may be used by your application 
 *     to correlate to a system-assigned ForwardMessageID
 * @property {number[]} [payloadRaw] Must be present if Payload is not present, 
 *     an array of bytes as decimal values (0..255)
 * @property {Message} [payloadJson] Must be present if RawPayload is not present, see {@link Messsage} 
 *     implies that a Message Definition File is used on the Mailbox
 */

/**
 * Metadata structure for a Mobile-Terminated message submission
 * @typedef {Object} ForwardSubmission
 * @property {number} errorId An error code returned by the MGS (0 = no errors)
 * @property {number} messageId A unique number generated by the network for tracking status of delivery
 * @property {string} [userMessageId] The optional user-supplied message ID to correlate with ForwardMessageID
 * @property {string} mobileId A unique Mobile ID or Broadcast ID to send the message to
 * @property {number} size The over-the-air message size, in bytes
 * @property {string} stateTimeUtc The ISO timestamp YYYY-MM-DDTHH:MM:SSZ of the last reported state of the message
 * @property {number} mobileWakeupPeriod A [something] indicating if the modem is configured for low power sleep
 * @property {string} scheduledSendTimeUtc An ISO timestamp YYYY-MM-DDTHH:MM:SSZ for the scheduled message delivery to a low power modem
 */

/**
 * Structure of response to a Mobile-Terminated message(s) submission
 * @typedef {Object} SubmitForwardMessagesResult
 * @property {number} errorId An error code returned by the system (0 = no errors)
 * @property {ForwardSubmission[]} submissions An array of {@link ForwardSubmission} 
 *     metadata for Mobile-Terminated messages submitted in the operation
 */

/**
 * Submits Mobile-Terminated message(s) to remote modem(s)
 * @param {ApiV1Auth} auth Mailbox authentication see {@link ApiV1Auth}
 * @param {ForwardMessage[]} messages An array of messages see {@link ForwardMessage}
 * @returns {Promise<SubmitForwardMessagesResult>} An error code and metadata 
 *     see {@link SubmitForwardMessagesResult}
 */
async function submitForwardMessages(auth, messages) {
  apiUrl = overrideUrl_(arguments);
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + 'submit_messages.json/',
      body: {
        accessID: auth.accessId,
        password: auth.password,
        messages: mapJsonKeys_(messages, templates.FORWARD_MESSAGE)
      },
      json: true,
    };
    request.post(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        if (resp.statusCode === 200) {
          const result = body.SubmitForwardMessages_JResult;
          if (result.Submissions) {
            const messagesSubmittedCount = result.Submissions !== null ? result.Submissions.length : 0;
            logger.debug(messagesSubmittedCount + ' messages submitted to Mailbox ' + auth.accessId);
          }
          resolve(result);
        } else {
          reject('statusCode: ' + resp.statusCode);
        }
      }
    });
  });

  let response = await promise;
  //if (!preserveNativeApi) response = remapJsonKeys_(response);
  return remapJsonKeys_(response, templates.SUBMIT_OR_CANCEL_FORWARD);
}

/**
 * Metadata structure for a Mobile-Terminated message that has been submitted to the IDP Message Gateway System
 * @typedef {Object} ForwardMessageRecord
 * @property {string} mobileId A unique Mobile ID or Broadcast ID to send the message to
 * @property {number[]} payloadRaw Must be present if Payload is not present, an array of bytes as decimal values (0..255)
 * @property {Message} payloadJson Must be present if RawPayload is not present, see {@link Message}
 *     implies that a Message Definition File is used on the Mailbox
 * @property {number} messageId A unique number assigned by the MGS upon submission (get_forward_messages only)
 * @property {string} mailboxTimeUtc A timestamp assigned by the MGS upon submission (get_forward_messages only)
 * @property {string} stateTimeUtc A timestamp of the most recent State (get_forward_messages only)
 * @property {number} state The current state of the message (get_forward_messages only)
 * @property {number} errorId An error code for the record retrieval
 * @property {boolean} isClosed An indicator if the message is completed/failed (get_forward_messages only)
 * @property {number} referenceNumber System generated (get_forward_messages only)
 */

/**
 * Structure of response to a retrieval of Mobile-Terminated message(s)
 * @typedef {Object} GetForwardMessagesResult
 * @property {number} errorId An error code for the get_forward_messages operation
 * @property {ForwardMessageRecord[]} messages An array of records see {@link ForwardMessageRecord}
 */

/**
 * Returns a string of Mobile-Terimated message id(s) to be used as a filter for status or message retrieval
 * @private
 * @param {(number|number[])} messageIds A unique messageId or list of ids used for a retrieval query
 * @returns {string} The list of ids as a comma-separated value string
 */
function getForwardIdsString_(ids) {
  let fwIds = '';
  if (typeof (ids) === 'number') {
    ids = [ids];
  }
  if (Array.isArray(ids)) {
    for (let i = 0; i < ids.length; i++) {
      if (i > 0) fwIds += ',';
      fwIds += ids[i];
    }
  }
  return fwIds;
}

/**
* Retrieves Mobile-Terminated messages submitted, by ID(s)
* @param {ApiV1Auth} auth Mailbox authentication see {@link ApiV1Auth}
* @param {(number|number[])} ids An array of unique {@link ForwardMessageID} numbers
* @returns {Promise<GetForwardMessagesResult>} The requested IDs and/or error code see {@link GetForwardMessagesResult}
*/
async function getForwardMessages(auth, ids) {
  apiUrl = overrideUrl_(arguments);
  const fwIds = getForwardIdsString_(ids);

  const promise = new Promise(function (resolve, reject) {
    const options = {
      uri: apiUrl + getUri_('get_forward_messages.json/', auth, { fwIDs: fwIds }),
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        if (result.Messages) {
          const messagesRetrievedCount = result.Messages !== null ? result.Messages.length : 0;
          logger.debug(messagesRetrievedCount + ' messages retrieved from Mailbox ' + auth.accessId);
        }
        resolve(result);
      }
    });
  });

  let response = await promise;
  return remapJsonKeys_(response, templates.GET_FORWARD);
}

/** 
 * Enumerated type for State of Mobile-Terminated message
 * @readonly
 * @enum {number}
*/
const ForwardMessageStates = {
  'SUBMITTED': 0,
  'RECEIVED': 1,
  'ERROR': 2,
  'DELIVERY_FAILED': 3,
  'TIMED_OUT': 4,
  'CANCELLED': 5,
};

/**
 * Returns the enumerated string of the state value
 * @param {number} state The state value returned in ForwardStatus
 * @returns {string} see {@link ForwardMessageStates}
 */
function getStateDefinition(state) {
  return getKeyByValue_(ForwardMessageStates, state);
}

/**
 * A filter for requesting Mobile-Terminated message(s) states
 * @typedef {Object} ForwardStatusFilter 
 * @property {(number|number[])} [ids] Unique ForwardMessage.ID(s) to query, must be present if startTimeUtc is not
 * @property {string|Date} [startTimeUtc] The UTC timestamp YYYY-MM-DD hh:mm:ss for the start of retrieval,
 *    must be present if ids is not
 * @property {string|Date} [endTimeUtc] The UTC timestamp YYYY-MM-DD hh:mm:ss for the end of retrieval
 */

/**
 * Metadata for a submitted Mobile-Terminated message state
 * @typedef {Object} ForwardStatus
 * @property {number} errorId An error code for the Mobile-Terminated message
 * @property {number} messageId The unique ID of the message assigned by the system
 * @property {boolean} isClosed An indicator whether the message is no longer pending (delivered or failed)
 * @property {number} referenceNumber 
 * @property {string} stateTimeUtc The ISO timestamp YYYY-MM-DDTHH:MM:SSZ or Date of the reported state of the message
 * @property {number} state The state/status code of the message
 */

/**
 * Response structure for a query of Mobile-Terminated message state(s)
 * @typedef {Object} GetForwardStatusesResult
 * @property {number} errorId An error code returned for the get_forward_statuses operation
 * @property {boolean} more An indicator if additional statuses are available for retrieval
 * @property {(string|null)} nextStartTimeUtc The ISO timestamp YYYY-MM-DDTHH:MM:SSZ for the next retrieval, null if More is false
 * @property {(ForwardStatus[]|null)} statuses An array of {@link ForwardStatus} if any were retrieved, otherwise null
 */

/**
 * Retrieves Mobile-Terminated message state/status by ID(s) and optional time range
 * NOTE: API should support ids as optional if startTimeUtc is specified
 * @param {ApiV1Auth} auth Mailbox authentication see {@link ApiV1Auth}
 * @param {ForwardStatusFilter} filter A set of filter criteria for the query see {@link ForwardStatusFilter}
 * @returns {Promise<GetForwardStatusesResult>} see {@link GetForwardStatusesResult}
 * @throws {Error} If filter does not include ids or startTimeUtc
 */
async function getForwardStatuses(auth, filter) {
  apiUrl = overrideUrl_(arguments);
  let apiFilter = {};
  if (filter.ids === null && filter.startTimeUtc === null) {
    throw new Error('getForwardStatuses must contain at least one of ids or startTimeUtc');
  }
  if (filter.ids) {
    apiFilter.fwIDs = getForwardIdsString_(filter.ids);
  } else if (filter.startTimeUtc) {
    apiFilter.start_utc = dateToIdpTime(filter.startTimeUtc);
    if (!validateIdpTimeFormat_(apiFilter.start_utc)) {
      throw new Error(`Invalid startTimeUtc ${filter.startTimeUtc}`);
    }
  } else {
    throw new Error('Missing filter ids or startTimeUtc');
  }
  if (filter.endTimeUtc) {
    apiFilter.end_utc = dateToIdpTime(filter.endTimeUtc);
    if (!validateIdpTimeFormat_(apiFilter.end_utc)) {
      throw new Error(`Invalid endTimeUtc ${filter.endTimeUtc}`);
    }
  }

  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + getUri_('get_forward_statuses.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        if (result.Statuses) {
          const messagesStatusesCount = result.Statuses !== null ? result.Statuses.length : 0;
          logger.debug(messagesStatusesCount + ' statuses retrieved from Mailbox ' + auth.accessId);
        }
        resolve(result);
      }
    })
  });

  let response = await promise;
  return remapJsonKeys_(response, templates.GET_STATUSES);
}

/**
 * Metadata structure for a Mobile-Terminated message submission
 * @typedef {Object} ForwardCancelation
 * @property {number} errorId An error code returned by the MGS (0 = no errors; 115 = )
 * @property {number} messageId A unique number generated by the network for tracking status of delivery (-1 if failed)
 * @property {string} [userMessageId] The optional user-supplied message ID to correlate with ForwardMessageID
 * @property {string} mobileId A unique Mobile ID or Broadcast ID to send the message to (empty string if failed)
 * @property {number} [size] The over-the-air message size, in bytes
 * @property {string} stateTimeUtc The ISO timestamp YYYY-MM-DDTHH:MM:SSZ of the last reported state of the message
 * @property {number} mobileWakeupPeriod A [something] indicating if the modem is configured for low power sleep
 * @property {string} scheduledSendTimeUtc A timestamp YYYY-MM-DDTHH:MM:SSZ for the scheduled message delivery to a low power modem
 */

 /**
 * Response structure for cancellation request of Mobile-Terminated message(s)
 * @typedef {Object} CancelForwardMessagesResult
 * @property {number} errorId An error code for the submit_cancelations operation
 * @property {ForwardCancelation[]} submissions The list of submitted messages to cancel
 */

/**
 * Requests cancellation of specific Mobile-Terminated message(s)
 * @param {ApiV1Auth} auth Mailbox authenticataion
 * @param {(number|number[])} ids Message id(s) to be cancelled
 * @returns {Promise<CancelForwardMessagesResult>} see {@link CancelForwardMessagesResult}
 */
async function cancelForwardMessages(auth, ids) {
  apiUrl = overrideUrl_(arguments);
  let apiFilter = {};
  if (ids !== null) apiFilter.fwIDs = getForwardIdsString_(ids);

  const promise = new Promise(function (resolve, reject) {
    const options = {
      uri: apiUrl + getUri_('submit_cancelations.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        if (result.Submissions) {
          const cancellationsRequestedCount = result.Submissions !== null ? result.Submissions.length : 0;
          logger.debug(cancellationsRequestedCount + ' cancellations requested for Mailbox ' + auth.accessId);
        }
        resolve(result);
      }
    });
  });

  let response = await promise;
  return remapJsonKeys_(response, templates.SUBMIT_OR_CANCEL_FORWARD);
}

/**
 * Structure of response to a MobileID query
 * @typedef {Object} MobileIdList
 * @property {number} ErrorID An error code for the get_mobiles_paged operation
 * @property {MobileInformation[]} Mobiles A list of {@link MobileInformation} objects
 */

/**
 * Metadata for a queried MobileID
 * @typedef {Object} MobileInformation
 * @property {string} mobileId The unique Mobile ID
 * @property {string} description A description as provisioned on the MGS
 * @property {string} lastRegistrationTimeUtc An ISO timestamp format YYYY-MM-DDTHH:MM:SSZ of the last Registration message
 * @property {string} regionName The region/beam on which the last Registration message was received
 */

/**
 * Returns a list of MobileID metadata
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {Object} [filter] Filters for ID (next ID for sequential query) and size
 * @param {string} [filter.mobileId] Set the only/first Mobile ID to query, if present
 * @param {number} [filter.pageSize] Maximum number of results to return (1..1000) defaults to 1000
 * @returns {Promise<MobileIdList>} A response list with error code see {@link MobileIdList}
 */
async function getMobileIds(auth, filter) {
  apiUrl = overrideUrl_(arguments);
  const promise = new Promise((resolve, reject) => {
    const apiFilter = {
      page_size: 1000,
    };
    if (filter) {
      if (typeof (filter.mobileId) === 'string') {
        apiFilter.since_mobile = filter.mobileId;
      }
      if (typeof (filter.pageSize) === 'number'
          && filter.pageSize >= 1 && filter.pageSize <= 1000) {
        apiFilter.page_size = filter.pageSize;
      }
    }
    const options = {
      uri: apiUrl + getUri_('get_mobiles_paged.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        if (result.Mobiles) {
          const mobilesCount = result.Mobiles !== null ? result.Mobiles.length : 0;
          const moreMobiles = result.More ? ' more messages from ' + result.NextStartID : '';
          logger.debug(mobilesCount + ' Mobile IDs retrieved from Mailbox ' + auth.accessId + moreMobiles);
        }
        resolve(result);
      }
    })
  });
  //TODO: API seems not to have a More flag to indicate when done?
  let response = await promise;
  return remapJsonKeys_(response, templates.MOBILE_OR_BROADCAST_INFO);
}

/**
 * Response structure for a BroadcastID query
 * @typedef {Object} BroadcastIdList
 * @property {number} errorId An error code for the get_mobiles_paged operation
 * @property {BroadcastInformation[]} broadcastGroups A list of {@link BroadcastInformation} objects
 */

/**
 * Metadata for a BroadcastID
 * @typedef {Object} BroadcastInformation
 * @property {string} mobileId The unique Broadcast ID
 * @property {string} description A description as provisioned on the MGS
 */

/**
 * Returns the list of Broadcast IDs associated with the Mailbox
 * @param {ApiV1Auth} auth Mailbox authentication
 * @returns {Promise<BroadcastIdList>} See {@link BroadcastIdList}
 */
async function getBroadcastIds(auth) {
  apiUrl = overrideUrl_(arguments);
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + getUri_('get_broadcast_infos.json/', auth),
    };
    request.get(options, function (err, resp, body) {
      if (err || resp.statusCode !== 200) {
        reject(new Error(handleRequestError_(err, resp, options.uri)));
      } else {
        const result = JSON.parse(body);
        if (result.BroadcastInfos) {
          const broadcastIdsCount = result.BroadcastInfos !== null ? result.BroadcastInfos.length : 0;
          logger.debug(broadcastIdsCount + ' Broadcast IDs retrieved from Mailbox ' + auth.accessId);
        }
        resolve(result);
      }
    })
  });
  //TODO: should be a More flag to indicate when done?
  let response = await promise;
  return remapJsonKeys_(response, templates.MOBILE_OR_BROADCAST_INFO);
}

module.exports = {
  apiUrl,
  getIdpVersion,
  getIdpTime,
  getErrorName,
  getErrorDefinitions,
  getReturnMessages,
  submitForwardMessages,
  cancelForwardMessages,
  getForwardStatuses,
  getForwardMessages,
  getMobileIds,
  getBroadcastIds,
  getWakeupPeriod,
  getStateDefinition,
  dateToIdpTime,
  idpTimeToDate,
};
