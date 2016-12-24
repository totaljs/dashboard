const FLAGS = ['get', 'dnscache'];

exports.install = function() {
	F.route('/api/proxy/',             json_proxy,  ['get']);
	F.route('/api/ajax/',              json_exec,   ['post', '*Ajax']);
	F.route('/api/login/',             json_exec,   ['post', '*Login']);

	// Dashboard
	F.route('/api/dashboard/',         json_query,  ['*Dashboard']);
	F.route('/api/dashboard/',         json_save,   ['*Dashboard', 'post']);
	F.route('/api/dashboard/{id}/',    json_remove, ['*Dashboard', 'delete']);
	F.route('/api/settings/{id}/',     json_read,   ['*Settings', 'get']);
	F.route('/api/settings/',          json_save,   ['*Settings', 'post']);

	// Repositories
	F.route('/api/repositories/',      json_save,   ['*Repository', 'post']);
	F.route('/api/repositories/',      json_read,   ['*Repository']);
	F.route('/api/repositories/{id}/', json_remove, ['*Repository', 'delete']);

	// DataSources
	F.route('/api/datasources/',       json_query,  ['*DataSource']);
	F.route('/api/datasources/',       json_save,   ['*DataSource', 'post']);
	F.route('/api/datasources/{id}/',  json_remove, ['*DataSource', 'delete']);
};

function json_proxy() {
	var self = this;
	U.request(self.query.url, FLAGS, (err, response, status, headers) => self.content(response, headers['content-type']));
}

function json_save() {
	var self = this;
	self.$save(self, self.callback());
}

function json_query() {
	var self = this;
	self.$query(self, self.callback());
}

function json_read(id) {
	var self = this;
	self.id = id;
	self.$read(self, self.callback());
}

function json_remove(id) {
	var self = this;
	self.id = id;
	self.$remove(self, self.callback());
}

function json_exec() {
	var self = this;
	self.$workflow('exec', self.callback());
}