// Tweak reference:
// http://winaero.com/blog/how-to-disable-telemetry-and-data-collection-in-windows-10/


module.exports= {
	category: 'performance|integrity',
	compat: 'W10+',
	description: 'Tries to completely disable MicrosoftKeylogger(TM).',
	up: function(){
		return this.glove.registry
		.set('HKLM:/SOFTWARE/Policies/Microsoft/Windows/DataCollection/AllowTelemetry',0)
		.then(()=>this.glove.services.disable('dmwappushservice'));
	},
	down: function(){
		return this.glove.registry
		.unset('HKLM:/SOFTWARE/Policies/Microsoft/Windows/DataCollection/AllowTelemetry')
		.then(()=>this.glove.services.setStartup('dmwappushservice','automatic'));
	}
}