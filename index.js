'use strict';

const request = require('request');
const winston = require('./config/winston');

var logger = winston;

// TODO: move this to a config file so it can be either Inmarsat or ORBCOMM compatible
const API_URL = "https://api.inmarsat.com/v1/idp/gateway/rest/";

/**
 * @typedef {Object} ApiV1Auth
 * @param {string} accessId The mailbox unique access_id
 * @param {string} password The mailbox password
 */
/**
 * Returns a URI for an authenticated operation on the IDP API V1.  Replaces spaces with %20.
 * @param {string} baseUri The API operation e.g. get_return_messages
 * @param {ApiV1Auth} auth 
 * @param {Object} filters 
 * @returns {string} a URI including formatted authentication and query parameters
 */
function getUri(baseUri, auth, filters) {
    var uri = baseUri + '?access_id=' + auth.accessId + '&password=' + auth.password;
    for (var f in filters) {
        if (filters.hasOwnProperty(f)) {
            uri += '&' + f + '=' + String(filters[f]);
        }
    }
    uri = uri.replace(/ /g,'%20').trim();
    return uri;
}

/**
 * Obfuscates the password from the URI query string sent to the Inmarsat MGS
 * TODO: support for password obfuscation on all operations
 * @param {string} debugMessage The message with password readable
 * @returns {string} Debug message with password obfuscated for logging
 */
function obfuscatePassword(debugMessage) {
    if (debugMessage.indexOf('"uri"') !== -1) {
        var obsPass = '***';
        var messageComponents = debugMessage.split('&');
        var replaceMessage = messageComponents[0];
        for (var c=1; c < messageComponents.length; c++) {
            if (messageComponents[c].split('=')[0] === 'password') {
                messageComponents[c] = 'password=' + obsPass;
            }
            replaceMessage += '&' + messageComponents[c];
        }
        return replaceMessage;
    } else {
        return debugMessage;
    }
}

/**
 * Retrieves API Version from the MGS as a Promise
 * @returns {string} version
 */
function info_version() {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + 'info_version.json/',
        };
        request.get(options, function(err, resp, body) {
            if (err) {
                logger.error(options.uri + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body);
                logger.debug(options.uri + ' returned ' + result);
                resolve(result);
            }
        })
    })
}

/**
 * Returns the MGS software version details
 * @returns {string} MGS software version
 */
async function getMgsVersion() {
    var mgsVersion = await info_version();
    return mgsVersion;
}

/**
 * Retrieves UTC time from the MGS as a Promise
 * @returns {string} UTC time formatted as 'YYYY-MM-DD hh:mm:ss'
 */
function info_utc_time() {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + 'info_utc_time.json/',
        };
        request.get(options, function(err, resp, body) {
            if (err) {
                logger.error(options.uri + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body);
                logger.debug(options.uri + ' returned ' + result);
                resolve(result);
            }
        })
    })
}

/**
 * Returns current UTC time at the MGS
 * @returns {string} UTC time formatted as 'YYYY-MM-DD hh:mm:ss'
 */
async function getUtcTime() {
    var utcTime = await info_utc_time();
    return utcTime;
}

/**
 * @typedef {Object} ErrorDefinition
 * @property {number} ID The unique error number
 * @property {string} Name The unique name
 * @property {string} Description A verbose description of the error
 */
/**
 * Retreives error definitions from the MGS as a Promise
 * @returns {[ErrorDefinition]} An array of error definitions
 */
function info_errors() {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + 'info_errors.json/',
        };
        request.get(options, function(err, resp, body) {
            if (err) {
                logger.error(options.uri + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body);
                logger.debug(options.uri + ' returned ' + result.length + ' error codes');
                resolve(result);
            }
        })
    })
}

/**
 * Returns a descriptive error name based on an API error code
 * @param {(string|number)} errorId The ErrorID number returned by the API operation
 * @returns {string} An error name/description or 'UNDEFINED'
 */
async function getErrorName(errorId) {
    var errorName = 'UNDEFINED';
    var errorDescriptions = await info_errors();
    errorDescriptions.forEach(function(element) {
        if (Number(element.ID) === Number(errorId)) {
            errorName = element.Name;
        }
    })
    return errorName;
}

/**
 * Returns an array of error name based on an API error code
 * @returns {[ErrorDefinition]} An array of error definitions
 */
async function getErrorDefinitions() {
    var errorDefinitions = await info_errors();
    return errorDefinitions;
}

/**
 * A data structure containing various content and metadata for data transported over the satellite network, within a message
 * @typedef {Object} Field
 * @property {string} Name A descriptive name of the field, usually in camelCase notation
 * @property {string} [Type] Supported types enum, boolean, unsignedint, signedint, string, data, array, message, dynamic, property
 * @property {(string|number|number[]|Object)} Value Dependent on Type
 * @property {Object[]} [Elements] present if Type is array or message
 * @property {number} [Elements.Index] index of the Elements array
 * @property {Field[]} [Elements.Fields] present if Type is message
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
 * @property {number[]} [RawPayload] An array of bytes as decimal numbers (0..255), present if requested in the get_return_messages operation
 * @property {Message} [Payload] A JSON data structure present if the MGS has decoded the raw payload using a Message Definition File on the Mailbox
 */
/**
 * A filter to apply to the get_return_messages operation when retrieving Mobile-Originated messages
 * @typedef {Object} ReturnMessageFilter
 * @property {string} [start_utc] High water mark timestamp format YYYY-MM-DD hh:mm:ss, required if from_id is not present, ignored if from_id is present
 * @property {number} [from_id] High water mark unique ReturnMessage.ID, required if start_utc is not present
 * @property {string} [end_utc] Optional end time if start_utc is used, to return a range of messages (ratehr than all since start_utc)
 * @property {string} [mobile_id] Optional filter to retrieve only messages for a single terminal/modem
 * @property {boolean} [include_raw_payload] A flag indicating if ReturnMessage.RawPayload should be returned
 * @property {boolean} [include_type] A flag indicating if Fields should include the Type property
 */

/**
 * The JSON structure response to the get_return_messages operation
 * @typedef {Object} GetReturnMessagesResponse
 * @property {number} ErrorID An API error code (0 means no error)
 * @property {boolean} More A flag indicating if more messages are available to retrieve
 * @property {string} NextStartUTC Timestamp 'YYYY-MM-DD hh:mm:ss' for the next high water mark retrieval
 * @property {number} NextStartID Unique ReturnMessage.ID of the next message available to retrieve from the MGS/Mailbox
 * @property {(ReturnMessage[]|null)} Messages An array of message objects or null if none meet the filter/range criteria
 */
/**
 * Returns a Promise for an array of ReturnMessage
 * @param {ApiV1Auth} auth Mailbox authentication parameters
 * @param {ReturnMessageFilter} filter Filter to apply for Mobile-Originated message retrieval
 * @returns {GetReturnMessagesResponse} Array of Mobile-Originated messages/metadata
 */
function get_return_messages(auth, filter) {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + getUri('get_return_messages.json/', auth, filter),
        };
        request.get(options, function(err, resp, body) {
            if (err) {
                logger.error(obfuscatePassword(options.uri) + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body);
                var messagesRetrievedCount = result.Messages !== null ? result.Messages.length : 0;
                var moreMessages = result.More ? ' more messages from ' + result.NextStartID : '';
                logger.debug(messagesRetrievedCount + ' messages retrieved from Mailbox ' + auth.accessId + moreMessages);
                resolve(result);
            }
        })
    })
}

/**
 * Returns a response object containing retrieved messages that match the 
 * @param {ApiV1Auth} auth Mailbox authentication parameters
 * @param {(string|number)} highWaterMark The time 'YYYY-MM-DD hh:mm:ss' or unique ReturnMessage.ID to retrieve from
 * @param {string} [endTime] The later time bound 'YYYY-MM-DD hh:mm:ss' for a retrieval window
 * @param {string} [mobileId] An optional filter to return only messages from the specified unique ID
 * @returns {GetReturnMessagesResponse} A response object
 */
async function getMobileOriginated(auth, highWaterMark, endTime, mobileId) {
    var filter = {
        include_raw_payload: true,
        include_type: true,
    };
    if (typeof(highWaterMark) === 'number') {
        filter.from_id = highWaterMark;
    } else {
        filter.start_utc = highWaterMark;
    }
    if (typeof(endTime) === 'string') {
        filter.end_utc = endTime;
    }
    if (typeof(mobileId) === 'string') {
        filter.mobile_id = mobileId;
    }
    var response = await get_return_messages(auth, filter);
    return response;
}

/**
 * @typedef {Object} ForwardMessage
 * @property {string} DestinationID A unique Mobile ID or Broadcast ID to send the message to
 * @property {string} [UserMessageID] An optional ID that may be used by your application to correlate to a system-assigned ForwardMessageID
 * @property {number[]} [RawPayload] Must be present if Payload is not present, an array of bytes as decimal values (0..255)
 * @property {Message} [Payload] Must be present if RawPayload is not present, implies that a Message Definition File is used on the Mailbox
 */
/**
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
 * @typedef {Object} SubmitForwardMessagesResult
 * @property {number} ErrorID An error code returned by the system (0 = no errors)
 * @property {ForwardSubmission[]} Submissions An array of Mobile-Terminated messages submitted in the operation
 */

/**
 * Submits Mobile-Terminated messages for transmitting over the network
 * @param {ApiV1Auth} auth Mailbox authentication credentials
 * @param {ForwardMessage[]} messages An array of Mobile-Terminated messages
 * @returns {SubmitForwardMessagesResult} A result object
 */
function submit_messages(auth, messages) {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + 'submit_messages.json/',
            body: {
                accessID: auth.accessId,
                password: auth.password,
                messages: messages
            }
        };
        request.post(options, function(err, resp, body) {
            if (err) {
                //TODO: ensure password is obfuscated if body is visible in debug
                logger.error(options.uri + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body).SubmitForwardMessages_JResult;
                var messagesSubmittedCount = result.Submissions !== null ? result.Submissions.length : 0;
                logger.debug(messagesSubmittedCount + ' messages sent to Mailbox ' + auth.accessId);
                resolve(result);
            }
        })
    })
}

/**
 * @typedef {Object} GetForwardMessagesResult
 * @property {number} ErrorID An error code for the get_forward_messages operation
 * @property {ForwardMessage[]} Messages An array of messages
 */
/**
 * Retrieves submitted Mobile-Terminated messages by ID
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {string} fwIds Comma-separated list of ForwardMessageID
 * @returns {GetForwardMessagesResult} The retrieved message objects
 */
function get_forward_messages(auth, fwIds) {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + getUri('get_forward_messages.json/', auth, { fwIDs: fwIds }),
        };
        request.get(options, function(err, resp, body) {
            if (err) {
                logger.error(obfuscatePassword(options.uri) + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body);
                var messagesRetrievedCount = result.Messages !== null ? result.Messages.length : 0;
                logger.debug(messagesRetrievedCount + ' messages retrieved from Mailbox ' + auth.accessId);
                resolve(result);
            }
        })
    })
}

/**
 * Retrieves Mobile-Terminated messages submitted, by ID
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {(number|number[])} ids An array of unique ForwardMessageID numbers
 * @returns {GetForwardMessagesResult} The requested IDs and/or error code
 */
async function getMobileTerminated(auth, ids) {
    var fwIds = '';
    if (typeof(ids) === 'number') {
        ids = [ids];
    }
    for (var i = 0; i < ids.length; i++) {
        if (i > 0) {
            fwIds += ',';
        }
        fwIds += toString(ids[i]);
    }
    var response = await get_forward_messages(auth, fwIds);
    return response;
}

/**
 * Submits Mobile-Terminated message(s) to remote modem(s)
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {ForwardMessage[]} messages An array of messages
 */
async function submitMobileTerminated(auth, messages) {
    var response = await submit_messages(auth, messages);
    return response;
}

/**
 * @typedef {Object} ForwardStatus
 * @property {number} ErrorID An error code for the Mobile-Terminated message
 * @property {number} ForwardMessageID The unique ID of the message assigned by the system
 * @property {boolean} IsClosed An indicator whether the message is no longer pending (delivered or failed)
 * @property {number} ReferenceNumber 
 * @property {string} StateUTC The timestamp 'YYYY-MM-DD hh:mm:ss' of the reported state of the message
 * @property {number} State The state/status code of the message
 */
/**
 * @typedef {Object} GetForwardStatusesResult
 * @property {number} ErrorID An error code returned for the get_forward_statuses operation
 * @property {boolean} More An indicator if additional statuses are available for retrieval
 * @property {string} NextStartUTC The timestamp 'YYYY-MM-DD hh:mm:ss' for the next retrieval
 * @property {(ForwardStatus[]|null)} Statuses An array of statuses if any were retrieved, otherwise null
 */
/**
 * @typedef {Object} ForwardStatusFilter
 * @property {string} fwIDs A list of comma-separated unique ForwardMessageID numbers being queried
 * @property {string} [start_utc] The timestamp 'YYYY-MM-DD hh:mm:ss' for the start of retrieval
 * @property {string} [end_utc] The timestamp 'YYYY-MM-DD hh:mm:ss' for the end of retrieval
 */

/**
 * Retrieves Mobile-Terminated message statuses by ID or time range
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {ForwardStatusFilter} filter Filter of IDs and/or time range to retrieve
 * @returns {GetForwardStatusesResult} The operation result
 */
function get_forward_statuses(auth, filter) {
    return new Promise(function(resolve, reject){
        var options = {
            uri: API_URL + getUri('get_forward_statuses.json/', auth, filter),
        };
        request.get(options, function(err, resp, body) {
            if (err) {
                logger.error(obfuscatePassword(options.uri) + ' returned ' + err);
                reject(err);
            } else {
                var result = JSON.parse(body);
                var messagesStatusesCount = result.Statuses !== null ? result.Statuses.length : 0;
                logger.debug(messagesStatusesCount + ' statuses retrieved from Mailbox ' + auth.accessId);
                resolve(result);
            }
        })
    })
}

/**
 * Retrieves Mobile-Terminated message statuses by ID and optional time range
 * @param {ApiV1Auth} auth Mailbox authentication
 * @param {(number|number[])} ids 
 * @param {string} startTime 
 * @param {string} endTime 
 * @returns {GetForwardStatusesResult} result
 */
async function getMobileTerminatedStatuses(auth, ids, startTime, endTime) {
    var filter = {};
    if (typeof(ids) === 'number') {
        filter.fwIDs = toString(ids);
    } else if (typeof(ids) === 'object') {
        var fwIDs = '';
        for (var i = 0; i < ids.length; i++) {
            if (i > 0) {
                fwIDs += ',';
            }
            fwIDs += toString(ids[i]);
        }
        filter.fwIDs = fwIDs;
    }
    if (typeof(startTime) === 'string') {
        filter.start_utc = startTime;
    }
    if (typeof(endTime) === 'string') {
        filter.end_utc = endTime;
    }
    var response = await get_forward_statuses(auth, filter);
    return response;
}

module.exports = {
    getMgsVersion,
    getUtcTime,
    getErrorName,
    getErrorDefinitions,
    getMobileOriginated,
    submitMobileTerminated,
    getMobileTerminatedStatuses,
    getMobileTerminated,
};
