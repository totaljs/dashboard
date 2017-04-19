NEWSCHEMA('Settings').make(function(schema) {

	schema.define('id', 'UID', true);
	schema.define('data', 'String', true);

	schema.setGet(function(error, model, controller, callback) {
		NOSQL('settings').one().where('id', controller.id).where('user', controller.user.id).callback((err, response) => callback(response));
	});

	schema.setSave(function(error, model, controller, callback) {
		var plain = model.$plain();
		NOSQL('settings').modify(plain).where('id', model.id).where('user', controller.user.id).callback(function(err, count) {
			if (count)
				return callback(SUCCESS(true));
			plain.user = controller.user.id;
			plain.datecreated = F.datetime;
			NOSQL('settings').insert(plain).callback(() => callback(SUCCESS(true)));
		});
	});

});