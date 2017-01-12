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
				done();
			})
			.catch(done)
		});
		it('should set keys',function(done){
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
		it('should list all known service',function(done){
			rubberGlove.services
			.list({withRelated:true})
			.then(function(services){
				expect(services.length).to.be.above(0);
				let aService=services[0];
				expect(aService).to.have.property('status');
				expect(aService).to.have.property('startType');
				expect(aService).to.have.property('name');
				expect(aService).to.have.property('id');
				expect(aService).to.have.property('dependsOn');
				expect(aService).to.have.property('dependencyOf');
				services.forEach((service)=>{
					//console.log(`${service.status}\t${service.startType}\t${service.id}\t${service.name}`);
					console.log(service)
				})
				done();
			})
			.catch(done);
		})
		it('should disable a service',function(done){
			rubberGlove.services.disable('XblGameSave')
			.then((service)=>{
				expect(service).to.have.property('startType','disabled');
				expect(service).to.have.property('status','stopped');
				done()
			})
			.catch(done);
		});
		it('should enable a service',function(done){
			rubberGlove.services.enable('XblGameSave','manual')
			.then((service)=>{
				expect(service).to.have.property('startType','manual');
				done()
			})
			.catch(done);
		});
		it.skip('should stop a service',function(done){
			rubberGlove.service.start('XblGameSave');
		});
		it('should start a service');
		it('should restart a service');
	});
	describe('Windows filesystem utils.',function(done){
		it('should grant access for admin to locked folders',function(done){
			rubberGlove.fs.takeOwnership('.')
			.then(()=>done())
			.catch(done);
		})
	})
})