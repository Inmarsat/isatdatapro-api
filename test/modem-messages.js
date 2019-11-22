'use strict';

var modemRegistration = {
    Payload: {
        //IsForward: false,
        Name: 'modemRegistration',
        SIN: 0,
        MIN: 0,
        Fields: [
            { Name:'hardwareMajorVersion', Value:'3', Type:'unsignedint' },
            { Name:'hardwareMinorVersion', Value:'1', Type:'unsignedint' },
            { Name:'softwareMajorVersion', Value:'3', Type:'unsignedint' },
            { Name:'softwareMinorVersion', Value:'3', Type:'unsignedint' },
            { Name:'product', Value:'6', Type:'unsignedint' },
            { Name:'wakeupPeriod', Value:'None', Type:'enum' },
            { Name:'lastResetReason', Value:'PowerOn', Type:'enum' },
            { Name:'virtualCarrier', Value:'101', Type:'unsignedint' },
            { Name:'beam', Value:'4', Type:'unsignedint' },
            { Name:'vain', Value:'0', Type:'unsignedint' },
            { Name:'operatorTxState', Value:'0', Type:'unsignedint' },
            { Name:'userTxState', Value:'0', Type:'unsignedint' },
            { Name:'broadcastIDCount', Value:'0', Type:'unsignedint' }
        ]
    },
    //RawPayload: [0, 0, ...]
};

var beamRegistration = {
    //TODO: confirm Name, Fields
    Payload: {
        //IsForward: false,
        Name: 'beamRegistration',
        SIN: 0,
        MIN: 1,
        Fields: [
            //{ Name:'vcID', Value:'0', Type:'unsignedint' },
            //{ Name:'beamNumber', Value:'0', Type:'unsignedint' },
        ]
    },
    //RawPayload: [0, 1, ]
};

var protocolError = {
    Payload: {
        //IsForward: false,
        Name: 'protocolError',
        SIN: 0,
        MIN: 2,
        Fields: [
            { Name:'messageReference', Value:'7', Type:'unsignedint' },
            { Name:'errorCode', Value:'2', Type:'unsignedint' },
            { Name:'errorInfo', Value:'255', Type:'unsignedint' },
        ]
    },
    //RawPayload: [0, 2, ]
};

const ModemResetTypes = [
    'modemPreserve',   // retains the modem queue
    'modemFlush',   // clears the modem queue
    'terminal',   // asserts a 'host' reset pin on supported modems
    'terminalModemFlush',   // asserts 'host' reset pin on supported modems and clears modem queue
];

var resetRequest = {
    Payload: {
        IsForward: true,
        Name: 'reset',
        SIN: 0,
        MIN: 68,
        Fields: [
            { Name:'resetType', Value:'modemFlush', Type:'enum' },
        ]
    },
    //RawPayload: [0, 68, ]
};

const WakeupPeriods = [
    'None',
    'Seconds30',
    'Seconds60',
    'Minutes3',
    'Minutes10',
    'Minutes30',
    'Minutes60',
    'Minutes2',
    'Minutes5',
    'Minutes15'
];

/**
 * Returns the number of seconds in the wakeupPeriod or -1 if undefined
 * @param {string} wakeupPeriod The enumerated value for wakeupPeriod
 * @returns {number} seconds in the wakeupPeriod
 */
function getWakeupPeriodSeconds(wakeupPeriod) {
    switch (wakeupPeriod) {
        case 'None':
            return 5;
        default:
            if (wakeupPeriod.includes('Seconds') || wakeupPeriod.includes('Minutes')) {
                return Number(wakeupPeriod.slice(7));
            } else {
                return -1;
            }
    }
}

var setSleepSchedule = {
    Payload: {
        IsForward: true,
        Name: 'setSleepSchedule',
        SIN: 0,
        MIN: 70,
        Fields: [
            { Name:'wakeupPeriod', Value:'Seconds30', Type:'enum' }
        ]
    },
    //RawPayload: [0, 70, ]
};

var sleepScheduleChange = {
    Payload: {
        //IsForward: false,
        Name: 'sleepSchedule',
        SIN: 0,
        MIN: 70,
        Fields: [
            { Name:'wakeupPeriod', Value:'Seconds30', Type:'enum'},
            { Name:'mobileInitiated', Value:'False', Type:'boolean'},
            { Name:'messageReference', Value:'135', Type:'unsignedint'}
        ]
    },
    //RawPayload: [0, 70, ]
};

var muteRequest = {
    Payload: {
        IsForward: true,
        Name: 'muteTx',
        SIN: 0,
        MIN: 71,
        Fields: [
            { Name:'mute', Value:'true', Type:'boolean' },
        ]
    }
};

var locationRequest = {
    Payload: {
        IsForward: true,
        Name: 'requestPosition',
        SIN: 0,
        MIN: 72,
        Fields: []
    },
    RawPayload: [0, 72]
};

/**
 * Returns the date from a day and minute, assuming the message was sent in the current month
 * @param {number} dayOfMonth Day of the month 1..31
 * @param {number} minuteOfDay Minute of the day 0..1439
 * @returns {string} Date object
 */
function timestampFromDayMinute(dayOfMonth, minuteOfDay) {
    var dateObj = new Date();
    var month = dateObj.getUTCMonth();   //months from 0-11
    var year = dateObj.getUTCFullYear();
    var hour = minuteOfDay / 60;
    var minute = minuteOfDay % 60;
    var tsDate = new Date(year, month, dayOfMonth, hour, minute);
    return tsDate;
}

var locationReply = {
    Payload: {
        //IsForward: false,
        Name: 'position',
        SIN: 0,
        MIN: 72,
        Fields: [
            { Name: 'fixStatus', Value: 1, Type: 'unsignedint' },
            { Name: 'latitude', Value: 2717105, Type: 'signedint' },
            { Name: 'longitude', Value: -4550914, Type: 'signedint' },
            { Name: 'altitude', Value: 89, Type: 'signedint' },
            { Name: 'speed', Value: 0, Type: 'unsignedint' },
            { Name: 'heading', Value: 90, Type: 'unsignedint' },
            { Name: 'dayOfMonth', Value: 1, Type: 'unsignedint' },
            { Name: 'minuteOfDay', Value: 1, Type: 'unsignedint' },
        ]
    },
    //RawPayload = [0, 72, ...]
};

var configRequest = {
    Payload: {
        IsForward: true,
        Name: 'config',
        SIN: 0,
        MIN: 97,
        Fields: []
    },
    RawPayload: [0, 97]
};

var configReply = {
    Payload: {
        //IsForward: false,
        Name: 'config',
        SIN: 0,
        MIN: 97,
        Fields: [
            { Name:'hardwareMajorVersion', Value:'3', Type:'unsignedint' },
            { Name:'hardwareMinorVersion', Value:'1', Type:'unsignedint' },
            { Name:'softwareMajorVersion', Value:'3', Type:'unsignedint' },
            { Name:'softwareMinorVersion', Value:'3', Type:'unsignedint' },
            { Name:'product', Value:'6', Type:'unsignedint' },
            { Name:'wakeupPeriod', Value:'None', Type:'enum' },
            { Name:'lastResetReason', Value:'PowerOn', Type:'enum' },
            { Name:'virtualCarrier', Value:'101', Type:'unsignedint' },
            { Name:'beam', Value:'4', Type:'unsignedint' },
            { Name:'vain', Value:'0', Type:'unsignedint' },
            { Name:'operatorTxState', Value:'0', Type:'unsignedint' },
            { Name:'userTxState', Value:'0', Type:'unsignedint' },
            { Name:'broadcastIDCount', Value:'0', Type:'unsignedint' }
        ]
    },
    //RawPayload: [0, 97, ]
};

/**
 * Returns the expected 'requestTime' or 'responseTime' conversion for ping operations
 * @param {string} timestamp Datestamp UTC in ISO format
 * @returns {number} a 'ping' message-compatible timestamp modulo 65535
 */
function pingRequestTime(timestamp) {
    var d;
    if (typeof(timestamp) === 'undefined') {
        d = new Date();
    } else {
        d = new Date(timestamp);
    }
    return (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) % 65535;
}

var pingModemRequest = {
    Payload: {
        IsForward: true,
        Name: 'mobilePing',
        SIN: 0,
        MIN: 112,
        Fields: [
            //{ Name: 'requestTime', Type: 'unsignedint', Value: 0 },
        ]
    },
    //RawPayload: [0, 112, 0, 0]
};

var pingModemReply = {
    Payload: {
        IsForward: false,
        Name: 'mobilePing',
        SIN: 0,
        MIN: 112,
        Fields: [
            { Name: 'requestTime', Value: 4339, Type: 'unsignedint' },
            { Name: 'responseTime', Value: 4344, Type: 'unsignedint' },
        ]
    },
    //RawPayload: [0, 112, ...]
};

var pingNetworkRequest = {
    Payload: {
        //IsForward: false,
        //Name: 'networkPing',
        SIN: 0,
        MIN: 113,
        Fields: []
    },
    RawPayload: [0, 113]
};

var lastRxInfoRequest = {
    Payload: {
        IsForward: true,
        Name: 'lastRxMetrics',
        SIN: 0,
        MIN: 98,
        Fields: []
    },
    RawPayload: [0, 98]
};

var lastRxInfoReply = {
    Payload: {
        //IsForward: false,
        Name: 'lastRxMetrics',
        SIN: 0,
        MIN: 98,
        Fields: [
            {"Name":"sipValid","Value":"True","Type":"boolean"},
            {"Name":"subframe","Value":"15506","Type":"unsignedint"},
            {"Name":"packets","Value":"1","Type":"unsignedint"},
            {"Name":"packetsOK","Value":"1","Type":"unsignedint"},
            {"Name":"frequencyOffset","Value":"483","Type":"unsignedint"},
            {"Name":"timingOffset","Value":"2","Type":"unsignedint"},
            {"Name":"packetCNO","Value":"388","Type":"unsignedint"},
            {"Name":"uwCNO","Value":"388","Type":"unsignedint"},
            {"Name":"uwRSSI","Value":"156","Type":"unsignedint"},
            {"Name":"uwSymbols","Value":"124","Type":"unsignedint"},
            {"Name":"uwErrors","Value":"6","Type":"unsignedint"},
            {"Name":"packetSymbols","Value":"2860","Type":"unsignedint"},
            {"Name":"packetErrors","Value":"132","Type":"unsignedint"}
        ]
    },
};

const MetricsPeriods = [
    'SinceReset',
    'LastPartialMinute',
    'LastFullMinute',
    'LastPartialHour',
    'LastFullHour',
    'LastPartialDay',
    'LastFullDay',
];

var rxMetricsRequest = {
    Payload: {
        IsForward: true,
        Name: 'rxMetrics',
        SIN: 0,
        MIN: 99,
        Fields: [
            { Name:'period', Value:'LastFullMinute', Type:'enum' },
        ]
    },
    //RawPayload: [0, 99, 2]
};

var rxMetricsReply = {
    Payload: {
        //IsForward: false,
        Name: 'rxMetrics',
        SIN: 0,
        MIN: 99,
        Fields: [
            { Name:'period', Value:'lastFullMinute', Type:'enum' },
            { Name:'packets', Value:'12', Type:'unsignedint' },
            { Name:'packetsOK', Value:'12', Type:'unsignedint' },
            { Name:'averageCNO', Value:'409', Type:'unsignedint' },
            { Name:'samples', Value:'12', Type:'unsignedint' },
            { Name:'channelErrorRate', Value:'2', Type:'unsignedint' },
            { Name:'uwErrorRate', Value:'1', Type:'unsignedint' },
        ]
    },
    //RawPayload: [0, 99, ]
};

var txMetricsRequest = {
    Payload: {
        IsForward: true,
        Name: 'txMetrics',
        SIN: 0,
        MIN: 100,
        Fields: [
            { Name:'period', Value:'lastFullMinute', Type:'enum' },
        ]
    },
    //RawPayload: [0, 100, 2]
};

var txMetricsReply = {
    Payload: {
        //IsForward: false,
        Name: 'txMetrics',
        SIN: 0,
        MIN: 100,
        Fields: [
            {"Name":"period","Value":"SinceReset","Type":"enum"},
            {"Name":"packetTypeMask","Value":"3","Type":"unsignedint"},
            {
                "Name":"txMetrics",
                "Type":"array",
                "Elements":[
                    {
                        "Index":0,
                        "Fields":[
                            {"Name":"PacketsTotal","Value":"5","Type":"unsignedint"},
                            {"Name":"PacketsSuccess","Value":"5","Type":"unsignedint"},
                            {"Name":"PacketsFailed","Value":"0","Type":"unsignedint"}
                        ]
                    },{
                        "Index":1,
                        "Fields":[
                            {"Name":"PacketsTotal","Value":"2","Type":"unsignedint"},
                            {"Name":"PacketsSuccess","Value":"2","Type":"unsignedint"},
                            {"Name":"PacketsFailed","Value":"0","Type":"unsignedint"}
                        ]
                    }
                ]
            }
        ]
    }
};

var broadcastIdsRequest = {
    Payload: {
        IsForward: true,
        Name: 'broadcastIDs',
        SIN: 0,
        MIN: 115,
        Fields: []
    },
    RawPayload: [0, 115]
};

var broadcastIdsReply = {
    Payload: {
        //IsForward: false,
        Name: 'broadcastIDs',
        SIN: 0,
        MIN: 115,
        Fields: [
            {"Name":"broadcastIDs","Type":"array","Elements":[
                {"Index":0,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":1,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":2,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":3,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":4,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":5,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":6,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":7,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":8,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":9,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":10,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":11,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":12,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":13,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":14,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]},
                {"Index":15,"Fields":[{"Name":"id","Value":"0","Type":"unsignedint"}]}
            ]}
        ]
    },
};

var skywaveLockedModem = {
    Payload: {
        //IsForward: false,
        //Name: 'undefined',
        SIN: 15,
        MIN: 255,
        Fields: []
    },
};

module.exports = {
    modemRegistration,
    beamRegistration,
    protocolError,
    ModemResetTypes,
    resetRequest,
    WakeupPeriods,
    getWakeupPeriodSeconds,
    setSleepSchedule,
    sleepScheduleChange,
    muteRequest,
    locationRequest,
    locationReply,
    timestampFromDayMinute,
    configRequest,
    configReply,
    pingRequestTime,
    pingModemRequest,
    pingModemReply,
    pingNetworkRequest,
    lastRxInfoRequest,
    lastRxInfoReply,
    MetricsPeriods,
    rxMetricsRequest,
    rxMetricsReply,
    txMetricsRequest,
    txMetricsReply,
    broadcastIdsRequest,
    broadcastIdsReply,
    skywaveLockedModem
};
