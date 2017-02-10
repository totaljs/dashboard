exports.install = function() {
	// Dashboard
	F.route('/', 'index', ['authorize']);
	F.route('/users/', 'index', ['authorize']);

	// Others
	F.route('/*',  'login', ['unauthorize']);
	F.route('/logoff/', logoff);

	// Templates
	F.localize('/templates/*.html', ['compress']);
};

function logoff() {
	this.cookie(F.config.cookie, '', '-1 day');
	this.redirect('/');
}