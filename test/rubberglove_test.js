const expect = require('chai').expect,
	path= require('path'),
	rubberGlove=require('../lib/rubberglove.js');

describe('A rubber-glove to protect me from Microsoft.',function(){
	describe('The firewall:',function(){
		it('should list all firewall rules',function(done){
			rubberGlove.firewall.getRules()
			.then(function(rules){
				rules.forEach(function(rule){
					console.log(rule.enabled+"\t"+rule.direction+"\t"+rule.action+"\t"+rule.id)
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
		it('should update');
	});

	describe('The registry:',function(){
		const DUMMYPATH='HKLM:/SOFTWARE/Policies/Microsoft/Rubber/Dummy';
		it('should read keys',function(done){
			rubberGlove.registry.get('HKLM:/SOFTWARE/Microsoft/Windows/CurrentVersion/ProgramFilesDir')
			.then((value)=>{
				expect(value).to.be.a('string');
				expect(value).to.equal('C:\\Program Files');
			})
			.catch(done)
		});
		it.only('should set keys',function(done){
			rubberGlove.registry
			.set(path.join(DUMMYPATH,'TestIntegerKey'),0)
			.then(()=>{
				return rubberGlove.registry.get(path.join(DUMMYPATH,'TestIntegerKey'));
			})
			.then((value)=>{
				expect(value).to.be.a('number');
				expect(value).to.be.equal(0);
			})
			.then(()=>done())
			.catch(done);
		});
		it("should unset keys")
	});

	it('should inactivate scheduled tasks');

	describe('The windows-store:',function(){
		it('should list installed malware')
		it('should uninstall applications');
	});
	describe('Services:',function(){
		it('should disable services');
		it('should enable services');
	})
})