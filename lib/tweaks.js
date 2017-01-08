const path = require('path'),
	fs= require('fs'),
	rubberglove= require(path.join(__dirname,'..','lib','rubberglove'));

const BUILTIN_PATH=path.join(__dirname,'..','tweaks');

let promisify= (fn)=> {
	return () => {
		return new Promise((resolve,reject)=>{
			try{
				// Invoke p good-ol callbackstyle
				let p = fn.bind({glove:rubberglove})((err,data)=>{
					if(!err){
						resolve(data);
					}else{
						reject(err);
					}
				});
				// If a tweak returns a promise, support that instead.
				if(typeof p === 'object' && typeof p.then === 'function'){
					p.then(resolve)
					.catch((e) => reject(e));
				}
			}catch(e){
				reject(e);
			}
		});
	};
};

let loadTweak= (file)=>{
	try{
		let tweak= require(file);
		tweak.sourceURL= `file://${file}`;
		tweak.name= path.basename(file).replace(/^tweak_(.+)\.js$/,'$1');
		if(!tweak.compat) console.warn(tweak.name, 'is missing compatibility descriptor');
		// TODO: compatibility calculation and comparison.
		// tweak.incompatible = (... ~= tweak.compat) ? true : false;

		if(!tweak.description) console.warn(tweak.name, 'is missing description');
		if(!tweak.category) console.warn(tweak.name, 'is missing category');
		if(!tweak.up) console.warn(tweak.name, 'cannot be applied, no method up() exported');
		if(!tweak.down){ 
			console.info(tweak.name, 'is irreversible.');
			tweak.irreversible = true;
			tweak.revert=()=>{ throw "Called revert() on irreversible tweak."};
		}else{
			tweak.revert=promisify(tweak.down);
		}
		if(!tweak.up){
			throw "Tweak is missing an 'up(done)' function. Tweak cannot be applied"
		}else{
			tweak.apply=promisify(tweak.up);
		}
		return tweak;
	}catch(e){
		console.error('Failed loading tweak:',file);
		throw e;
	}
}
module.exports.loadTweak = loadTweak;
module.exports.BUILTIN_PATH = BUILTIN_PATH;
module.exports.list= (opts)=>{
	opts = Object.assign({},opts);
	let tweaks = fs.readdirSync(BUILTIN_PATH)
	.map((file)=> path.join(BUILTIN_PATH,file))
	.filter((file)=> path.basename(file).match(/^tweak_.*\.js$/))
	.map((file)=> loadTweak(file));
	if(opts.category){
		tweaks = tweaks.filter((tweak)=> tweak.category === opts.category )
	}
	if(typeof opts.reversible !== 'undefined'){
		tweaks = tweaks.filter((tweak) => tweak.irreversible !== opts.reversible )
	}
	return tweaks;
};

