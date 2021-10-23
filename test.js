const dns = require("dns");
dns.setServers([
    '34.85.72.127:2050',
]);
const dnsPromises = dns.promises;
myresolver = new dnsPromises.Resolver()
//myresolver.setServers(['34.85.72.127'])
myresolver.resolve('google.com', 'A').then(result => console.log(result)).catch(e => console.log(e))
