const {Pool,Client}=require('pg');

const connectionString='postgressql://postgres:admin@localhost:5432/lms';

const client=new Client({
    connectionString:connectionString
});

client.connect();
client.query('SELECT * FROM public."login"',(err,res)=>{
    console.log(err,res)
    client.end()
})