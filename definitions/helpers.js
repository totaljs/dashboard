F.helpers.makerepository = function(m) {
	if (!m.key)
		return m.url;
	if (m.url.indexOf('?') === -1)
		return m.url + '?key=' + m.key;
	return m.url + '&key=' + m.key;
};