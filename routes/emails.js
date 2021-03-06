/**
 * This file defines the email tests for your project.
 *
 * Each email test should provide the locals used to render the
 * email template for preview.
 *
 * Values can either be an object (for simple tests), or a
 * function that calls a callback(err, locals).
 *
 * Sample generated emails, based on the keys and methods below,
 * can be previewed at /keystone/test-email/{key}
 */

var keystone = require('keystone');

module.exports = {

	/** New Inquiry Notifications */

	'inquiry-notification': function(req, res, callback) {

		// To test inquiry notifications we create a dummy inquiry that
		// is not saved to the database, but passed to the template.

		var Inquiry = keystone.list('Inquiry');

		var newInquiry = new Inquiry.model({
			name: { first: 'Test', last: 'User' },
			email: 'contact@hacksmiths.io',
			phone: '+61 2 1234 5678',
			inquiryType: 'message',
			message: { md: 'Nice inquiry notification.' }
		});

		callback(null, {
			admin: 'Admin User',
			inquiry: newInquiry,
			inquiry_url: '/keystone/inquiries/'
		});

	}

};
