NEWSCHEMA('Login').make(function(schema) {

	schema.define('name', 'String(40)', true);
	schema.define('password', 'String(20)', true);

	schema.addWorkflow('exec', function(error, model, options, callback, controller) {
		NOSQL('users').find().make(function(builder) {
			builder.where('name', model.name);
			builder.where('password', model.password);
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