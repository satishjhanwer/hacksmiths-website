var keystone = require('keystone'),
	async = require('async'),
	_ = require('underscore'),
	moment = require('moment'),
	crypto = require('crypto');

exports = module.exports = function(req, res) {

	var data = { events: {}, scheduleItems: {}, teams: {}, rsvp: {} };

	async.series([
		function(next) {
			if (!req.body.user) return next();
			keystone.list('User').model.findById(req.body.user).exec(function(err, user) {
				if (err || !user) return next();
				data.user = user;
				return next();
			});
		},
		function(next) {
			keystone.list('Event').model.findOne()
				.where('state', 'past')
				.sort('-startDate')
				.exec(function(err, event) {
					data.events.last = event ? event.toJSON() : false;
					return next();
				});
		},
		function(next) {
			keystone.list('Event').model.findOne()
				.where('state', 'active')
				.sort('-startDate')
				.populate('teams project sponsors')
				.exec(function(err, event) {
					data.events.next = event ? event.toJSON() : false;
					console.log(event);
					return next();
				});
		},
		function(next) {
			if (!data.events.last) return next();
			keystone.list('Team').model.find()
				.where('event', data.events.last)
				.populate('members')
				.sort('title')
				.exec(function(err, teams) {
					data.teams.current = teams.map(function(i) {
						return i.toJSON();
					});
					return next();
				});
		},
		function(next) {
			if (!data.events.next) return next();
			keystone.list('Schedule').model.find()
				.where('event', data.events.next)
				.populate('items')
				.populate('who')
				.exec(function(err, scheduleItems) {
					data.scheduleItems.next = scheduleItems && scheduleItems.length ? scheduleItems.map(function(i) {
						return i.toJSON();
					}) : false;
					return next();
				});
		},
		function(next) {
			if (!req.body.user) return next();
			if (!data.events.next) return next();
			keystone.list('RSVP').model.findOne()
				.where('who', data.user)
				.where('event', data.events.next)
				.exec(function(err, rsvp) {
					data.rsvp = rsvp;
					return next();
				});
		}
	], function(err) {

		var response = {
			success: true,
			config: {
				versions: {
					compatibility: process.env.APP_COMPATIBILITY_VERSION,
					production: process.env.APP_PRODUCTION_VERSION
				},
				killSwitch: false
			},
			events: {
				last: false,
				next: false
			},
			rsvp: {
				responded: false,
				attending: false
			},
			user: false
		};

		var parseEvent = function(event, current) {
			var eventData = {
				id: event._id,

				name: event.name,
				organization: event.organization,
				sponsors: event.sponsors,

				starts: event.startDate,
				ends: event.endDate,
				registrationStartDate: event.registrationStartDate,
				registrationEndDate: event.registrationEndDate,

				place: event.place,
				map: event.map,

				teams: event.teams,

				project: event.project,
				description: keystone.utils.cropString(keystone.utils.htmlToText(event.description), 250, '...', true),

				ticketsAvailable: event.rsvpsAvailable,
				ticketsRemaining: event.remainingRSVPs,

				scheduleItems: current ? data.scheduleItems.next : data.scheduleItems.last
			};
			eventData.hash = crypto.createHash('md5').update(JSON.stringify(eventData)).digest('hex');
			return eventData;
		};

		if (data.events.last) {
			response.events.last = parseEvent(data.events.last);
		}

		if (data.events.next && moment().isBefore(data.events.next.endDate)) {
			response.events.next = parseEvent(data.events.next, true);
			if (data.user) {
				response.rsvp.responded = data.rsvp ? true : false;
				response.rsvp.attending = data.rsvp && data.rsvp.attending ? true : false;
				response.rsvp.date = data.rsvp ? data.rsvp.changedAt : false;
			}
		}

		if (data.user) {
			response.user = {
				date: new Date().getTime(),
				userId: data.user.id,
				name: {
					first: data.user.name.first,
					last: data.user.name.last,
					full: data.user.name.full
				},
				email: data.user.email,
				avatar: data.user.avatarUrl
			};
		}

		res.apiResponse(response);

	});
};