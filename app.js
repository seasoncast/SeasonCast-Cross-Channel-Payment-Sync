
const jwt_decode = require('jwt-decode')
const axios = require('axios').default;


const API_URL = "https://app.seasoncast.com/v2"

var channels = []
async function getChannelPayments(token){
    const request = await axios.post(`${API_URL}/broadcaster/payment/information`, {
        token
    })

    return request.data
}

async function addPaymentHolder(token, viewer_email, time){

    const request = await axios.post(`${API_URL}/broadcaster/payment/seasonPass/customer/create`, {
        token,
        viewer_email,
        time
    })

    return request.data
}



async function update(){
    var masterList = new Map()
    var eachChannelList = new Map()

    //create Master List
    for (let channel of channels) {
        var channelInfo = jwt_decode(channel);
        const result = await getChannelPayments(channel)
        var channelList = {} 
        let activeHolders = result.seasonPassHolders.filter((payment)=>(payment.isExpired == false))

        console.log(`[${channelInfo.name}] found ${activeHolders.length} active payment(s)`)

        for (let holder of activeHolders) {
            if ((!masterList.get(holder.email) || holder.expire > masterList.get(holder.email).expire)){
            masterList.set(holder.email,holder);
            }

            channelList[holder.email] = holder;
        }

        eachChannelList.set(channel, activeHolders)
    }
   
    //Loop channels and add holders to non-added channels
    for (let [channelToken, channelHolders] of eachChannelList) {
         channelInfo = jwt_decode(channelToken);
        for (let [masterHolderEmail, masterHolder] of masterList) {
            if (channelHolders.some((viewer) => (viewer.email == masterHolderEmail && viewer.expire > masterHolder.expire - 60))){
                //found matching pass
            }else{
                let currentMs = new Date().getTime() / 1000
                let newTime = Math.floor(masterHolder.expire - currentMs)
                console.log(`[${channelInfo.name}] adding ${masterHolder.email} for expire time in ${newTime}`)
                await addPaymentHolder(channelToken, masterHolder.email, newTime)
            }
        }
    }
}
const prompt = require('prompt-sync')();

console.log("Welcome to the SeasonCast Payment Sync App")
console.log("This will keep mutiple channels in sync with each other at the top of the hour")
var inSetup = true
while (inSetup){
    const enterValue = prompt('Please enter channel token (enter "start" to run program or "exit" to leave): ');
    switch (enterValue){
    case "start":
        console.log("Program Started!")
        inSetup = false
        break;
    case "exit":
        process.exit(1)
        
    default:
        try {
    var channelInfoSetup = jwt_decode(enterValue);
    console.log('Channel '+channelInfoSetup.name+' added! ')
    channels.push(enterValue)
        }catch{
            console.log("error: please enter vaild SeasonCast API token")
        }
    }
}
update()
var CronJob = require('cron').CronJob;
var job = new CronJob('0 * * * * *', function() {
    update()
}, null, true, 'America/Los_Angeles');
job.start();

