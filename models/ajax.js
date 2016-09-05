NEWSCHEMA('Ajax').make(function(schema) {
	schema.define('method', 'String(10)', true);
	schema.define('url', 'Url', true);
	schema.define('data', 'String');
	schema.define('headers', 'Object');

	schema.addWorkflow('exec', function(error, model, options, callback) {
		var flags = [model.method];
		model.data.isJSON() && flags.push('json');
		U.request(model.url, flags, function(err, response) {
			err && error.push(err);
			callback(response);
		}, null, model.headers);
	});
});