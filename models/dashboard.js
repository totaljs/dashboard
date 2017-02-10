NEWSCHEMA('Dashboard').make(function(schema) {

	// Update
	schema.define('id', 'UID', true, 'update');
	schema.define('name', 'String(50)', true, 'udpate');
	schema.define('theme', 'String(30)', 'update');
	schema.define('icon', 'String(15)', 'update');
	schema.define('data', 'String', true, 'update');

	// Create
	schema.define('group', 'String(50)', true, 'create');

	schema.setQuery(function(error, controller, callback) {
		NOSQL('dashboard').find().where('user', controller.user.id).callback((err, response) => callback(response));
	});

	schema.setSave(function(error, model, controller, callback) {
		var plain = model.$plain();

		if (plain.id) {
			plain.id = undefined;
			NOSQL('dashboard').modify(plain).where('id', model.id).where('user', controller.user.id).callback(() => callback(SUCCESS(true)));
		} else {
			plain.id = UID();
			plain.user = controller.user.id;
			NOSQL('dashboard').insert(plain).callback(() => callback(SUCCESS(true, plain.id)));
		}
	});

	schema.setRemove(function(error, controller, callback) {
		NOSQL('dashboard').remove().where('id', controller.id).where('user', controller.user.id).callback(() => callback(SUCCESS(true)));
	});
});