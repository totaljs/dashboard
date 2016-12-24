F.helpers.makerepository = function(m) {
	return !m.key ? m.url : m.url.indexOf('?') === -1 ? m.url + '?key=' + m.key : m.url + '&key=' + m.key;
};