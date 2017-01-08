const fs = require('fs')
module.exports= {
	category: 'annoyances',
	compat: 'W10+',
	description: 'A dummy',
	up: function(done){ // Don't export phat-arrow lambdas, as you will loose access to the helpers bound to 'this'
		fs.writeFile('dummyfile',`This is a dummy file {new Date()}`,done);
	},
	down: function(done){
		fs.unlink('dummyfile',done);
	}
}