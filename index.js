/**
 * Program to try to download  as much pages as possible from a url
 * 
 *  written by : joseph chdid
 */


const process = require('process');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { exit } = require('process');
let url = "https://www.sivasakti.com";
let mainSection = '';
let linkSubString
let links = [];
let regex = ".*\\://?([^\\/]+)"; //regex to get domain from url
let totalRequests = 0;
let totalSuccessRequests = 0;
let totalLinksFound = 0;
var dir;

async function fetchData(target) {
    try {
        setTimeout(function(){}, 1000);
        totalRequests++;
        let targetSubString = target.match(regex);
     
        if(targetSubString === undefined || targetSubString === null){
             console.log(`Error fetching ${target} `);
             return;
        }
        //link reroutes to another domain
        if(targetSubString[1] !== linkSubString[1]) {
            console.log(`current link : ${target} does not match ${url} : skipping`);
            return;
        }
        else 
        {   
            console.log(`fetching ${target}`);
            totalSuccessRequests++;
            let response  = await axios(target).catch((err) =>  console.log(`Error fetching ${target} `));
            if(response.status !== 200) {
                console.log(`Error fetching ${target} `);
                return;
            }      
            return response;    
        }   
    }catch(e){console.log(`Error fetching ${target} `)}
       
}

//extract all links from page
function parsePageLinks($) {
    try {
    let pageLinks = $('body a[href]');
    pageLinks.each(function(link) {
        
            let path = $(this).attr('href');
            totalLinksFound++;
            //link exists in list or is an image or mp3, no need to parse
            if(path.indexOf('.mp3') > 0 || path.indexOf('.jpg') > 0 || links.includes(path))
                return;
            else {
                links.push({path : path, visited: false });
            }  
    });
    }catch(e){}
}


//foreach page, extract links, check if visited , if not parse page, mark as visited
async function parseAllLinks() {
    try {
            
        for(let i = 0; i < links.length; i++) {
            if(links[i].visited === true) {
                continue;
            }
            else {
                var linkResult = await fetchData(links[i].path);
                const $ = cheerio.load(linkResult.data);
                parsePageLinks($);
                let page = $(`body ${mainSection}`);
                    if(page !== undefined || page !== null){
                    fs.appendFileSync(path.join(dir, `file-${totalRequests}.html`), page.html(), function(err) {
                        if(err) throw err;
                    });
                }
                links[i].visited = true;
            }
        }    
    }catch(e){}
   
}

function output() {
    console.log("Crawl and extract as much pages as possible from website");
    console.log("To start enter target url\npath to save results to \nOptional --class or --id for main tag to extract from body (default extracts entire body) ");
   
    exit(0)
}

async function start() {
    //process args 
    try {

    let args = process.argv.slice(2);
    if(args[0] === "help" || args[0] === "-h" || args.length === 0 ){
       output();
    }
    else{
        url = args[0];
        dir = args[1];
        if(args[2] !== null || args[2] !== undefined){
            switch (args[2]) {
                case '--class':
                    mainSection = `.${args[3]}`
                    break;
                case '--id': 
                   mainSection = `#${args[3]}`
                   break;
                default:
                    output();
                    break;
            }
        }
        if(args.length > 4) {
            console.log(`expected maximum 4 arguments, found  ${args.length} : ignoring rest `);
        }
       
       
        linkSubString= url.match(regex);
        
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        };
        //fetch main page 

        var res = await fetchData(url);
        //parse links for first time
        parsePageLinks(cheerio.load(res.data));
        if(links.length === 0) {
            console.log('The parsed page contained 0 links : terminating');
        }
        else {
            await parseAllLinks();
            console.log('---------------------');
            console.log(`links found : ${totalLinksFound}`);
            console.log(`requests made : ${totalRequests}`);
            console.log(`succcessful requests : ${totalSuccessRequests}`);
        }
      }  
    }catch(e){output();}
}


start();
