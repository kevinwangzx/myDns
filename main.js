const mdns = require("multicast-dns")({ port: 2050 })
const axios = require('axios')
const Koa = require('koa')
const app = new Koa()
const bodyParser = require('koa-bodyparser')

const dns = require("dns");
const { fstat } = require("fs");
const dnsPromises = dns.promises;
const googleResolver = new dnsPromises.Resolver()
googleResolver.setServers(['8.8.8.8', '4.4.4.4'])
const chinaResolver = new dnsPromises.Resolver()
chinaResolver.setServers(['114.114.114.114', '129.129.129.129'])


var chinaBlockedList = ``

const fs = require('fs')

fs.open('./config/gfwlist.txt', 'r', (err, fd) => {
    let gfwlist = fs.readFileSync('./config/gfwlist.txt')
    chinaBlockedList = gfwlist.toString()
})

function refreshDomainList() {
    axios.get('https://res.343.re/Share/gfwlist/gfwlist.txt').then(res => {

        if (res.data.length > 80000) {
            chinaBlockedList = res.data

            if (res.data.length !== chinaBlockedList.length) {
                console.log("file Updated: ")
                chinaBlockedList = res.data
                fs.writeFile('./config/gfwlist.txt', res.data, () => { })
            }
        }
    })
}
refreshDomainList(); setInterval(() => { refreshDomainList() }, 24 * 3600000)
servers = dnsPromises.getServers()

mdns.on('query', function (query, rinfo) {
    let question = query.questions[0]
    let answer = []
    if (question.name && typeof question.name === "string") {
        re = new RegExp('' + question.name.split('.').join('\\.'), 'gi')
        if (chinaBlockedList.match(re)) {
            console.log(" in blockList", question.name, question.type)
            googleResolver.resolve(question.name, question.type).then(result => {
                if (typeof result == "object") {
                    result.forEach(r => answer.push({
                        name: question.name,
                        type: question.type,
                        data: r
                    }))
                }
                mdns.respond({ id: query.id, answers: answer }, rinfo)
            }).catch(error => {
                console.log(error.message)
            })

        } else {
            console.log("not in blockList", question)
            chinaResolver.resolve(question.name, question.type).then(result => {
                if (typeof result == "object") {
                    result.forEach(r => answer.push({
                        name: question.name,
                        type: question.type,
                        data: r
                    }))
                }
                mdns.respond({ id: query.id, answers: answer }, rinfo)
                //mdns.respond()
            }).catch(error => {
                console.log('error: ', error)
                mdns.respond({ id: query.id, answers: answer }, rinfo)
            })
        }
    }
})

app.use(bodyParser())
app.use(async (ctx) => {
    console.log("Request ", ctx)
    if (ctx.url == '/dns' && ctx.method == 'POST') {
        let query = ctx.request.body

        question = JSON.parse(query.question)
        let answer = []
        let test = await googleResolver.resolve(question.name, question.type).then(result => {
            if (typeof result == "object") {
                result.forEach(r => answer.push({
                    name: question.name,
                    type: question.type,
                    data: r
                }))
            }
            let data = {
                answer: { id: query.id, answers: answer },
                rinfo: query.rinfo
            }
            console.log(question, JSON.stringify(data))
            return JSON.stringify(data)
        }).catch(error => {
            console.log(error.message)
            let data = {
                answer: { id: query.id, answers: [] },
                rinfo: query.rinfo
            }
            return JSON.stringify(data)
        })
        console.log(test)
        ctx.body = {
            errCode: 200,
            errMsg: "ok",
            data: [
                test
            ]
        }
    }
})
app.listen(3000, () => {
    console.log('[demo] request post is starting at port 3000')
})