'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');

describe('#getStateDefinition()', function() {
  let state = 0;
  let stateDef = idpApi.getStateDefinition(state);
  it('should return SUBMITTED', function() {
    expect(stateDef).to.equal('SUBMITTED');
  })
});
