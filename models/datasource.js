NEWSCHEMA('DataSource').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(50)', true);
	schema.define('group', 'String(30)');
	schema.define('icon', 'String(15)');
	schema.define('url', 'Url', true);
	schema.define('interval', Number);
	schema.define('method', 'String(6)', true);
	schema.define('headers', 'Object');
	schema.define('cookies', 'Object');
	schema.define('data', 'Object');

	schema.setQuery(function(error, controller, callback) {
		NOSQL('datasources').find().where('user', controller.user.id).callback((err, response) => callback(response));
	});

	schema.setSave(function(error, model, controller, callback) {
		var nosql = NOSQL('datasources');

		if (!model.id) {
			model.id = UID();
			model.user = controller.user.id;
			nosql.insert(model).callback(() => callback(SUCCESS(true)));
			return;
		}

		nosql.modify(model).make(function(builder) {
			builder.where('id', model.id);
			builder.where('user', controller.user.id);
			builder.callback(() => callback(SUCCESS(true)));
		});
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