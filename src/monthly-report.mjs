import { spawnSync } from 'node:child_process';
const repository=process.env.GITHUB_REPOSITORY;
if(!/^[\w.-]+\/[\w.-]+$/.test(repository??''))throw new Error('Invalid report repository');
const month=new Date().toISOString().slice(0,7),endpoint='repos/'+repository+'/contents/status/'+month+'.json';
const existing=spawnSync('gh',['api',endpoint],{encoding:'utf8'});
if(existing.status===0){console.log('Monthly report already exists.');process.exit(0);}
if(!existing.stderr.includes('404'))throw new Error('Could not check monthly report');
const count=name=>{const value=Number(process.env[name]);if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid report count');return value;};
const report={month,at:new Date().toISOString(),run:'https://github.com/'+repository+'/actions/runs/'+process.env.GITHUB_RUN_ID,feeds:count('REPORT_FEEDS'),created:count('REPORT_CREATED'),note:'First successful run of this month; not monthly totals.'};
const body={message:'Record successful collection report for '+month,content:Buffer.from(JSON.stringify(report,null,2)+'\n').toString('base64')};
const result=spawnSync('gh',['api','--method','PUT',endpoint,'--input','-'],{input:JSON.stringify(body),encoding:'utf8'});
if(result.status!==0)throw new Error('Could not publish monthly report');
console.log('Monthly operational report published.');
