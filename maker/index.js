const Fs = require('fs');

exports.booting = 'root';
exports.install = function() {
	F.route('/', load);
};

function load() {
	var self = this;

	if (self.query.filename) {
		var filename = U.join(process.cwd(), self.query.filename);
		Fs.readFile(filename, function(err, content) {
			if (err)
				return self.content('');
			content = U.minifyHTML(F.translator(self.language, content.toString('utf8')));
			self.content(content, 'text/html');
		});
		return;
	}

	var cwd = process.cwd();
	var arr = [];
	var blacklist = /^\/(tmp|packages)\//g;

	U.ls(cwd, function(files) {
		for (var i = 0; i < files.length; i++) {
			var filename = files[i].replace(cwd, '');
			arr.push({ name: U.getName(filename), value: filename });
		}
		self.view('index', arr);
	}, function(path, isDirectory) {
		return isDirectory ? blacklist.test(path.replace(cwd, '')) === false : path.substring(path.length - 4) === 'html';
	});
}
