const fs = require('fs')
module.exports= {
	category: 'annoyances',
	compat: 'W10+',
	description: 'A dummy',
	up: (done)=>{
		fs.writeFile('dummyfile',`This is a dummy file {new Date()}`,done);
	},
	down: (done)=>{
		fs.unlink('dummyfile',done);
	}
}