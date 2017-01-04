exports.install = function() {
	F.route('/', 'index', ['authorize']);
	F.route('/*',  'login', ['unauthorize']);
	F.route('/logoff/', logoff);
	F.localize('/templates/*.html', ['compress']);
};

function logoff() {
	this.cookie(F.config.cookie, '', '-1 day');
	this.redirect('/');
}