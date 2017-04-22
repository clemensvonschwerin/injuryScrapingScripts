/* Scraper using the casperjs framework with phantomjs */
/* run: casperjs scraperMatchbased.js > matchresults.json */

var casper = require('casper').create();
var links = [];
var result;

var urls = ['http://www.basketball-ulm.com/news-archiv', 'http://www.brosebamberg.de/saison/news/', 
'http://www.medi-bayreuth.de/news/uebersicht/'];

// Opens start page for scraping
casper.start();

urls.forEach(function(url) {
    casper.thenOpen(url, function() {
         //Find all internal links in page
         var content = casper.getPageContent();
         var linkPattern = new RegExp('(?:<a .*href=")([^"]*)', 'g');
         var res;
         var baseUrl = this.getCurrentUrl();
         var sepIdx = baseUrl.indexOf('/', baseUrl.indexOf('//') + 2);
         baseUrl = baseUrl.substring(0, sepIdx);
         while(res = linkPattern.exec(content))
         {
            //only follow internal links
            if(res[1].indexOf('http:') == 0 || res[1].indexOf('www') == 0) continue;
            links.push(baseUrl + '/' + res[1]);
         } 
    });
});

casper.run(function () {
    console.log('Found the following links: ');
    console.log(result);
    /* Output results as JSON list*/
    for(var i=0; i<links.length; i++)
    {
      console.log(links[i]);
    }
    casper.done();
});
