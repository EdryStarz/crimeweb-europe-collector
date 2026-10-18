/** Bounded authenticated server work; no private app algorithms or news data. */
export async function runMaintenance(step,{deadline,maxSteps=80,now=Date.now}={}){
  let steps=0,updated=0,pending=false;
  while(steps<maxSteps&&now()<deadline-30000){
    const result=await step();
    if(typeof result?.more!=='boolean'||!Number.isInteger(result.updated)||result.updated<0||result.updated>1)throw new Error('Invalid maintenance acknowledgement');
    steps++;updated+=result.updated;pending=result.more;
    if(!result.more||result.busy||result.retry)break;
  }
  return {steps,updated,pending};
}
