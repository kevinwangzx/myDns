const mdns = require("multicast-dns")({ port: 53 })
const axios = require('axios')
const dns = require("dns");
dns.setServers([
    '34.85.72.127:2050',
]);
const { fstat } = require("fs");
const dnsPromises = dns.promises;
const googleResolver = new dnsPromises.Resolver()
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

