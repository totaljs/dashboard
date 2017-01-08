NEWSCHEMA('Alarm').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(50)', true);
	schema.define('group', 'String(50)', true);
	schema.define('field', 'String(30)');
	schema.define('condition', 'String');
	schema.define('email', 'Email');
	schema.define('phone', 'Phone');

	schema.setSave(function(error, model, options, callback, controller) {
		var db = NOSQL('alarms');
		model.user = controller.user.id;
		if (model.id) {
			model.dateupdated = F.datetime;
			db.modify(model).where('id', model.id).where('user', model.user).callback(SUCCESS(callback));
		} else {
			model.datecreated = F.datetime;
			db.insert(model).callback(SUCCESS(callback));
		}
	});

	schema.setQuery(function(error, options, callback, controller) {
		NOSQL('alarms').find().where('user', controller.user.id).callback(callback);
	});

	schema.setRemove(function(error, options, callback, controller) {
		NOSQL('alarms').where('id', options.id).where('user', controller.user.id);
		callback(SUCCESS(true));
	});

});