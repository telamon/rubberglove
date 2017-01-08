const expect = require('chai').expect,
	fs = require('fs'),
	path = require('path'),
	tweaks = require(path.join(__dirname,'..','lib','tweaks'));

describe("tweaks management.",function(){
	let list = null,
		tweak = null;
	before(function(){
		list = tweaks.list();
		tweak = tweaks.loadTweak(path.join(__dirname,'tweak_dummy.js'));
	})

	it('should list available fixes',function(){
		expect(list.length).to.be.above(0);
	})
	it('should extract info from a tweak',function(){
		expect(tweak).to.have.property('category');
		expect(tweak).to.have.property('up');
		expect(tweak).to.have.property('down');
		expect(tweak).to.have.property('description');
		expect(tweak).to.have.property('compat');
		expect(tweak).to.have.property('sourceURL');
	});
	it('should apply and revert a tweak',function(done){
		if(fs.existsSync('dummyfile')){
			fs.unlinkSync('dummyfile');
		}
		tweak.apply()
		.then((res)=>{
			expect(res).to.not.be.ok;
			expect(fs.existsSync('dummyfile')).to.be.true;
			return tweak.revert();
		})
		.then((res)=>{
			expect(res).to.not.be.ok;
			expect(fs.existsSync('dummyfile')).to.not.be.true;
		})
		.then(done)
		.catch(done);
	});
	it('should pretend to apply and revert tweaks');
})
