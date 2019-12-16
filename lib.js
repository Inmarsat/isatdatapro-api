/**
 * IsatData Pro API V1
 * @module isatdatapro-api
 */

'use strict';

const request = require('request');
const winston = require('./config/winston');
const apiUrl = require('./config/message-gateway');

/** Logs using winston configured in ./config/winston */
const logger = winston;

/**
 * An authentication pair for the IDP Messaging API V1, used for various operations
 * @typedef {Object} ApiV1Auth
 * @param {string} accessId The mailbox unique access_id
 * @param {string} password The mailbox password
 */

/**
 * Returns a URI for an authenticated (GET) operation on the IDP API V1.  Replaces spaces with %20.
 * @param {string} baseUri The API operation e.g. get_return_messages
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {Object} filters Various parameters specific to the GET operation
 * @returns {string} a URI including formatted authentication and query parameters
 */
function getUri(baseUri, auth, filters) {
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
 * @param {string} debugMessage The message with password readable
 * @returns {string} Debug message with password obfuscated for logging
 */
function obfuscateLog(debugMessage) {
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
      }
      replaceMessage += messageComponents[c];
    }
    return replaceMessage;
  } else {
    return debugMessage;
  }
}

/**
 * Returns the Message Gateway System software version details
 * @returns {Promise<string>} IDP Message Gateway System software version
 */
async function getIdpVersion() {
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + 'info_version.json/',
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(options.uri + ' returned ' + err);
        reject(err);
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
 * Returns an IDP message gateway formatted timestamp, defaults to 1970-01-01 00:00:00
 * @param {Object} date A Javascript Date object
 * @returns {string} An IDP message gateway formatted timestamp 'YYYY-MM-DD hh:mm:ss'
 */
function dateToIdpTime(date) {
  let idpTime = '1970-01-01 00:00:00';
  if (date instanceof Date) {
    idpTime = date.toISOString().split('.')[0].replace('T', ' ');
  }
  return idpTime;
}

/**
 * Returns true if the timestamp is IDP format
 * @param {string} timestamp A candidate IDP message gateway formatted timestamp 'YYYY-MM-DD hh:mm:ss'
 * @returns {boolean}
 */
function validateIdpTimeFormat(timestamp) {
  let valid = false;
  if (typeof(timestamp) === 'string') {
    const timestampParts = timestamp.split(' ');
    const dateParts = timestampParts.split('-');
    const timeParts = timestampParts.split(':');
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
 * @param {string} idpTime An IDP message gateway formatted timestamp 'YYYY-MM-DD hh:mm:ss'
 * @returns {Object} Javascript Date object
 * @throws {Error} If the passed in value is not a valid IDP datestamp
 */
function idpTimeToDate(idpTime) {
  if (validateIdpTimeFormat(idpTime)) {
    return new Date(idpTime);
  } else {
    throw new Error('Value must be a valid IDP datestamp yyyy-mm-dd HH:MM:SS');
  }
}

/**
 * Returns current UTC time at the MGS
 * @returns {Promise<string>} UTC time formatted as 'YYYY-MM-DD hh:mm:ss'
 */
async function getIdpTime() {
  const promise = new Promise(function (resolve, reject) {
    const options = {
      uri: apiUrl + 'info_utc_time.json/',
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(options.uri + ' returned ' + err);
        reject(err);
      } else {
        const result = JSON.parse(body);
        logger.debug(options.uri + ' returned ' + result);
        resolve(result);
      }
    });
  });
  const idpTime = await promise;
  return idpTime;
}

/**
 * Returns the JSON object with camelized keys e.g. {"ErrorID": 0} becomes {"errorId": 0}
 * @private
 * @param {Object} jsonObject A JSON object with non-camelized keys e.g. ErrorID
 * @returns {Object} The object with its keys camelCase
 */
function camelizeJsonKeys(jsonObject) {
  let newJsonObject = {};

  function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
      if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
      return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
  }

  for (let key in jsonObject) {
    // skip loop if the property is from prototype
    if (!jsonObject.hasOwnProperty(key)) continue;

    let obj = jsonObject[key];
    for (let prop in obj) {
        // skip loop if the property is from prototype
        if (!obj.hasOwnProperty(prop)) continue;

        let newKey = camelize(key);
        newJsonObject[newKey] = prop;
    }
  }
  return newJsonObject;
}

/**
 * Describes an error code returned by the IDP Messaging API
 * @typedef {Object} ErrorDefinition
 * @property {number} ID The unique error number
 * @property {string} Name The unique name
 * @property {string} Description A verbose description of the error
 */

/**
 * Returns an array of error definitions based on an API error code
 * @returns {Promise<ErrorDefinition[]>} An array of error definitions
 */
async function getErrorDefinitions() {
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + 'info_errors.json/',
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(options.uri + ' returned ' + err);
        reject(err);
      } else {
        const result = JSON.parse(body);
        logger.debug(options.uri + ' returned ' + result.length + ' error codes');
        resolve(result);
      }
    });
  });
  const errorDefinitions = await promise;
  return errorDefinitions;
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
    if (Number(element.ID) === Number(errorId)) {
      errorName = element.Name;
    }
  })
  return errorName;
}

/**
 * A data structure containing various content and metadata within a message,
 * present if a codec is provisioned on the Mailbox
 * @typedef {Object} Field
 * @property {string} Name A descriptive name of the field, usually in camelCase notation
 * @property {string} [Type] Supported types
 *  <br>&nbsp;&nbsp;'enum' is presented as string on decode, may be number or string on encode
 *  <br>&nbsp;&nbsp;'boolean' is presented as a string Value
 *  <br>&nbsp;&nbsp;'unsignedint', 'signedint' are presented as a string Value
 *  <br>&nbsp;&nbsp;'string'
 *  <br>&nbsp;&nbsp;'data' is a string, base64 encoded
 *  <br>&nbsp;&nbsp;'array' is an object with Elements instead of Value
 *  <br>&nbsp;&nbsp;'message' is an object with Message instead of Value
 *  <br>&nbsp;&nbsp;'dynamic' TBC
 *  <br>&nbsp;&nbsp;'property' TBC
 * @property {string} [Value] Present if Type is 'enum', 'boolean', 'unsignedint', 'signedint', 'string', 'data'
 * @property {Object[]} [Elements] present if Type is 'array'
 * @property {number} [Elements.Index] index of the Elements array
 * @property {Field[]} [Elements.Fields] A list of field objects
 * @property {Message} [Message] present if Type is 'message'
 */

/**
 * A set of metadata encapsulating data transported over the satellite network as a message
 * @typedef {Object} Message
 * @property {boolean} IsForward indicates if the message is Mobile-Terminated (aka To-Mobile aka Forward)
 * @property {number} SIN Service Identification Number the first byte of payload optionally used for codec
 * @property {number} MIN Message Identification Number the second byte of payload optionally used for codec
 * @property {string} Name A short name for the message, typically using camelCase notation
 * @property {Field[]} Fields An array of Field types
 */

/**
 * A set of metadata relating to a Mobile-Originated (aka From-Mobile aka Return) message
 * @typedef {Object} ReturnMessage
 * @property {number} ID A unique number assigned by the MGS upon receipt of the message
 * @property {string} ReceiveUTC A timestamp YYYY-MM-DD HH:MM:SS when the message was received at the Satellite Earth Station
 * @property {string} RegionName The name of the satellite regional beam the message was received on
 * @property {number} OTAMessageSize The size of the message received over-the-air, in bytes
 * @property {string} MessageUTC A timestamp YYYY-MM-DD HH:MM:SS when the message was retrieved by the MGS
 * @property {string} MobileID The unique Mobile ID of the terminal/modem that sent the message
 * @property {number} SIN Service Identification Number the first byte of payload optionally used for codec
 * @property {number[]} [RawPayload] An array of bytes as decimal numbers (0..255)
 *  <br>&nbsp;&nbsp;present if requested in the get_return_messages operation
 * @property {Message} [Payload] A JSON data structure
 *  <br>&nbsp;&nbsp;present if the MGS has decoded the raw payload using a Message Definition File on the Mailbox
 */

/**
 * A filter to apply when retrieving Mobile-Originated messages
 * @typedef {Object} FilterGetMobileOrigintated
 * @property {string} [startTimeUtc] Start time (high water mark from prior NextStartUTC) timestamp format 'YYYY-MM-DD hh:mm:ss'
 *  <br>&nbsp;&nbsp;required if startMessageId is not present, ignored if from_id is present
 * @property {number} [startMessageId] Start message ID (high water mark from prior NextStartID) 
 *  <br>&nbsp;&nbsp;required if startTimeUtc is not present
 * @property {string} [endTimeUtc] Optional end time if startTimeUtc is used, to return a range of messages 
 *  rather than all since startTimeUtc
 * @property {string} [mobileId] Optional filter to retrieve only messages for a single terminal/modem
 * @property {boolean} [includeRawPayload=true] A flag indicating if ReturnMessage.RawPayload should be returned
 * @property {boolean} [includeFieldType=true] A flag indicating if ReturnMessage.Payload.Fields should include the Type property
 */

/**
 * The JSON structured response to the retrieving Mobile-Originated messages
 * @typedef {Object} GetReturnMessagesResponse
 * @property {number} ErrorID An API error code (0 means no error)
 * @property {boolean} More A flag indicating if more messages are available to retrieve
 * @property {string} NextStartUTC Timestamp 'YYYY-MM-DD hh:mm:ss' for the next high water mark retrieval
 * @property {number} NextStartID Unique ReturnMessage.ID of the next message available to retrieve from the MGS/Mailbox
 * @property {(ReturnMessage[]|null)} Messages An array of message objects or null if none meet the filter/range criteria
 */

/**
 * Returns a response object containing retrieved messages that match the filter
 * @param {ApiV1Auth} auth Mailbox authentication parameters
 * @param {FilterGetMobileOrigintated} filter 
 * @returns {GetReturnMessagesResponse} A response object
 */
async function getMobileOriginatedMessages(auth, filter) {
  let apiFilter = {
    include_raw_payload: filter.includeRawPayload ? filter.includeRawPayload : true,
    include_type: filter.includeFieldType ? filter.includeFieldType : true,
  };
  if (typeof (filter.startMessageId) === 'number') {
    apiFilter.from_id = filter.startMessageId;
  } else if (typeof (filter.startTimeUtc) === 'string') {
    apiFilter.start_utc = filter.startTimeUtc;
  }
  //TODO: throw error if neither startMessageId nor startTimeUtc were provided
  if (typeof (filter.endTimeUtc) === 'string') {
    apiFilter.end_utc = filter.endTimeUtc;
  }
  if (typeof (filter.mobileId) === 'string') {
    apiFilter.mobile_id = mobileId;
  }

  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + getUri('get_return_messages.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(obfuscateLog(options.uri) + ' returned ' + err);
        reject(err);
      } else {
        const result = JSON.parse(body);
        const messagesRetrievedCount = result.Messages !== null ? result.Messages.length : 0;
        const moreMessages = result.More ? ' more messages from ' + result.NextStartID : '';
        logger.debug(messagesRetrievedCount + ' messages retrieved from Mailbox ' + auth.accessId + moreMessages);
        resolve(result);
      }
    });
  });

  const response = await promise;
  return response;
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
 * Data structure for a Mobile-Terminated (aka To-Mobile aka Forward) message
 * @typedef {Object} ForwardMessage
 * @property {string} DestinationID A unique Mobile ID or Broadcast ID to send the message to
 * @property {string} [UserMessageID] An optional ID that may be used by your application to correlate to a system-assigned ForwardMessageID
 * @property {number[]} [RawPayload] Must be present if Payload is not present, an array of bytes as decimal values (0..255)
 * @property {Message} [Payload] Must be present if RawPayload is not present, implies that a Message Definition File is used on the Mailbox
 */

/**
 * Metadata structure for a Mobile-Terminated message submission
 * @typedef {Object} ForwardSubmission
 * @property {number} ErrorID An error code returned by the MGS (0 = no errors)
 * @property {number} ForwardMessageID A unique number generated by the network for tracking status of delivery
 * @property {string} [UserMessageID] The optional user-supplied message ID to correlate with ForwardMessageID
 * @property {string} DestinationID A unique Mobile ID or Broadcast ID to send the message to
 * @property {number} OTAMessageSize The over-the-air message size, in bytes
 * @property {string} StateUTC The timestamp 'YYYY-MM-DD hh:mm:ss' of the last reported state of the message
 * @property {number} TerminalWakeupPeriod A [something] indicating if the modem is configured for low power sleep
 * @property {string} ScheduledSendUTC A timestamp 'YYYY-MM-DD hh:mm:ss' for the scheduled message delivery to a low power modem
 */

/**
 * Structure of response to a Mobile-Terminated message(s) submission
 * @typedef {Object} SubmitForwardMessagesResult
 * @property {number} ErrorID An error code returned by the system (0 = no errors)
 * @property {ForwardSubmission[]} Submissions An array of Mobile-Terminated messages submitted in the operation
 */

/**
 * Submits Mobile-Terminated message(s) to remote modem(s)
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {ForwardMessage[]} messages An array of messages
 * @returns {Promise<SubmitForwardMessagesResult>} An error code and metadata
 */
async function submitMobileTerminatedMessages(auth, messages) {
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + 'submit_messages.json/',
      body: {
        accessID: auth.accessId,
        password: auth.password,
        messages: messages

      },
      json: true,
    };
    request.post(options, function (err, resp, body) {
      if (err) {
        //TODO: ensure password is obfuscated if body is visible in debug
        logger.error(options.uri + ' returned ' + err);
        reject(err);
      } else {
        if (resp.statusCode === 200) {
          const result = body.SubmitForwardMessages_JResult;
          const messagesSubmittedCount = result.Submissions !== null ? result.Submissions.length : 0;
          logger.debug(messagesSubmittedCount + ' messages submitted to Mailbox ' + auth.accessId);
          resolve(result);
        } else {
          reject('statusCode: ' + resp.statusCode);
        }
      }
    });
  });

  const response = await promise;
  return response;
}

/**
 * Metadata structure for a Mobile-Terminated message that has been submitted to the IDP Message Gateway System
 * @typedef {Object} ForwardMessageRecord
 * @property {string} DestinationID A unique Mobile ID or Broadcast ID to send the message to
 * @property {number[]} RawPayload Must be present if Payload is not present, an array of bytes as decimal values (0..255)
 * @property {Message} Payload Must be present if RawPayload is not present, implies that a Message Definition File is used on the Mailbox
 * @property {number} ID A unique number assigned by the MGS upon submission (get_forward_messages only)
 * @property {string} CreateUTC A timestamp assigned by the MGS upon submission (get_forward_messages only)
 * @property {string} StatusUTC A timestamp of the most recent State (get_forward_messages only)
 * @property {number} State The current state of the message (get_forward_messages only)
 * @property {number} ErrorID An error code for the record retrieval
 * @property {boolean} IsClosed An indicator if the message is completed/failed (get_forward_messages only)
 * @property {number} ReferenceNumber System generated (get_forward_messages only)
 */

/**
 * Structure of response to a retrieval of Mobile-Terminated message(s)
 * @typedef {Object} GetForwardMessagesResult
 * @property {number} ErrorID An error code for the get_forward_messages operation
 * @property {ForwardMessageRecord[]} Messages An array of messages
 */

/**
 * Returns a string of Mobile-Terimated message id(s) to be used as a filter for status or message retrieval
 * @param {(number|number[])} ids A unique ForwardMessage.ID or list of ids used for a retrieval query
 * @returns {string} The list of ids as a comma-separated value string
 */
function getFwIdsString(ids) {
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
* @param {ApiV1Auth} auth Mailbox authentication
* @param {(number|number[])} ids An array of unique ForwardMessageID numbers
* @returns {Promise<GetForwardMessagesResult>} The requested IDs and/or error code
*/
async function getMobileTerminatedMessages(auth, ids) {
  const fwIds = getFwIdsString(ids);

  const promise = new Promise(function (resolve, reject) {
    const options = {
      uri: apiUrl + getUri('get_forward_messages.json/', auth, { fwIDs: fwIds }),
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(obfuscateLog(options.uri) + ' returned ' + err);
        reject(err);
      } else {
        const result = JSON.parse(body);
        const messagesRetrievedCount = result.Messages !== null ? result.Messages.length : 0;
        logger.debug(messagesRetrievedCount + ' messages retrieved from Mailbox ' + auth.accessId);
        resolve(result);
      }
    });
  });

  const response = await promise;
  return response;
}

/** Enumerated type for Mobile-Terminated message state */
//TODO confirm state values
const ForwardMessageStates = [
  'SUBMITTED',
  'RECEIVED',
  'ERROR',
  'DELIVERY_FAILED',
  'TIMED_OUT',
  'CANCELLED',
];

/**
 * A filter for requesting Mobile-Terminated message(s) states
 * @typedef {Object} ForwardStatusFilter 
 * @property {(number|number[])} [ids] Unique ForwardMessage.ID(s) to query, must be present if startTimeUtc is not
 * @property {string} [startTimeUtc] The UTC timestamp 'YYYY-MM-DD hh:mm:ss' for the start of retrieval,
 *    must be present if ids is not
 * @property {string} [endTimeUtc] The UTC timestamp 'YYYY-MM-DD hh:mm:ss' for the end of retrieval
 */

/**
 * Metadata for a submitted Mobile-Terminated message state
 * @typedef {Object} ForwardStatus
 * @property {number} ErrorID An error code for the Mobile-Terminated message
 * @property {number} ForwardMessageID The unique ID of the message assigned by the system
 * @property {boolean} IsClosed An indicator whether the message is no longer pending (delivered or failed)
 * @property {number} ReferenceNumber 
 * @property {string} StateUTC The timestamp 'YYYY-MM-DD hh:mm:ss' of the reported state of the message
 * @property {number} State The state/status code of the message
 */

/**
 * Response structure for a query of Mobile-Terminated message state(s)
 * @typedef {Object} GetForwardStatusesResult
 * @property {number} ErrorID An error code returned for the get_forward_statuses operation
 * @property {boolean} More An indicator if additional statuses are available for retrieval
 * @property {(string|null)} NextStartUTC The timestamp 'YYYY-MM-DD hh:mm:ss' for the next retrieval, null if More is false
 * @property {(ForwardStatus[]|null)} Statuses An array of statuses if any were retrieved, otherwise null
 */

/**
 * Retrieves Mobile-Terminated message state/status by ID(s) and optional time range
 * NOTE: API should support ids as optional if startTimeUtc is specified
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {ForwardStatusFilter} filter A set of filter criteria for the query
 * @returns {Promise<GetForwardStatusesResult>} result
 */
async function getMobileTerminatedStatuses(auth, filter) {
  let apiFilter = {};
  if (filter.ids === null && filter.startTimeUtc === null) {
    throw new Error('getMobileTerminatedStatuses must contain at least one of ids or startTimeUtc');
  }
  if (filter.ids !== null) apiFilter.fwIDs = getFwIdsString(filter.ids);
  if (typeof (filter.startTimeUtc) === 'string') apiFilter.start_utc = filter.startTimeUtc;
  if (typeof (filter.endTimeUtc) === 'string') apiFilter.end_utc = filter.endTimeUtc;

  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + getUri('get_forward_statuses.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(obfuscateLog(options.uri) + ' returned ' + err);
        reject(err);
      } else {
        const result = JSON.parse(body);
        const messagesStatusesCount = result.Statuses !== null ? result.Statuses.length : 0;
        logger.debug(messagesStatusesCount + ' statuses retrieved from Mailbox ' + auth.accessId);
        resolve(result);
      }
    })
  });

  const response = await promise;
  return response;
}

/**
 * Response structure for cancellation request of Mobile-Terminated message(s)
 * @typedef {Object} CancelForwardMessagesResult
 * @property {number} ErrorID An error code for the submit_cancelations operation
 * @property {ForwardSubmission[]} Submissions The list of submitted messages to cancel
 */

/**
 * Requests cancellation of specific Mobile-Terminated message(s)
 * @param {ApiV1Auth} auth Mailbox authenticataion
 * @param {(number|number[])} ids Message id(s) to be cancelled
 * @returns {Promise<CancelForwardMessagesResult>}
 */
async function cancelMobileTerminatedMessages(auth, ids) {
  let apiFilter = {};
  if (ids !== null) apiFilter.fwIds = getFwIdsString(ids);

  const promise = new Promise(function (resolve, reject) {
    const options = {
      uri: apiUrl + getUri('submit_cancelations.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(obfuscateLog(options.uri) + ' returned ' + err);
        reject(err);
      } else {
        const result = JSON.parse(body);
        const cancellationsRequestedCount = result.Submissions !== null ? result.Submissions.length : 0;
        logger.debug(cancellationsRequestedCount + ' cancellations requested for Mailbox ' + auth.accessId);
        resolve(result);
      }
    });
  });

  const response = await promise;
  return response;
}

/**
 * Structure of response to a MobileID query
 * @typedef {Object} MobileIdList
 * @property {number} ErrorID An error code for the get_mobiles_paged operation
 * @property {MobileInformation[]} Mobiles A list of Mobile objects
 */

/**
 * Metadata for a queried MobileID
 * @typedef {Object} MobileInformation
 * @property {string} ID The unique Mobile ID
 * @property {string} Description A description as provisioned on the MGS
 * @property {string} LastRegistrationUTC A timestamp format 'YYYY-MM-DD hh:mm:ss' of the last Registration message
 * @property {string} RegionName The region/beam on which the last Registration message was received
 */

/**
 * Returns a list of MobileID metadata
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {Object} [filter] Filters for ID (next ID for sequential query) and size
 * @param {string} [filter.mobileId] Set the only/first Mobile ID to query, if present
 * @param {number} [filter.pageSize] Maximum number of results to return (1..1000) defaults to 1000
 * @returns {Promise<MobileIdList>} A response list with error code
 */
async function getMobileIds(auth, filter) {
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
      uri: apiUrl + getUri('get_mobiles_paged.json/', auth, apiFilter),
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(obfuscateLog(options.uri) + ' returned ' + err);
        reject(err);
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
  const result = await promise;
  return result;
}

/**
 * Response structure for a BroadcastID query
 * @typedef {Object} BroadcastIddList
 * @property {number} ErrorID An error code for the get_mobiles_paged operation
 * @property {BroadcastInformation[]} BroadcastInfos A list of Mobile objects
 */

/**
 * Metadata for a BroadcastID
 * @typedef {Object} BroadcastInformation
 * @property {string} ID The unique Mobile ID
 * @property {string} Description A description as provisioned on the MGS
 */

/**
 * Returns the list of Broadcast IDs associated with the Mailbox
 * @param {ApiV1Auth} auth Mailbox authentication
 * @returns {Promise<BroadcastIddList>} A response list with error code
 */
async function getBroadcastIds(auth) {
  const promise = new Promise((resolve, reject) => {
    const options = {
      uri: apiUrl + getUri('get_broadcast_infos.json/', auth),
    };
    request.get(options, function (err, resp, body) {
      if (err) {
        logger.error(obfuscateLog(options.uri) + ' returned ' + err);
        reject(err);
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
  const result = await promise;
  return result;
}

module.exports = {
  apiUrl,
  getIdpVersion,
  getIdpTime,
  getErrorName,
  getErrorDefinitions,
  getMobileOriginatedMessages,
  submitMobileTerminatedMessages,
  cancelMobileTerminatedMessages,
  getMobileTerminatedStatuses,
  getMobileTerminatedMessages,
  getMobileIds,
  getBroadcastIds,
  dateToIdpTime,
  idpTimeToDate,
};
