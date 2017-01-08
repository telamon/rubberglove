// Tweak reference:
// http://winaero.com/blog/how-to-disable-telemetry-and-data-collection-in-windows-10/


module.exports= {
	category: 'performance|integrity',
	compat: 'W10+',
	description: 'Tries to completely disable MicrosoftKeylogger(TM).',
	up: function(){
		console.log(this);
		return this.glove.registry
		.set('HKLM:/SOFTWARE/Policies/Microsoft/Windows/DataCollection','AllowTelemetry',0)
		.then(()=>rubberglove.services.disable('dmwappushsvc'));
	},
	down: function(){
		return this.glove.registry
		.unset('HKLM:/SOFTWARE/Policies/Microsoft/Windows/DataCollection','AllowTelemetry')
		.then(()=>rubberglove.services.setStartup('dmwappushsvc','automatic'));
	}
}