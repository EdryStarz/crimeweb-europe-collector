import {loadFeed,publicUrl} from './feed.mjs';
const urls=(process.env.FEED_URLS??'').trim().split(/\s+/).filter(Boolean);
if(!urls.length||urls.length>5)throw new Error('Supply one to five public feed URLs');
for(const value of urls)publicUrl(value);
await Promise.all(urls.map(async value=>{
  try{const entries=await loadFeed(value);console.log(JSON.stringify({url:value,entries:entries.length}));}
  catch(error){
    const status=error.message.match(/^RSS HTTP (\d{3})$/)?.[1];
    console.log(JSON.stringify({url:value,error:status?'RSS HTTP '+status:'RSS fetch or parsing failed'}));
    process.exitCode=1;
  }
}));
