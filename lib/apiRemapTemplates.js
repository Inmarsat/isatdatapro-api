/**
 * Constants remapping/abstracting native API keys to Javascript camelcase
 */

const SIN = 'codecServiceId';
const MIN = 'codecMessageId';
const ERROR_DEFINITION = {
  'ID': 'errorId',
  'Name': 'name',
  'Description': 'description',
};
const MESSAGE_PAYLOAD_JSON = {
  'IsForward': 'isForward',
  'SIN': SIN,
  'MIN': MIN,
  'Name': 'name',
  'Type': 'dataType',
  'Value': 'stringValue',
  'Elements': 'arrayElements',
  'Index': 'index',
  'Fields': 'fields',
  'Message': 'message',
};
const RETURN_MESSAGE_WRAPPER = {
  'ID': 'messageId',
  'MobileID': 'mobileId',
  'SIN': SIN,
  'RawPayload': 'payloadRaw',
  'Payload': 'payloadJson',
  'ReceiveUTC': 'receiveTimeUtc',
  'MessageUTC': 'mailboxTimeUtc',
  'RegionName': 'satelliteRegion',
  'OTAMessageSize': 'size',
};
const RETURN_MESSAGE = Object.assign(
  {},
  RETURN_MESSAGE_WRAPPER,
  MESSAGE_PAYLOAD_JSON
);
const GET_RETURN_WRAPPER = {
  'ErrorID': 'errorId',
  'More': 'more',
  'NextStartUTC': 'nextStartTimeUtc',
  'NextStartID': 'nextStartId',
  'Messages': 'messages',
};
const GET_RETURN = Object.assign(
  {},
  GET_RETURN_WRAPPER,
  RETURN_MESSAGE
);
const FORWARD_MESSAGE_WRAPPER = {
  'DestinationID': 'mobileId',
  'UserMessageID': 'userMessageId',
  'RawPayload': 'payloadRaw',
  'Payload': 'payloadJson',
};
const FORWARD_MESSAGE = Object.assign(
  {},
  FORWARD_MESSAGE_WRAPPER,
  MESSAGE_PAYLOAD_JSON
);
const SUBMIT_OR_CANCEL_FORWARD = {
  'ErrorID': 'errorId',
  'Submissions': 'submissions',
  'ForwardMessageID': 'messageId',
  'UserMessageID': 'userMessageId',
  'DestinationID': 'mobileId',
  'OTAMessageSize': 'size',
  'StateUTC': 'stateTimeUtc',
  'TerminalWakeupPeriod': 'mobileWakeupPeriod',
  'ScheduledSendUTC': 'scheduledSendTimeUtc',
};
const GET_FORWARD_WRAPPER = {
  'ErrorID': 'errorId',
  'Messages': 'messages',
  'DestinationID': 'mobileId',
  'ID': 'messageId',
  'RawPayload': 'payloadRaw',
  'Payload': 'payloadJson',
  'CreateUTC': 'mailboxTimeUtc',
  'StatusUTC': 'stateTimeUtc',
  'State': 'state',
  'ErrorID': 'errorId',
  'IsClosed': 'isClosed',
  'ReferenceNumber': 'referenceNumber',
};
const GET_FORWARD = Object.assign(
  {},
  GET_FORWARD_WRAPPER,
  MESSAGE_PAYLOAD_JSON
);
const GET_STATUSES = {
  'ErrorID': 'errorId',
  'More': 'more',
  'NextStartUTC': 'nextStartTimeUtc',
  'Statuses': 'statuses',
  'ForwardMessageID': 'messageId',
  'IsClosed': 'isClosed',
  'ReferenceNumber': 'referenceNumber',
  'StateUTC': 'stateTimeUtc',
  'State': 'state',
};
const MOBILE_OR_BROADCAST_INFO = {
  'ErrorID': 'errorId',
  'Mobiles': 'mobiles',
  'BroadcastInfos': 'broadcastGroups',
  'ID': 'mobileId',
  'Description': 'description',
  'LastRegistrationUTC': 'lastRegistrationTimeUtc',
  'RegionName': 'satelliteRegion',
};

module.exports = {
  SIN,
  MIN,
  ERROR_DEFINITION,
  RETURN_MESSAGE,
  GET_RETURN,
  FORWARD_MESSAGE,
  SUBMIT_OR_CANCEL_FORWARD,
  GET_FORWARD,
  GET_STATUSES,
  MOBILE_OR_BROADCAST_INFO,
};
