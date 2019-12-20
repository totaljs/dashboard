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

	try {
		Fs.mkdirSync(F.path.root(PATH));
	} catch(e) {}

	if (OPT.auth === true) {
		ROUTE(OPT.url, view_index, ['authorize']);
		WEBSOCKET(OPT.url, websocket, ['authorize', 'json'], OPT.limit);
	} else {
		ROUTE(OPT.url, view_index);
		WEBSOCKET(OPT.url, websocket, ['json'], OPT.limit);
	}

	// Files
	F.localize(OPT.url + 'templates/*.html', ['compress']);

	// Merging & Mapping
	F.merge(OPT.url + 'css/default.css', '@dashboard/css/spa.min@18.css', '@dashboard/css/default.css', '@dashboard/css/ui.css', '@dashboard/css/ui.extras.css');
	F.merge(OPT.url + 'js/default.js', '@dashboard/js/spa.min@18.js', '@dashboard/js/default.js', '@dashboard/js/ui.js', '@dashboard/js/ui.extras.js');
	F.map(OPT.url + 'templates/', '@dashboard/templates/');
	F.map(OPT.url + 'fonts/', '@dashboard/fonts/');
	F.map(OPT.url + 'img/', '@dashboard/img/');

	F.helpers.DASHBOARD = global.DASHBOARD;

	// Service
	ON('service', service);

	WAIT(function() {
		return global.FLOW;
	}, function() {
		FLOW.prototypes(function(proto) {
			proto.Component.dashboard = function(type, data) {
				DASHBOARD.send(this, type, data);
				return this;
			};
		});
	});
};

function service(counter) {
	counter % 5 === 0 && (DDOS = {});
}

function view_index() {
	if (auth(this)) {
		this.theme('');
		this.view('@dashboard/index', OPT);
	}
}

function websocket() {
	var self = WS = this;

	self.autodestroy(() => WS = null);

	self.on('open', function(client) {

		// Security
		if ((OPT.token && OPT.token.indexOf(client.query.token) === -1) || (OPT.baa && !OPT.baa[client.query.baa]) || (OPT.restrictions && OPT.restrictions[self.ip] === -1)) {
			setImmediate(() => client.close('Unauthorized'));
			return;
		}

		client.send(WS_INIT);
		send_instances(client, () => send_components(client, () => DASHBOARD.load(client, function() {
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
				var instance = FLOW.findById(message.id);
				instance && instance.emit('dashboard', message.type, message.body);
				break;
			case 'install':
				component_install(self, message);
				break;
			case 'uninstall':
				component_uninstall(self, message.body);
				break;
			case 'save':
				DASHBOARD.save(message.body, OPT.backup);
				break;
			default:
				EMIT('dashboard.message', message);
		}
	});
}

ON('flow.save', function() {
	WS && send_instances(WS);
});

function component_install(controller, response, callback) {

	var u = response.body.substring(0, 6);
	if (u === 'http:/' || u === 'https:') {
		U.download(response.body, FLAGS, function(err, res) {

			if (err) {
				WS_ERROR.body = err.toString();
				DASHBOARD.send(WS_ERROR);
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
						controller && send_component(filename, controller);
					});
				});
			});
		});
		return;
	}

	var filename = F.path.root(PATH + response.filename);
	Fs.writeFile(filename, U.minifyHTML(response.body), function() {
		callback && callback();
		controller && send_component(filename, controller);
	});
}

function component_uninstall(controller, name, callback) {

	var index = name.indexOf('/');
	if (index === -1)
		name = name.substring(index + 1);

	Fs.unlink(F.path.root(PATH + name), function() {
		callback && callback();
		controller && send_components(controller);
	});
}

DASHBOARD.save = function(body, backup, callback) {
	save(body, callback);
};

function save(body, callback) {
	var path = F.path.root(FILEDESIGNER);
	var json = JSON.stringify(body);
	Fs.writeFile(path, json, callback || NOOP);
	OPT.backup && Fs.writeFile(F.path.root(FILEDESIGNER.replace(/\.json/g, '-' + F.datetime.format('yyyyMMdd_HHmmss') + '.backup')), json, NOOP);
}

DASHBOARD.load = function(client, callback) {
	load(client, callback)
};

function load(client, callback) {
	var path = F.path.root(FILEDESIGNER);
	Fs.readFile(path, function(err, data) {
		data && client.send(data.toString('utf8'), true);
		callback && callback();
	});
}

function send_instances(client, callback) {

	WS_INSTANCES.body = [];

	if (!global.FLOW) {
		callback && callback();
		return;
	}

	var keys = Object.keys(FLOW.instances);

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		var declaration = FLOW.components[instance.component];
		if (declaration.dashboard || REG_INSTANCES.test(instance.component))
			WS_INSTANCES.body.push({ id: instance.id, name: instance.name || instance.title, component: instance.component, reference: instance.reference });
	}

	client.send(WS_INSTANCES);
	callback && callback();
}

function send_component(filename, client, callback) {
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
}

function send_components(client, callback) {
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
}

function auth(controller) {

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
				controller.baa('Secured area, please add sign-in');
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
}