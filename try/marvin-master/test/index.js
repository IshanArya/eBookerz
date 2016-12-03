var assert = require('chai').assert;

describe('regex', function() {
	it('should match!', function() {
		var test = ' Type: @mp3heim For My List Of: 34,939 Files  Slots: 0/2  Queued: 1  Speed: 1,291,312cps  Next: 0m  Served: 0  List: Jun 8th  Search: ON  Mode: Normal ';
		var regex = /Type: @(.*) For My List Of.*/;
		var matches = test.match(regex);
		assert.equal('mp3heim', matches[1]);
	});
});