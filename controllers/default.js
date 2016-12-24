exports.install = function() {
	F.route('/*', dashboard, ['authorize']);
	F.route('/*',  'login', ['unauthorize']);
	F.localize('/templates/*.html', ['compress']);
};

function dashboard() {
	var self = this;
	GETSCHEMA('Repository').get(self, self.callback('index'));
}