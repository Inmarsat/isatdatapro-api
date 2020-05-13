const ERROR_DEFINITION = {
  'ID': 'errorId',
  'Name': 'name',
  'Description': 'description',
};
const MESSAGE_PAYLOAD_JSON = {
  'IsForward': 'isForward',
  'SIN': 'serviceCode',
  'MIN': 'messageCode',
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
  'SIN': 'serviceCode',
  'RawPayload': 'payloadRaw',
  'Payload': 'payloadJson',
  'ReceiveUTC': 'receiveTime',
  'MessageUTC': 'mailboxTime',
  'RegionName': 'satelliteRegion',
  'OTAMessageSize': 'size',
};
const RETURN_MESSAGE = Object.assign(
  RETURN_MESSAGE_WRAPPER,
  MESSAGE_PAYLOAD_JSON
);
const GET_RETURN_WRAPPER = {
  'ErrorID': 'errorId',
  'More': 'more',
  'NextStartUTC': 'nextStartTime',
  'NextStartID': 'nextStartId',
  'Messages': 'messages',
};
const GET_RETURN = Object.assign(
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
  'StateUTC': 'stateTime',
  'TerminalWakeupPeriod': 'mobileWakeupPeriod',
  'ScheduledSendUTC': 'scheduledSendTime',
};
const GET_FORWARD_WRAPPER = {
  'ErrorID': 'errorId',
  'Messages': 'messages',
  'DestinationID': 'mobileId',
  'ID': 'messageId',
  'RawPayload': 'payloadRaw',
  'Payload': 'payloadJson',
  'CreateUTC': 'mailboxTime',
  'StatusUTC': 'stateTime',
  'State': 'state',
  'ErrorID': 'errorId',
  'IsClosed': 'isClosed',
  'ReferenceNumber': 'referenceNumber',
};
const GET_FORWARD = Object.assign(
  GET_FORWARD_WRAPPER,
  MESSAGE_PAYLOAD_JSON
);
const GET_STATUSES = {
  'ErrorID': 'errorId',
  'More': 'more',
  'NextStartUTC': 'nextStartTime',
  'Statuses': 'statuses',
  'ForwardMessageID': 'messageId',
  'IsClosed': 'isClosed',
  'ReferenceNumber': 'referenceNumber',
  'StateUTC': 'stateTime',
  'State': 'state',
};
const MOBILE_OR_BROADCAST_INFO = {
  'ErrorID': 'errorId',
  'Mobiles': 'mobiles',
  'BroadcastInfos': 'broadcastGroups',
  'ID': 'mobileId',
  'Description': 'description',
  'LastRegistrationUTC': 'lastRegistrationTime',
  'RegionName': 'satelliteRegion',
};

module.exports = {
  ERROR_DEFINITION,
  RETURN_MESSAGE,
  GET_RETURN,
  FORWARD_MESSAGE,
  SUBMIT_OR_CANCEL_FORWARD,
  GET_FORWARD,
  GET_STATUSES,
  MOBILE_OR_BROADCAST_INFO,
};
