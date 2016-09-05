NEWSCHEMA('Repository').make(function(schema) {

	schema.define('items', '[Url]');

	schema.setSave(function(error, model, controller, callback) {
		var plain = model.$plain();
		NOSQL('repositories').modify(plain).where('user', controller.user.id).callback(function(err, count) {
			if (count)
				return callback(SUCCESS(true));
			plain.user = controller.user.id;
			NOSQL('repositories').insert(plain).callback(() => callback(SUCCESS(true)));
		});
	});

	schema.setGet(function(error, model, controller, callback) {
		NOSQL('repositories').find().make(function(builder) {
			builder.where('user', controller.user.id);
			builder.first();
			builder.callback((err, response) => callback(response ? response.items : EMPTYARRAY));
		});
	});

	schema.setRemove(function(error, controller, callback) {
		NOSQL('repositories').remove().make(function(builder) {
			builder.where('user', controller.user.id);
			builder.callback(() => callback(SUCCESS(true)));
		});
	});
});