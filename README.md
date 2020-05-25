# ISATDATAPRO-API

A library of functions to interface with Inmarsat's IsatData Pro ("IDP") satellite IoT messaging service.

[Library Documentation](https://gbrucepayne.github.io/isatdatapro-api/)

## Getting Started

You should familiarize yourself with the key concepts of the IDP system, particularly the message structure 
and Mailbox polling for message collection and submission.

### Key Concepts

#### Mailbox

All data is transacted through the IDP system via a Mailbox concept that provides a unique access credential 
typically mapped either to your particular application use-case, or to your customer's span of control.  Mailboxes have a unique authentication pair: *accessId* and *password*.

#### Mobile

Modems on the network use globally unique Mobile ID (*mobileId*) serial numbers for addressing, where any number of 
Mobile IDs may be provisioned against a particular Mailbox.

#### Message

Messages are binary blobs sent over the satellite network that may optionally be mapped to a codec 
provisioned on a Mailbox.  Each message has a globally unique *messageId* assigned by the system.

**Return** Messages are sent from the remote device, also called Mobile-Originated.

**Forward** Messages are sent to the remote device from your application server, 
also called Mobile-Terminated.

**SIN** (Service Identification Number) is the first byte of the message payload intended as a codec key, 
where values from 0..15 are reserved for system / manufacturer use.

**MIN** (Message Identification Number) is the second byte of the message payload intended as a secondary 
codec key, presented when a message codec has been provisioned on the Mailbox.

**Raw Payload** presents a decimal-encoded byte array including SIN and MIN bytes

**(JSON) Payload** is optionally presented.  If the Inmarsat-supported codec format(s) are used, 
messages will be presented as JSON objects represented by some metadata and a data field structure:

**Data Type** JSON payload fields with "Type": "data" use base64 encoded string representation

**Message Definition File** is an XML representation of the codec that may be provisioned (uploaded) to a Mailbox.  See developer.inmarsat.com for details.

##### Native API remapping

Version 1.0 of the library remaps the native Inmarsat API JSON tags to camelCase and abstracts certain 
concepts:

* *codecServiceId* replaces SIN
* *codecMessageId* replaces MIN
* *dataType* replaces Type within Fields
* *stringValue* replaces Value within Fields, which are represented as strings on the native API
* *payloadRaw* replaces RawPayload
* *payloadJson* replaces Payload
* *Time* replaces UTC and supports ISO String format to clearly represent Coordinated Universal Time
* *mailboxTime* replaces MessageUTC for Return messages and CreateUTC for Forward messages
* *stateTime* replaces StateUTC for (Forward) Submissions and StatusUTC for Forward Messages

Example Return message with Message Definition File for SIN=255 uploaded to its Mailbox:
```
"messageId": 123456789,
"receiveTime": "2020-05-22T07:14:44Z",
"mailboxTime": "2020-05-22T07:14:44Z",
"codecServiceId": 255,
"mobileId": "00000000MFREE3D",
"payloadRaw" [255, 255, 0],
"payloadJson": {
  "codecServiceId": 255,
  "codecMessageId": 255,
  "name": "myMessageName",
  "fields": [
    {
      "name": "myFieldName",
      "dataType": "unsignedint",
      "stringValue": "0"
    }
  ]
}
"regionName": "AMERRB16",
"size": 3
```


### Prerequisites

To use the system you will need a valid set of Mailbox credentials provided by your Inmarsat IDP service provider.

www.inmarsat.com

### Installing

Install from NPM in your project directory:
```
npm install isatdatapro-api
```

### Configuration

The library uses configuration file(s) in **./node_modules/isatdatapro-api/config**:

* *winston.js* sets up logging defaults to the **./logs** subdirectory of your project

### Testing

The **./test** directory contains various Mocha/Chai test cases exercising the operations
and expected returns, as well as a template to configure Mailbox credentials

## Deployment

Generally you would set up a set of Mailboxes to poll periodically on a timer, for example every 10 seconds 
for Mobile-Originated messages and every 10+n seconds for Mobile-Terminated statuses if any messages have 
been submitted.

Typically you would filter duplicates based on unique **messageId** and put retrieved 
or submitted messages into a database.  Also your system must keep track of **nextStartTime** or **nextStartId** as a *high water mark* for successive message or status retrieval calls.

Timeouts or HTTP errors will be indicated with a Promise rejection that includes an error message
'TIMEOUT_CONNECTION', 'TIMEOUT_READ', or 'HTTP \<*errorCode*\>'

## Authors

* **Geoff Bruce-Payne** - *Initial work* geoff.bruce-payne@inmarsat.com

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details
