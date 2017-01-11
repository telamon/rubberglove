const PowerShell = require('node-powershell'),
	path = require('path'),
	fs = require('fs'),
	assert = require('assert');

function execPS(cmd,opts){
	opts = Object.assign({
		executionPolicy: 'Bypass',
		debugMsg: true,//typeof process.env.RUBDEBUG !== 'undefined',
		noProfile: true,
		noJSON:false,
		jsonDepth: 6
	},opts||{});
	if(typeof cmd === 'string'){
		cmd=[cmd];
	}
	let pipeToJSON="";
	if(!opts.noJSON) { pipeToJSON = `| ConvertTo-Json -Compress -Depth ${opts.jsonDepth}`; }

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
	get:function(key){
		key=key.replace(/\//g,"\\");
		let rpath= path.dirname(key);
		let name= path.basename(key);
		return execPS(`Get-ItemPropertyValue -Path ${rpath} -Name ${name}`,{jsonDepth:1});
	},
	set:function(key,value){

		key=key.replace(/\//g,"\\");
		let rpath= path.dirname(key);
		let name= path.basename(key);
		let type= typeof value === 'number' ? 'DWord' : 'String';
		let v= type === 'String' ? `"${value}"` : value;
		return execPS([
			`New-Item -Path ${rpath} -Force`,
			`New-ItemProperty -Path ${rpath} -PropertyType ${type} -Name ${name} -Value ${v} -Force`
		],{noJSON:true})
		.then((res)=>{
			// Powershell freezes if we try to convert the result to JSON....
			return value; // So let's just return value as a token of success.
		});
	}
};

const fw = {
	DIRECTIONS: [,'in','out'],
	ACTIONS: [,,'allow',,'drop'],
	ENABLED: [,true,false],
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

function remapService(s,related){
	let service= {
		id: s.Name,
		name: s.DisplayName,
		startType: ([,,'automatic','manual','disabled'])[s.StartType],
		status: ([,'stopped',,,'running'])[s.Status]
	};

	if(related){
		service.dependsOn=s.RequiredServices.map((c)=>c.ServiceName);
	}
	if(related){
		service.dependencyOf= s.DependentServices.map((c)=>c.ServiceName);
	}
	return service;
};

module.exports.services={
	list:(opts)=>{
		opts=Object.assign({
			withRelated: false // Flippin this to true makes everything considerably slow.
		},opts);
		let params=[];
		// Can contain wildcard '*'
		if(opts.name)		params.push(`-Name "${opts.name}"`);
		// I guess the microdorks tried to negate their name-wildcard when they thought of `-Exclude`
		if(opts.exclude)	params.push(`-Exclude "${opts.exclude}"`);
		let where =[];
		if(opts.status)		where.push(`{$._.Status -eq "${opts.status}"`)

		return execPS(`Get-Service ${params.join(' ')}`+ (where.lenght? `| Where ${where.join(' ')}`:''),{jsonDepth: opts.withRelated ? 3 : 2})
		.then((res) => {
			return res.map((service) => remapService(service,opts.withRelated));
		});
	},
	/**
	* Stops and disables services
	*/
	disable:(id, opts)=>{
		opts = Object.assign({
			dontStop:false
		},opts);
		assert.ok(id,'Id(Name) of service is required.');
		return execPS(`Set-Service -Name ${id} -StartupType disabled ${opts.dontStop ? '':'-Status stopped'} -PassThru`,{jsonDepth: 3})
		.then((res)=>{
			return remapService(res);
		});
	},
	enable: (id,startType,opts)=>{
		opts = Object.assign({
			startType:startType || 'automatic',
			dontStart: true
		},opts, typeof startType === 'object' ? startType : {});

		assert.ok(id,'Id(Name) of service is required.');
		opts.startType=opts.startType || '';
		assert.ok(['automatic','manual'].includes(opts.startType.toLowerCase()),'startType is supposed to be either "automatic" or "manual"')
		return execPS(`Set-Service -Name ${id} -StartupType ${opts.startType} ${opts.startType === 'automatic' && !opts.dontStart ? '':'-Status running'} -PassThru`,{jsonDepth: 3})
		.then((res)=>{
			return remapService(res);
		});

	}

}

module.exports.fs={
	takeOwnership: (pathname) => {
		assert.ok(fs.existsSync(pathname),`Cannot find path "${pathname}"`);
		//TODO: provide a bit better feedback, this command runs now but
		// it has a bad exit-status and no way of telling if it actually did succeed.
		// But it seems to be working for now.
		return execPS(`cmd /c 'takeown /f "${pathname}" && icacls "${pathname}" /grant administrators:F'`,{noJSON:true})
		.then((res)=> console.warn(res))
		.catch((res)=> console.warn(res));
	}
};