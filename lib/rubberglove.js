var PowerShell = require('node-powershell'),
	assert = require('assert');

function execPS(cmd,opts){
	opts = Object.assign({
		executionPolicy: 'Bypass',
		debugMsg: true,//typeof process.env.RUBDEBUG !== 'undefined',
		noProfile: true,
		noJSON:false
	},opts||{});
	if(typeof cmd === 'string'){
		cmd=[cmd];
	}
	let pipeToJSON="";
	if(!opts.noJSON) { pipeToJSON = "| ConvertTo-Json -Compress -Depth 6"; }

	return new Promise(function(resolve,reject){
		let ps = new PowerShell(opts);
		cmd.reduce((promise,instruction)=>{
			return promise.then((res)=>{
				return ps.addCommand(`${instruction} ${pipeToJSON}`);
			})
		},new Promise((r)=>r()))
		.then(()=> ps.invoke())
		.then((out)=>{
			ps.dispose();
			return out;
		})
		.then((out)=>{
			if(opts.noJSON){
				resolve(out)
			}else{
				// Handle multi-document results
				let result = out.split("\r\n")
				.reduce((res,seg)=>{
					if(seg.length) res.push(JSON.parse(seg));
					return res;
				},[]);

				// Strip the enclosing arrayeeness if the response is a single result
				if(result.length==1){
					resolve(result[0]);
				}else{
					resolve(result);
				}
			}
		})
		.catch((err)=>{
			ps.dispose();
			reject(new Error(err));
		});
	});

}

module.exports.scheduler={
};

module.exports.registry={
};

const fw = {
	DIRECTIONS: ['nowhere','in','out'],
	ACTIONS: ['A0','A1','allow','A3','drop','A5'],
	ENABLED: [null,true,false],
	remapRule: function(rule){
		return { 
			id: rule.ID, // This should be identical to rule.Name
			name: rule.DisplayName,
			direction: fw.DIRECTIONS[rule.Direction],
			action: fw.ACTIONS[rule.Action],
			enabled: fw.ENABLED[rule.Enabled],
			group: rule.Group,
			description: rule.Description
		};
	}
}

module.exports.firewall={
	getRules: (filters) => {
		filters=filters||{};

		let params=[];
		if(filters.name)	params.push(`-DisplayName "${filters.name}"`);
		if(filters.id)		params.push(`-Name "${filters.id}"`);
		//TODO: overambitious handling of Where filters e.g.
		//Get-NetFirewallRule | Where { $_.Enabled –eq ‘True’ –and $_.Direction –eq ‘Inbound’ }
		return execPS(`Get-NetFirewallRule ${params.join(' ')}`)
		.then((res) => {
			return res.map((rule) => fw.remapRule(rule));
		});
	},
	addRule: (opts) => {
		opts= Object.assign({
			name: `RubberGlove ${new Date().getTime()}`,
			direction: 'both',
			action: 'drop',
			enabled: true,
			profile: 'any',
			match:{},
			group: 'RubberGlove',
			description: null
		},opts);
		assert.notEqual(Object.keys(opts.match).length,0,'No conditions provided to the rule');

		let instructions=[];

		// Generate the instruction.
		let instr=[`New-NetFirewallRule -DisplayName "${opts.name}" -Enabled ${opts.enabled}`];
		if(opts.group) 				instr.push(`-Group "${opts.group}"`);
		if(opts.profile)			instr.push(`-Profile ${opts.profile}`);
		if(opts.match.remoteip) 	instr.push(`-RemoteAddress ${opts.match.remoteip}`);
		if(opts.match.protocol)		instr.push(`-Protocol ${opts.match.protocol}`);
		if(opts.match.localPort)	instr.push(`-LocalPort ${opts.match.localPort}`);
		if(opts.match.remotePort)	instr.push(`-RemotePort ${opts.match.remotePort}`);
		if(opts.match.service)		instr.push(`-Service "${opts.match.service}"`);
		if(opts.match.program)		instr.push(`-Program "${opts.match.program}"`);
		if(opts.match.package)		instr.push(`-Package "${opts.match.package}"`);

		instr.push(`-Action ${opts.action.toLowerCase().match('allow') ? 'Allow' : 'Block'}`);


		if(['in','both'].includes(opts.direction.toLowerCase())){
			instructions.push(`${instr.join(' ')} -Direction Inbound -Name "${opts.id || opts.name}_IN"`);
		}

		if(['out','both'].includes(opts.direction.toLowerCase())){
			instructions.push(`${instr.join(' ')} -Direction Outbound -Name "${opts.id || opts.name}_OUT"`);
		}

		return execPS(instructions)
		.then( (res)=> res.map( (rule)=>fw.remapRule(rule) ) );
	},
	removeRule: (id) => {
		return execPS(`Remove-NetFirewallRule -Name "${id}"`);
	},
	removeDirectionalRule: (id,direction)=>{
		direction=direction||'both';
		let rules = [];
		if(['in','both'].includes(direction)) rules.push(`${id}_IN`);
		if(['out','both'].includes(direction)) rules.push(`${id}_OUT`);
		return rules.reduce((chain,id)=>{
			return chain.then(module.exports.firewall.removeRule(id));
		},new Promise((r)=>r()));
	}
};
