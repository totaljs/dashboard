NEWSCHEMA('Login').make(function(schema) {

	schema.define('name', 'String(40)', true);
	schema.define('password', 'String(20)', true);

	schema.addWorkflow('exec', function(error, model, options, callback, controller) {
		NOSQL('users').find().make(function(builder) {
			builder.where('name', model.name);
			builder.where('password', model.password.sha1());
			builder.first();
			builder.callback(function(err, doc) {

				if (doc) {
					var cookie = {};
					cookie.id = doc.id;
					cookie.expire = F.datetime;
					controller.cookie(F.config.cookie, F.encrypt(cookie, 'user'), '5 days');
				} else
					error.push('error-user-credentials');

				callback(SUCCESS(true));
			});
		});

	});
});

NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(40)', true);
	schema.define('password', 'String(30)');
	schema.define('sa', Boolean);

	schema.setQuery(function(error, options, callback) {
		NOSQL('users').find().fields('id', 'name', 'sa', 'datecreated').callback(callback);
	});

	schema.setSave(function(error, model, options, callback, controller) {

		if (model.id) {
			model.dateupdated = F.datetime;
			model.adminupdated = controller.user.name;
		} else {
			model.id = UID();
			model.datecreated = F.datetime;
			model.admincreated = controller.user.name;
		}

		if (model.password)
			model.password = model.password.sha1();
		else
			model.password = undefined;


		if (controller.user.id === model.id) {
			controller.user.name = model.name;
			controller.user.sa = model.sa;
		}

		NOSQL('users').modify(model, model).where('id', model.id);
		callback(SUCCESS(true, model.id));
	});

	schema.setRemove(function(error, options, callback) {
		NOSQL('users').remove().where('id', options.id);
		callback(SUCCESS(true));
	});

});