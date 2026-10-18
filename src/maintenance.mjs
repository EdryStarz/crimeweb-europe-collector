/** Bounded authenticated server work; no private app algorithms or news data. */
export async function runMaintenance(step,{deadline,maxSteps=80,now=Date.now}={}){
  let steps=0,updated=0,deferred=0,pending=false;
  while(steps<maxSteps&&now()<deadline-30000){
    const result=await step();
    if(typeof result?.more!=='boolean'||!Number.isInteger(result.updated)||result.updated<0||result.updated>1)throw new Error('Invalid maintenance acknowledgement');
    const waiting=result.deferred??0;
    if(!Number.isInteger(waiting)||waiting<0||waiting>1)throw new Error('Invalid deferred acknowledgement');
    steps++;updated+=result.updated;deferred+=waiting;pending=Boolean(result.more||result.busy||result.retry||deferred);
    if(!result.more||result.busy||result.retry)break;
  }
  return {steps,updated,deferred,pending};
}
