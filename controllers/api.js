const FLAGS = ['get', 'dnscache'];

exports.install = function() {

	F.route('/api/login/', json_exec, ['post', '*Login']);

	F.group(['authorize'], function() {
		F.route('/api/proxy/',             json_proxy);
		F.route('/api/ajax/',              json_exec,      ['post', '*Ajax']);

		// Dashboard
		F.route('/api/groups/',            json_groups);
		F.route('/api/dashboard/',         json_query,     ['*Dashboard']);
		F.route('/api/dashboard/',         json_save,      ['*Dashboard#create', 'post']);
		F.route('/api/dashboard/',         json_save,      ['*Dashboard#update', 'put']);
		F.route('/api/dashboard/{id}/',    json_remove,    ['*Dashboard', 'delete']);

		// Users
		F.route('/api/users/',             json_sa_query,  ['*User']);
		F.route('/api/users/',             json_sa_save,   ['*User', 'post']);
		F.route('/api/users/{id}/',        json_sa_remove, ['*User', 'delete']);

		// Settings
		F.route('/api/settings/{id}/',     json_read,      ['*Settings', 'get']);
		F.route('/api/settings/',          json_save,      ['*Settings', 'post']);
	});
};

function json_proxy() {
	var self = this;
	U.request(self.query.url, FLAGS, (err, response, status, headers) => self.content(response, headers['content-type']));
}

function json_groups() {
	this.json(F.config.groups);
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

// ==================================================================
// Super Administrator operations
// ==================================================================

function json_sa_query() {
	var self = this;
	if (!self.user.sa)
		return self.invalid().push('error-user-privileges');
	self.$query(self, self.callback());
}

function json_sa_save() {
	var self = this;
	if (!self.user.sa)
		return self.invalid().push('error-user-privileges');
	self.$save(self, self.callback());
}

function json_sa_remove(id) {
	var self = this;
	if (!self.user.sa)
		return self.invalid().push('error-user-privileges');
	self.id = id;
	self.$remove(self, self.callback());
}