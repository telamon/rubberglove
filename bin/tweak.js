#!/usr/bin/env node
const program = require('commander');

program
	.version('0.0.1')
	.command('list','Lists available fixes').alias('l')
	.command('fix [name]','Applies changes to the system').alias('f')
	.command('restore [name]','Reverts a fix in the system').alias('r')
	.option('-v --verbose','Logs more information for debugging')
	.parse(process.argv);