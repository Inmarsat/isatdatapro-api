# ISATDATAPRO-API

A library of functions to interface with Inmarsat's IsatData Pro ("IDP") satellite IoT service

## Getting Started

You should familiarize yourself with the key concepts of the IDP system, particularly the message structure 
and Mailbox polling for message collection and submission.

### Key Concepts

#### Mailboxes and Mobile IDs

All data is transacted through the IDP system via a Mailbox concept that provides a unique access credential 
typically mapped either to your particular application use-case, or to your customer's span of control.

Modems on the network use globally unique Mobile ID serial numbers for addressing, where any number of 
Mobile IDs may be provisioned against a particular Mailbox.

#### Messages

Messages are binary blobs sent over the satellite network that may optionally be mapped to a codec 
provisioned on a Mailbox.

**SIN** (Service Identification Number) is the first byte of the message payload, 
where values from 0..15 are reserved for system / manufacturer use.

**MIN** (Message Identification Number) is the second byte of the message payload, 
used only when a message codec has been provisioned on the Mailbox.

**RawPayload** presents a decimal-encoded byte array including SIN and MIN bytes

**Payload** is optionally present if the Inmarsat-supported codec format(s) are used, messages will be presented 
as JSON objects represented by some metadata and a data field structure:
```
{
  "SIN": 255,
  "MIN": 255,
  "Name": "myMessageName",
  "Fields": [
    {
      "Name": "myFieldName",
      "Type": "unsignedint",
      "Value": 0
    }
  ]
}
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

* *message-gateway.js* sets up the active IDP gateway URL being used
* *winston.js* sets up logging defaults to the **./logs** subdirectory of your project

### Testing

The **./test** directory contains various Mocha/Chai test cases exercising the operations
and expected returns, as well as a template to configure Mailbox credentials

```
idpApi.getMobileOriginatedMessages(auth, filter)
  .then(function (result) {
    expect(result)
      .to.be.an('Object')
      .that.has.all.keys('ErrorID', 'Messages', 'More', 'NextStartUTC', 'NextStartID');
    expect(result.ErrorID).to.equal(0);
    if (result.Messages !== null) {
      for (let i = 0; i < result.Messages.length; i++) {
        let message = result.Messages[i];
        expect(message)
          .to.be.an('Object')
          .that.includes.all.keys('ID', 'MobileID', 'ReceiveUTC', 'MessageUTC', 'RegionName', 'SIN');
        if (mailboxIndex === 1) expect(message).to.include.key('OTAMessageSize');
        if (message.RawPayload) expect(message.RawPayload).to.be.an('Array');
        if (message.Payload) expect(message.Payload).to.have.all.keys('SIN', 'MIN', 'Name', 'Fields');
      }
    }
    expect(result.NextStartID).to.be.a('number');
  })
  .catch(err => {
    console.log(err);
  });
```

## Deployment

Generally you would set up a set of Mailboxes to poll periodically on a timer, for example every 10 seconds 
for Mobile-Originated messages and every 10 seconds for Mobile-Terminated statuses if any messages have 
been submitted.

Typically you would filter duplicates based on unique message ID and put retrieved 
or submitted messages into a database.  Also your system must keep track of **NextStartUTC** 
for successive message retrieval calls.

## Authors

* **Geoff Bruce-Payne** - *Initial work*

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details
