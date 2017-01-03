NEWSCHEMA('DataSource').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(50)', true);
	schema.define('group', 'String(30)');
	schema.define('keywords', 'Lower(50)');
	schema.define('icon', 'String(15)');
	schema.define('url', 'Url', true);
	schema.define('interval', Number);
	schema.define('method', 'String(6)', true);
	schema.define('headers', 'Object');
	schema.define('cookies', 'Object');
	schema.define('data', 'Object');
	schema.define('all', Boolean);

	schema.setQuery(function(error, controller, callback) {
		NOSQL('datasources').find().make(function(builder) {
			builder.or();
			builder.where('user', controller.user.id);
			builder.where('all', true);
			builder.end();
			builder.callback((err, response) => callback(response));
		});
	});

	schema.setSave(function(error, model, controller, callback) {

		var nosql = NOSQL('datasources');

		if (model.id) {
			nosql.modify(model).make(function(builder) {
				builder.where('id', model.id);
				!model.all && builder.where('user', controller.user.id);
				builder.callback(() => callback(SUCCESS(true)));
			});
			return;
		}

		model.id = UID();
		model.user = controller.user.id;
		nosql.insert(model).callback(() => callback(SUCCESS(true)));
	});

	schema.setRemove(function(error, controller, callback) {
		var nosql = NOSQL('datasources');
		nosql.remove().make(function(builder) {
			builder.where('id', controller.id);
			builder.where('user', controller.user.id);
			builder.callback(() => callback(SUCCESS(true)));
		});
	});
});