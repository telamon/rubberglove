const path = require('path');

const maliciousSoftware=[
	'c:\windows\system32\speech_onecore\common\speechmodeldownload.exe', // Windows Speech Download Executable
	'c:\windows\system32\werfault.exe', // Windows Problem Reporting
	'c:\windows\system32\wermgr.exe', // Windows Problem Reporting
	'c:\windows\system32\compattelrunner.exe', // Windows Compatiblity Telemetry
];

module.exports= {
	category: 'integrity',
	compat: 'W10+',
	description: 'Prevent Microsoft from spying on you',
	up: function(){
		let promises= maliciousSoftware.map((program)=>{
			return this.glove.firewall.addRule({
				id: `PREVENT_MSSPYWARE_${path.basename(program)}`,
				name: 'Prevent Microsoft Spyware',
				match: {
					program: program
				}
			});
		});
		return Promise.all(promises);
	},
	down: function(){
		Promise.all(maliciousSoftware.map((program)=>{
			return this.glove.firewall.removeDirectionalRule(`PREVENT_MSSPYWARE_${path.basename(program)}`);
		}));
	}
}