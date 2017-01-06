var expect = require('chai').expect,
	rubberGlove=null;

describe('A rubber-glove to protect me from Microsoft',function(){
	before(function(){
		rubberGlove = require('../lib/rubberglove.js');
	})
	describe(', the firewall:',function(){
		it('should list all firewall rules',function(done){
			rubberGlove.firewall.getRules()
			.then(function(rules){
				rules.forEach(function(rule){
					console.log(rule.enabled+"\t"+rule.direction+"\t"+rule.action+"\t"+rule.name)
				})
				console.log("Listed",rules.length,"rules");
				expect(rules).to.not.be.empty;
			})
			.then(done)
			.catch(done);
		})
		it('should add and remove new rules',function(done){
			rubberGlove.firewall.addRule({
				name: 'Test rule',
				direction: 'both',
				action: 'drop',
				enabled: true,
				match: { remoteip: '191.232.139.254'}
			})
			.then((rules)=>{
				return Promise.all( rules.map((rule)=> rubberGlove.firewall.removeRule(rule.id)) );
			})
			.then(()=> done())
			.catch(done);	
		});
		it('should delete rules');
	});

	describe(', the registry:',function(){
		it('should read keys');
		it('should write keys');
	});

	it('should inactivate scheduled tasks');

	describe(', the windows-store',function(){
		it('should list installed malware')
		it('should uninstall applications');
	});
})