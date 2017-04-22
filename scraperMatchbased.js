/* Scraper using the casperjs framework with phantomjs */
/* run: casperjs scraperMatchbased.js > out.json */

var casper = require('casper').create();
var players;
var matchstats;

//Returns the link to every BBL player's personal profile page
function getPlayerPageLink() {
    // Scrape player names and profile link
    var playerCells = document.querySelectorAll('.aleft.footable-visible');
    return Array.prototype.map.call(playerCells, function (e) {
    	elem = e.firstElementChild;
    	while(elem && elem.tagName != 'A')
    		elem = elem.nextElementSibling;
    	if(elem)
    		return {pname:elem.textContent, link:elem.getAttribute('href')};
    	else
    		return null;
    }); 
}

//console.log('Starting');

// Opens casperjs homepage
casper.start('http://www.easycredit-bbl.de/de/statistiken/spieler/spieler-statistiken/');

casper.then(function () {
    //console.log('evaluating');
    var links = document.querySelectorAll('.aleft');
    //console.log('Links found:' + this.evaluate(getPlayers));
    players = this.evaluate(getPlayerPageLink);
    //console.log('Found ' + players.length + ' players!');
    //console.log(casper.getPageContent()); 
    //-> Works, does load all players, why is aleft footable-visible not found ?
});

//Follow links
casper.then(function() {
	for(pidx = 0;pidx < players.length;pidx++)
	{
		player = players[pidx];
		if(!player) continue;
		//console.log('Going to: http://www.easycredit-bbl.de' + player.link + ' for player ' + player.pname);
		this.thenOpen('http://www.easycredit-bbl.de' + player.link + '?pname=' + encodeURI(player.pname), 
			function(a)
			{
			//console.log(casper.getPageContent()); 
			/* Decode parameter */
			pname = decodeURI(a.url.substring(a.url.indexOf('?pname=') + 7));
			//console.log('Scraping player: ' + pname);
			/* Evaluate player page */
			res = this.evaluate(function(pname) {
				    var explanation = '';
				    var matchstats = [];
				    /* Find correct table in page (there is only 1) */
				    var matchtable = document.querySelectorAll('table.stats.footable.sub.footable-loaded.no-paging');
				    /* Process table head -> extract stat descriptions (e.g. "2 Points made") */
				    var thead = matchtable[0].querySelector('thead');
			            var statexplraw = [];
			            /* Structure: 
			            <tr>
			            	<th></th>
			            	...
			            </tr>
			            <tr>
			               <th>stat description 1</th>
			               <th>stat description 2</th>
			               ...
			            </tr>
			            */
				    var elem = thead.firstElementChild;
				    while(elem)
				    {
				    	//explanation += 'tag: ' + elem.tagName + '\n';
				    	var td = elem.firstElementChild;
				    	while(td)
				    	{
				    		content = td.innerHTML;
				    		if(content)
				    			statexplraw.push(content);
				    		td = td.nextElementSibling;
				    	}
				    	elem = elem.nextElementSibling;
				    }
				    
				    var statexpl = [];
				    /* Stat description either contained in <span> element or <div> element
				    => check <span> first, if no result, check <div>, save text content */
				    var patt = new RegExp('(?:<span>)(.*)(?:<\\/span>)');
				    var altpatt = new RegExp('(?:<div>)(.*)(?:<\\/div>)');
				    for(i=0; i< statexplraw.length; i++)
				    {
			    		res = patt.exec(statexplraw[i]);
			    		if(!res || res[1].length == 0)
			    		{
			    			explanation += 'Executing alternative pattern on: ' + statexplraw[i] + '\n';
			    			res = altpatt.exec(statexplraw[i].replace(/(\r\n|\n|\r)/gm,''));
			    			explanation += 'Result: ' + (res ? res:'None') + '\n';
			    		}
			    		if(res)
			    		{
			    			statexpl.push(res[1]);
			    		}
				    }
				    //return explanation;
				    //return statexpl;
				    //explanation += 'Extracted stat explanations: ' + statexpl.length + '\n';
				    
				    var tbody = matchtable[0].querySelector('tbody');
				    //return (!statlines ? 0:statlines.length);
				    /*
				    Extract stats from <tbody> tag
				    Structure:
				    <tbody>
				    	<tr>
				    	   <td>value stat 1 game 1</td>
				    	   <td>value stat 2 game 1</td>
				    	   ...
				    	</tr>
				    	<tr>
				    	   <td>value stat 1 game 2</td>
				    	   <td>value stat 2 game 2</td>
				    	   ...
				    	</tr>
				    </tbody>
				    */
				    var curline = {player:pname};
				    elem = tbody.firstElementChild;
				    while(elem)
				    {
				    	    var statline = elem.firstElementChild;
				    	    var ctr = 0;
				    	    /* Get the corresponding description to every stat and save
				    	    stat as key/value pair */
					    while(statline)
					    {
					    	idx = statexpl[ctr % statexpl.length];
					    	//explanation += 'Index: ' + idx;
					    	var content = statline.innerHTML;
					    	curline[idx] = content;
				    		ctr++;
					    	statline = statline.nextElementSibling;
					    }
					    matchstats.push(curline);
					    curline = {player:pname};
				    	    elem = elem.nextElementSibling;
				    }
				    return matchstats; 
			}, pname); 
			//console.log(casper.getPageContent());
			//console.log('Result: ' + JSON.stringify(res));
			
			/* Postprocess result line */
			for(i = 0; i<res.length; i++)
			{
				//console.log('Getting keys');
				var keys = Object.keys(res[i]);
				//console.log('Keys: ' + keys);
				for(j=0; j<keys.length; j++)
				{
					/* Turn 'Gegner <br> Ergebnis' entry into two separate entries */
					if(keys[j] == 'Gegner <br> Ergebnis')
					{
						var content = res[i][keys[j]];
						var bridx = content.indexOf('<br>');
						//console.log('Generating Gegner: ' + content.substring(content.indexOf('>')+1, bridx));
						res[i]['Gegner'] = content.substring(content.indexOf('>')+1, bridx);
						res[i]['Ergebnis'] = content.substring(bridx + 4, content.indexOf('<', bridx + 4)); 
						res[i]['Gegner <br> Ergebnis'] = undefined;
					}
				}
			}
			
			/* Add scraped stats to the pool of stats */
			if ( matchstats instanceof Array )
	   			matchstats = matchstats.concat( res );
			else
			{
			   	matchstats = res;
			}
		});
	}
});

casper.run(function () {
    /* Output results */
    for(var i in matchstats) {
    	console.log(JSON.stringify(matchstats[i]));
    }
    casper.done();
});
