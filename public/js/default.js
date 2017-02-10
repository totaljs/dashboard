window.TAU = 2 * Math.PI;
var common = {};
var dashboard = {};

// Current page
common.page = '';

// Current form
common.form = '';

// Current subform
common.subform = '';

common.default = false;

ON('@calendar', function(component) {
	window.MONTHS = component.months;
	window.MONTHS_SHORT = component.months_short;
	window.DAYS = component.days;
	window.DAYS_SHORT = component.days_short;
});

$(document).ready(function() {
	NAVIGATION.clientside('.jrouting');
	FIND('loading', FN('() => this.hide(500)'));
});

function isError(arguments) {
	return false;
}

$(window).on('hashchange', function() {
	var hash = location.hash.substring(1);
	if (hash) {
		common.default = true;
		EMIT('load', hash);
	} else
		EMIT('new');
});

ROUTE('/', function() {
	SET('common.page', 'dashboard');
	WAIT(function() {
		return window.dashboard_edit;
	}, function() {
		var id = location.hash || CACHE('default');
		if (id && !common.default) {
			id = id.replace('#', '');
			location.hash = id;
			EMIT('load', id);
		} else
			EMIT('browse');
		common.default = true;
	});
});

// New dashboard
ON('new', function() {
	NAVIGATION.url !== '/' && REDIRECT('/');
	common.form && SET('common.form', '');
	setTimeout(function() {
		DEFAULT('formnew.*');
		IMPORTSET('formnew', 'common.form', 'new', 'form-new');
	}, 1000);
});

// Browse dashboards
ON('browse', function() {
	EMIT('refresh');
	IMPORTSET('formbrowse', 'common.form', 'browse', 'form-browse');
});

// Refresh dashboards
ON('refresh', function() {
	AJAX('GET /api/groups/', 'dashboard.groups');
	AJAX('GET /api/dashboard/', function(response) {

		var categories = {};

		response.forEach(function(item) {
			if (item.group)
				categories[item.group] = true;
		});

		categories = Object.keys(categories);
		categories.sort(function(a, b) {
			return a.toLowerCase().removeDiacritics().substring(0, 5).localeCompare(b.toLowerCase().removeDiacritics().substring(0, 5));
		});

		response.sort(function(a, b) {
			return a.name.toLowerCase().removeDiacritics().substring(0, 5).localeCompare(b.name.toLowerCase().removeDiacritics().substring(0, 5));
		});

		SET('dashboard.categories', categories);
		SET('dashboard.items', response);
	});
});

Tangular.register('default', function(value, def) {
	return value == null || value === '' ? def : value;
});

Tangular.register('indexer', function(index) {
	return index + 1;
});

Tangular.register('join', function(value) {
	return value ? value.join(',') : '';
});

function IMPORTSET(check, name, value, template) {

	if (window[check]) {
		name && SET(name, value, 100);
		return true;
	}

	SETTER('loading', 'show');
	IMPORT('ONCE /templates/' + (template || value) + '.html', function() {
		name && SET(name, value);
		SETTER('loading', 'hide', 500);
	});
	return false;
}

Tangular.register('preview', function(value) {
	return value ? value : '/img/empty.png';
});

Number.prototype.filesize = function(decimals, type) {

	if (typeof(decimals) === 'string') {
		var tmp = type;
		type = decimals;
		decimals = tmp;
	}

	var value;

	// this === bytes
	switch (type) {
		case 'bytes':
			value = this;
			break;
		case 'KB':
			value = this / 1024;
			break;
		case 'MB':
			value = filesizehelper(this, 2);
			break;
		case 'GB':
			value = filesizehelper(this, 3);
			break;
		case 'TB':
			value = filesizehelper(this, 4);
			break;
		default:

			type = 'bytes';
			value = this;

			if (value > 1023) {
				value = value / 1024;
				type = 'KB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'MB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'GB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'TB';
			}

			break;
	}

	type = ' ' + type;
	return (decimals === undefined ? value.format(2).replace('.00', '') : value.format(decimals)) + type;
};

function filesizehelper(number, count) {
	while (count--) {
		number = number / 1024;
		if (number.toFixed(3) === '0.000')
			return 0;
	}
	return number;
}