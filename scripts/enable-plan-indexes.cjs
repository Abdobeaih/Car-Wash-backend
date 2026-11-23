// Explicit publisher-approved migration. Never imported by application startup.
const mongoose=require('mongoose');
(async()=>{
 if(process.env.APPROVE_PLAN_INDEX_MIGRATION!=='true')throw Error('Explicit migration approval required.');
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required.');
 const c=await mongoose.createConnection(process.env.DATABASE_URL,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:5000}).asPromise();
 try{
  const hello=await c.db.admin().command({hello:1});
  if(!hello.setName&&hello.msg!=='isdbgrid')throw Error('Plan migration requires transaction-capable Mongo topology.');
  const names=(await c.db.listCollections({}, {nameOnly:true}).toArray()).map(x=>x.name);
  if(!names.includes('bookings'))throw Error('Existing bookings collection not found. Check target database.');
  if(!names.includes('enrollments'))await c.db.createCollection('enrollments');
  await c.db.collection('enrollments').createIndex({activationKey:1},{name:'activationKey_1',unique:true});
  await c.db.collection('bookings').createIndex({redemptionKey:1},{name:'booking_plan_redemption_unique',unique:true,partialFilterExpression:{redemptionKey:{$type:'string'}}});
  console.log('Plan indexes ready. No enrollment/customer records created.');
 }finally{await c.close();}
})().catch(error=>{console.error('Plan migration failed. Review target database and index compatibility. Error code:',error.code??'none');process.exitCode=1;});
