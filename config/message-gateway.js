/**
 * Message gateway system configuration for isatdatapro-api provides the URL of the MGS being used
 * Set module.exports to inmarsat, simulator or orbcomm
 * Change simulator IP address and/or port as appropriate to your simulation environment
 * @module ./config/message-gateway
 */

'use_strict';

const inmarsat = 'https://api.inmarsat.com/v1/idp/gateway/rest/';

const orbcomm = 'https://isatdatapro.skywave.com/GLGW/GWServices_v1/RestMessages.svc/';

const simulatorAddress = '192.168.1.120';
const simulatorPort = '8080';
const simulator = 'http://' + simulatorAddress + ':' + simulatorPort + '/GLGW/GWServices_v1/RestMessages.svc/';

/** The base URL for the IDP API implementation being used */
module.exports = inmarsat;
