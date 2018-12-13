// MIT License
// Copyright Peter Širka <petersirka@gmail.com>

const Fs = require('fs');
const WS_COMPONENT = { TYPE: 'component' };
const WS_LOADED = { TYPE: 'loaded' };
const WS_INIT = { TYPE: 'init' };
const WS_INSTANCES = { TYPE: 'instances' };
const WS_DATA = { TYPE: 'data' };
const PATH = '/dashboard/';
const FILEDESIGNER = '/dashboard/designer.json';
const FLAGS = ['get', 'dnscache'];
const WS_ERROR = { TYPE: 'error' };
const WS_TEMPLATES = { TYPE: 'templates' };
const REG_INSTANCES = /^dashboard\w+/i;

var OPT;
var DDOS = {};
var WS = null;
var WSEXT = null;

// Internal
var TYPE = 0;
var FN = {};

global.DASHBOARD = {};
global.DASHBOARD.send = function(instance, type, data) {
	WS_DATA.id = instance.id;
	WS_DATA.name = instance.name;
	WS_DATA.component = instance.component;
	WS_DATA.body = data;
	WS_DATA.type = type;
	WS_DATA.reference = instance.reference;
	WS && WS.send(WS_DATA);
};

global.DASHBOARD.online = function() {
	return WS ? true : false;
};

exports.install = function(options) {

	OPT = options;
	!OPT && (OPT = {});

	if (OPT.auth instanceof Array) {
		OPT.baa = {};
		OPT.auth.forEach(function(user) {
			var hash = user.hash().toString();
			OPT.baa[hash] = user;
		});
	}

	if (OPT.dark == null)
		OPT.dark = true;

	if (OPT.flow == null)
		OPT.flow = true;

	if (OPT.flowboard == null)
		OPT.flowboard = true;

	global.DASHBOARD.url = OPT.url = U.path(OPT.url || '/$dashboard/');
	!OPT.limit && (OPT.limit = 50);
	!OPT.templates && (OPT.templates = 'https://cdn.totaljs.com/dashboard/templates.json');
	OPT.socket = OPT.url;

	try {
		Fs.mkdirSync(F.path.root(PATH));
	} catch(e) {}

	if (!OPT.type || OPT.type === 'bundle')
		TYPE = 1;
	else if (OPT.type === 'client')
		TYPE = 2;
	else if (OPT.type === 'server')
		TYPE = 3;

	if (TYPE === 2)
		OPT.socket = OPT.external;

	if (OPT.auth === true) {

		if (TYPE !== 3)
			ROUTE(OPT.url, FN.view_index, ['authorize']);

		if (TYPE !== 2)
			WEBSOCKET(OPT.url, FN.websocket, ['authorize', 'json'], OPT.limit);

	} else {

		if (TYPE !== 3)
			ROUTE(OPT.url, FN.view_index);

		if (TYPE !== 2)
			WEBSOCKET(OPT.url, FN.websocket, ['json'], OPT.limit);
	}

	if (TYPE !== 3) {
		// Files
		LOCALIZE(OPT.url + 'templates/*.html', ['compress']);

		// Merging & Mapping
		MERGE(OPT.url + 'default.css', '@dashboard/css/dep.min.css', '@dashboard/css/default.css', '@dashboard/css/ui.css');
		MERGE(OPT.url + 'default.js', '@dashboard/js/dep.min.js', '@dashboard/js/default.js', '@dashboard/js/ui.js');
		MAP(OPT.url + 'templates/', '@dashboard/templates/');
		MAP(OPT.url + 'fonts/', '@dashboard/fonts/');
		MAP(OPT.url + 'img/', '@dashboard/img/');
	}

	// Service
	ON('service', service);

	if (TYPE !== 2) {

		F.helpers.DASHBOARD = global.DASHBOARD;

		WAIT(function() {
			return global.FLOW;
		}, function() {
			FLOW.prototypes(function(proto) {
				proto.Component.dashboard = function(type, data) {
					global.DASHBOARD.send(this, type, data);
					return this;
				};
			});
		});

		ON('flow.save', function() {
			WS && FN.send_instances(WS);
		});
	}

	// Cleans up memory
	switch (TYPE) {
		case 2: // client
			delete FN.websocket;
			delete FN.send_instances;
			delete FN.send_components;
			delete FN.send_settings;
			delete FN.send_component;
			delete FN.component_install;
			delete FN.component_uninstall;
			delete FN.save;
			delete global.DASHBOARD;
			break;
		case 3: // server
			delete FN.view_index;
			delete FN.auth;
			break;
	}
};

function service(counter) {
	counter % 5 === 0 && (DDOS = {});
}

FN.view_index = function() {
	var self = this;
	if (FN.auth(self)) {
		self.theme('');
		self.view('@dashboard/index', OPT);
	}
};

FN.websocket = function() {
	var self = WS = this;

	self.autodestroy(() => WS = null);

	self.on('open', function(client) {

		// Security
		if ((OPT.token && OPT.token.indexOf(client.query.token) === -1) || (OPT.baa && !OPT.baa[client.query.baa]) || (OPT.restrictions && OPT.restrictions[self.ip] === -1)) {
			setImmediate(() => client.close('Unauthorized'));
			return;
		}

		client.send(WS_INIT);
		FN.send_instances(client, () => FN.send_components(client, () => FN.send_settings(client, function() {
			self.send(WS_LOADED);
		})));
	});

	self.on('message', function(client, message) {

		// message.id
		// message.TYPE
		// message.body

		switch (message.TYPE) {
			case 'templates':
				OPT.templates && U.request(OPT.templates, FLAGS, function(err, response) {
					if (!err) {
						WS_TEMPLATES.body = response.parseJSON();
						WS_TEMPLATES.body && client.send(WS_TEMPLATES);
					}
				});
				break;
			case 'send':
				if (WSEXT)
					WSEXT.send(message);
				else {
					var instance = FLOW.findById(message.id);
					instance && instance.emit('dashboard', message.type, message.body);
				}
				break;
			case 'install':
				FN.component_install(self, message);
				break;
			case 'uninstall':
				FN.component_uninstall(self, message.body);
				break;
			case 'save':
				FN.save(message.body);
				break;
		}
	});
};

FN.component_install = function(controller, response, callback) {

	var u = response.body.substring(0, 6);
	if (u === 'http:/' || u === 'https:') {
		U.download(response.body, FLAGS, function(err, res) {

			if (err) {
				WS_ERROR.body = err.toString();
				FLOW.send(WS_ERROR);
				return callback(err);
			}

			var filename = F.path.root(PATH + U.getName(response.body));
			var writer = Fs.createWriteStream(filename);
			res.pipe(writer);
			writer.on('finish', function() {
				Fs.readFile(filename, function(err, response) {
					if (response)
						response = U.minifyHTML(response.toString('utf8'));
					Fs.writeFile(filename, response, function() {
						callback && callback();
						controller && FN.send_component(filename, controller);
					});
				});
			});
		});
		return;
	}

	var filename = F.path.root(PATH + response.filename);
	Fs.writeFile(filename, U.minifyHTML(response.body), function() {
		callback && callback();
		controller && FN.send_component(filename, controller);
	});
};

FN.component_uninstall = function(controller, name, callback) {

	var index = name.indexOf('/');
	if (index === -1)
		name = name.substring(index + 1);

	Fs.unlink(F.path.root(PATH + name), function() {
		callback && callback();
		controller && FN.send_components(controller);
	});
};

FN.save = function(body, callback) {
	var path = F.path.root(FILEDESIGNER);
	var json = JSON.stringify(body);
	Fs.writeFile(path, json, callback || NOOP);
	OPT.backup && Fs.writeFile(F.path.root(FILEDESIGNER.replace(/\.json/g, '-' + F.datetime.format('yyyyMMdd_HHmmss') + '.backup')), json, NOOP);
};

FN.send_settings = function(client, callback) {
	var path = F.path.root(FILEDESIGNER);
	Fs.readFile(path, function(err, data) {
		data && client.send(data.toString('utf8'), true);
		callback && callback();
	});
};

FN.send_instances = function(client, callback) {

	if (!global.FLOW) {
		callback && callback();
		return;
	}

	var keys = Object.keys(FLOW.instances);

	WS_INSTANCES.body = [];

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		var declaration = FLOW.components[instance.component];
		if (declaration.dashboard || REG_INSTANCES.test(instance.component))
			WS_INSTANCES.body.push({ id: instance.id, name: instance.name || instance.title, component: instance.component, reference: instance.reference });
	}

	client.send(WS_INSTANCES);
	callback && callback();
};

FN.send_component = function(filename, client, callback) {
	Fs.stat(filename, function(err, stats) {

		if (err) {
			callback && callback(err);
			return;
		}

		Fs.readFile(filename, function(err, data) {
			if (data) {
				WS_COMPONENT.body = U.minifyHTML(TRANSLATOR('default', data.toString('utf8')));
				WS_COMPONENT.name = U.getName(filename);
				WS_COMPONENT.dateupdated = stats.mtime;
				client.send(WS_COMPONENT);
			}
			callback && callback();
		});
	});
};

FN.send_components = function(client, callback) {
	var path = F.path.root(PATH);
	U.ls(path, function(files) {
		files.wait(function(item, next) {
			Fs.stat(item, function(err, stats) {
				if (err)
					return next();
				Fs.readFile(item, function(err, data) {
					if (data) {
						WS_COMPONENT.body = U.minifyHTML(TRANSLATOR('default', data.toString('utf8')));
						WS_COMPONENT.name = U.getName(item);
						WS_COMPONENT.dateupdated = stats.mtime;
						client.send(WS_COMPONENT);
					}
					next();
				});
			});
		}, callback);
	}, (filename) => filename.endsWith('.html'));
};

FN.auth = function(controller) {

	if (OPT.auth instanceof Array) {
		var user = controller.baa();
		if (OPT.auth.indexOf(user.user + ':' + user.password) === -1) {
			if (DDOS[controller.ip])
				DDOS[controller.ip]++;
			else
				DDOS[controller.ip] = 1;
			if (DDOS[controller.ip] > 4)
				controller.throw401();
			else
				controller.baa('Secured area, please add your credentials');
			return false;
		}
		controller.repository.baa = (user.user + ':' + user.password).hash();
	}

	if (OPT.restrictions && OPT.restrictions[controller.ip] === -1) {
		controller.throw401();
		return false;
	}

	if (OPT.token && OPT.token.indexOf(controller.query.token) === -1) {
		if (DDOS[controller.ip])
			DDOS[controller.ip]++;
		else
			DDOS[controller.ip] = 1;

		if (DDOS[controller.ip] > 4) {
			controller.throw401();
			return false;
		}
	}

	return true;
};