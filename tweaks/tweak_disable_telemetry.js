// Tweak reference:
// http://winaero.com/blog/how-to-disable-telemetry-and-data-collection-in-windows-10/

module.exports= {
	category: 'performance|integrity',
	compat: 'W10+',
	description: 'Tries to completely disable MicrosoftKeylogger(TM).',
	up: ()=>{
		return rubberglove.registry
		.set('HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DataCollection','AllowTelemetry',0)
		.then(()=>rubberglove.services.disable('dmwappushsvc'));
	},
	down: ()=>{
		return rubberglove.registry
		.unset('HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\DataCollection','AllowTelemetry');
		.then(()=>rubberglove.services.setStartup('dmwappushsvc','automatic'));
	}
}