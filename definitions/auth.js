const SESSION = {};

F.onAuthorize = function(req, res, flags, next) {

	var cookie = req.cookie(F.config.cookie);
	if (!cookie)
		return next(false);

	var user = F.decrypt(cookie, 'user');
	if (!user || !user.id)
		return next(false);

	if (SESSION[user.id]) {
		SESSION[user.id].expire = F.datetime;
		return next(true, SESSION[user.id]);
	}

	NOSQL('users').find().make(function(builder) {
		builder.where('id', user.id);
		builder.first();
		builder.fields('id', 'name', 'sa');
		builder.callback(function(err, doc) {
			if (err || !doc)
				return next(false);
			doc.expire = F.datetime;
			SESSION[doc.id] = doc;
			next(true, doc);
		});
	});
};

F.on('service', function(counter) {
	if (counter % 10 !== 0)
		return;
	var expire = F.datetime.add('-10 minutes');
	Object.keys(SESSION).forEach(function(key) {
		if (expire > SESSION[key].expire)
			delete SESSION[key];
	});
});