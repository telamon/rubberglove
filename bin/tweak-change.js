const path = require('path'),
	chalk = require('chalk'),
	tweaks = require(path.join(__dirname,'..','lib','tweaks'));

module.exports.change = (direction,program) => {
	let log = function(){
		if(!program.silent) console.log.apply(null,[].slice.call(arguments));
	}

	try{
		let list = tweaks.list()
		.filter((t)=> program.args.includes(t.name) );
		
		// Detect unknown tweaks	
		program.args.forEach((arg)=>{
			let found= list.map((t)=>t.name).includes(arg);
			if(!found){
				console.error(`Unknown tweak: ${arg}`);
				process.exit(1);
			}
		})

		log(`${direction=='up'?'Applying':'Restoring'} ${list.length} tweak${list.length>1?'s':''}: ${list.map((t)=>t.name).join(' ')}`)

		if(program.pretend){
			console.error(chalk.red("'Pretention' is not yet implemented!"));
			console.error("Manually inspect the source(s) of the tweak(s) located:");
			list.forEach((tweak)=>console.error(tweak.sourceURL));
			console.error("And remove the '--pretend' flag if you wish to proceed");
		}else{
			Promise.all( list.map((tweak)=>{
				let chain = direction === 'up' ? tweak.apply() : tweak.revert();

				return chain
				.then((res)=>{
					log(`${tweak.name} done!`);
				})
				.catch((err)=>{
					log(chalk.red(`${tweak.name} failed!`));
					return err;
				})
			}))
			.then((errors)=>{
				errors= errors.filter((e)=> !!e);
				if(errors.length){
					console.error("Error(s) were encountered during tweaking, not all tweaks were applied:")
					errors.forEach((e)=>{
						console.error(e);
					})
					process.exit(1);
				}else{
					log(chalk.green("All good!"));
				}
			})
		}

	}catch(e){
		console.error(e);
		process.exit(1);
	}
}
