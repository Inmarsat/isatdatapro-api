'use_strict';

const inmarsat = 'https://api.inmarsat.com/v1/idp/gateway/rest/';

const orbcomm = 'https://isatdatapro.skywave.com/GLGW/GWServices_v1/RestMessages.svc/';

const simulatorAddress = '192.168.1.120';
const simulatorPort = '8080';
const simulator = 'http://' + simulatorAddress + ':' + simulatorPort + '/GLGW/GWServices_v1/RestMessages.svc/';

module.exports = inmarsat;
