'use strict';

//process.env.NODE_ENV = 'production'
const chai = require('chai');
chai.config.includeStack = false;
const expect = chai.expect;
const idpApi = require('../lib/api-v1');

/*
(function() {
  let d = new Date();
  let dString = d.toISOString();
  console.log(idpApi.dateToIdpTime(d));
  console.log(idpApi.dateToIdpTime(dString));
  console.log(idpApi.dateToIdpTime('other'));
})();
*/

describe('#getWakeupPeriod()', function () {
  
  context('default', function() {
    it('should return 1', function() {
      expect(idpApi.getWakeupPeriod(30)).to.equal(1);
    })
  });

  context('with asString=true', function() {
    it('should return "Seconds30"', function() {
      expect(idpApi.getWakeupPeriod(30, true)).to.equal('Seconds30');
    })
  });

});
