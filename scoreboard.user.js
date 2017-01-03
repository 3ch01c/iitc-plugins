//==UserScript==
// @id             iitc-plugin-scoreboard@3ch01c
// @name           IITC plugin: show a localized scoreboard.
// @category       Info
// @version        0.1.9.20170103
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/3ch01c/iitc-plugins/raw/master/scoreboard.user.js
// @downloadURL    https://github.com/3ch01c/iitc-plugins/raw/master/scoreboard.user.js
// @description    [3ch01c-2017-01-03] A localized scoreboard.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
//==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'local';
plugin_info.dateTimeVersion = '20140220.55018';
plugin_info.pluginId = 'scoreboard';
//END PLUGIN AUTHORS NOTE



//PLUGIN START ////////////////////////////////////////////////////////

//use own namespace for plugin
window.plugin.scoreboard = function() {};

window.plugin.scoreboard.scores = {'team':{},'player':{}};
window.plugin.scoreboard.playerGuids = new Array();

window.plugin.scoreboard.initTeam = function(name) {
	console.log('init team', name);
	var team = {
		'fields': {'count': 0, 'area': {'total': 0, 'max': 0}},
		'links': {'count': 0, 'distance': {'total': 0, 'max': 0}},
		'portals': {'count': 0},
		'resonators': {'count': 0},
	};
	window.plugin.scoreboard.scores.team[name] = team;
};

window.plugin.scoreboard.initPlayer = function(name, team) {
	console.log('init player',name);
	var players = window.plugin.scoreboard.scores.player;
	var player = {
		'team': team,
		'fields': {'created':[], 'destroyed':[]},
		'links': {'created':[], 'destroyed':[]},
		'portals': {'captured':{}, 'neutralized':{}},
		'resonators': {'deployed':[0,0,0,0,0,0,0,0], 'destroyed':[0,0,0,0,0,0,0,0]}
	};
	window.plugin.scoreboard.scores.player[name] = player;
	window.plugin.scoreboard.playerGuids.push(name);
}

window.plugin.scoreboard.compileStats = function() {
	var displayBounds = map.getBounds();
	var somethingInView = false;
	// window.plugin.scoreboard.playerGuids = new Array();
	// window.plugin.scoreboard.scores = {'team': {}, 'player': {}};
	var teams = window.plugin.scoreboard.scores.team;
	window.plugin.scoreboard.initTeam(TEAM_RES);
	window.plugin.scoreboard.initTeam(TEAM_ENL);

	// get field with largest area
	$.each(window.fields, function(qk, field) {
		somethingInView = true;
		console.log('field:', field.options);
		var team = teams[field.options.team];

		var fieldArea = window.plugin.scoreboard.fieldArea(field);
		// console.log('field area = ' + fieldArea + ' km^2');
		team.fields.count++;
		team.fields.area.total += fieldArea;
		if (fieldArea > team.fields.area.max) team.fields.area.max = fieldArea;
		// console.log('max field area = ' + team.fields.area.max + 'km^2');
	});
	$.each(window.links, function(qk, link) {
		somethingInView = true;
		console.log('link:', link.options);
		var team = teams[link.options.team];

		team.links.count++;
		var o = {'latE6': link.options.data.oLatE6, 'lngE6': link.options.data.dLngE6},
			d = {'latE6': link.options.data.dLatE6, 'lngE6': link.options.data.dLngE6};
		var distance = window.plugin.scoreboard.distance(o,d) / 1000;
		// console.log('link length = ' + distance + ' km');
		team.links.distance.total += distance;
		if (distance > team.links.distance.max) team.links.distance.max = distance;
		// console.log('max link = ' + team.links.distance.max + ' km');
	});
	$.each(window.portals, function(qk, portal) {
		// only count portals in current view
		if(!displayBounds.contains(portal.getLatLng())) return;
		somethingInView = true;
		console.log('portal:', portal.options);
		// console.log(portal.options.data.title);
		var team = teams[portal.options.team];
		if(team !== undefined) {
			team['portals']['count']++;
			team['resonators']['count'] += portal.options.data.resCount;
		}
	});
	return somethingInView;
};

window.plugin.scoreboard.teamTableRow = function(field,title) {
	var res, enl;
	if (field.length === 1) {
		res = window.plugin.scoreboard.scores.team[TEAM_RES][field[0]];
		enl = window.plugin.scoreboard.scores.team[TEAM_ENL][field[0]];
	} else if (field.length === 2) {
		res = window.plugin.scoreboard.scores.team[TEAM_RES][field[0]][field[1]];
		enl = window.plugin.scoreboard.scores.team[TEAM_ENL][field[0]][field[1]];
	} else if (field.length === 3) {
		res = window.plugin.scoreboard.scores.team[TEAM_RES][field[0]][field[1]][field[2]];
		enl = window.plugin.scoreboard.scores.team[TEAM_ENL][field[0]][field[1]][field[2]];
	}
	var retVal = '<tr><td>'
		+ title
		+ '</td><td class="number">'
		+ window.digits(Math.round(res))
		+ '</td><td class="number">'
		+ window.digits(Math.round(enl))
		+ '</td><td class="number">'
		+ window.digits(Math.round(res + enl))
		+ '</td></tr>';
	return retVal;
};

window.plugin.scoreboard.fieldInfoArea = function(field) {
	var title, retVal;

	if(field !== undefined) {
		var portal = window.portals[field.options.data.points[0].guid];
		if(portal !== undefined) {
			title = ' @' + portal.options.data.title;
		}

		retVal = '<div title="' + title + '">'
		+ window.digits(Math.round(field.options.data.fieldArea))
		+ '</div>';
	}  else {
		retVal = 'N/A';
	}
	return retVal;
};

window.plugin.scoreboard.playerTableRow = function(name) {
	console.log('init player row');
	var player = window.plugin.scoreboard.scores.player[name];
	console.log(name,player);
	var retVal = '<tr class="'
		+ (player['team'] === 'RESISTANCE' ? 'res' : 'enl')
		+ '"><td>'
		+ name
		+ '</td>';

	var portalsCaptured = 0;
	$.each(player['portals']['captured'], function(i, count) {
		portalsCaptured += count;
	});
	retVal += '<td class="number">'
		+ window.digits(portalsCaptured)
		+ '</td>';
	var portalsNeutralized = 0;
	$.each(player['portals']['neutralized'], function(i, count) {
		portalsNeutralized += count;
	});
	retVal += '<td class="number">'
		+ window.digits(portalsNeutralized)
		+ '</td>';
	var resonatorsDeployed = 0;
	$.each(player['resonators']['deployed'], function(i, count) {
		resonatorsDeployed += count;
	});
	retVal += '<td class="number">'
		+ window.digits(resonatorsDeployed)
		+ '</td>';
	var resonatorsDestroyed = 0;
	$.each(player['resonators']['destroyed'], function(i, count) {
		resonatorsDestroyed += count;
	});
	retVal += '<td class="number">'
		+ window.digits(resonatorsDestroyed)
		+ '</td>';
	var linksCreated = player['links']['created'].length;
	var totalDistance = 0, maxDistance = 0;
	$.each(player['links']['created'], function(i, link) {
		totalDistance += link.distance;
		if (link.distance > maxDistance) maxDistance = link.distance;
	});
	retVal += '<td class="number">'
		+ window.digits(linksCreated)
		+ '</td><td class="number">'
		+ window.digits(totalDistance.toPrecision(2))
		+ '</td><td class="number">'
		+ window.digits(maxDistance.toPrecision(2))
		+ '</td>';
	var fieldsCreated = player['fields']['created'].length;
	var totalMu = 0, maxMu = 0;
	$.each(player['fields']['created'], function(i, field) {
		totalMu += field.mu;
		if (field.mu > maxMu) maxMu = field.mu;
	});
	retVal += '<td class="number">'
		+ window.digits(fieldsCreated)
		+ '</td><td class="number">'
		+ window.digits(totalMu)
		+ '</td><td class="number">'
		+ window.digits(maxMu)
		+ '</td>';
	retVal += '</tr>';
	return retVal;
};

window.plugin.scoreboard.playerTable = function(sortBy) {
	var players = window.plugin.scoreboard.scores.player;

	console.log('init player table sortBy:',sortBy,'playerGuids:',window.plugin.scoreboard.playerGuids,'players:',window.plugin.scoreboard.scores.player);
	// Sort the playerGuid array by sortBy
	window.plugin.scoreboard.playerGuids.sort(function(a, b) {
		var players = window.plugin.scoreboard.scores.player,
			playerA = players[a],
			playerB = players[b];
		//console.log(a,playerA,b,playerB);
		var retVal = 0;
		switch(sortBy[0]) {
		case 'names':
			retVal = a.toLowerCase() < b.toLowerCase() ? -1 : 1;
			break;
		case 'portals':
			switch(sortBy[1]) {
			case 'captured':
				retVal = playerB[sortBy[0]][sortBy[1]] - playerB[sortBy[0]][sortBy[1]];
				break;
			}
			break;
		}
		return retVal;
	});

	console.log('sort function complete');

	var sort = window.plugin.scoreboard.playerTableSort;
	var scoreHtml = '<table>'
		+ '<tr><th ' + sort('names', sortBy) + '>Player</th>'
		+ '<th colspan=2 style="text-align: center">Portals</th>'
		+ '<th colspan=2 style="text-align: center">Resonators</th>'
		+ '<th colspan=3 style="text-align: center">Links</th>'
		+ '<th colspan=3 style="text-align: center">Fields</th></tr>'
		+ '<tr><th></th>'
		+ '<th ' + sort(['portals','captured'], sortBy) + '>Captured</th><th ' + sort(['portals','neutralized'], sortBy) + '>Neutralized</th>'
		+ '<th ' + sort(['resonators','deployed'], sortBy) + '>Deployed</th><th ' + sort(['resonators','destroyed'], sortBy) + '>Destroyed</th>'
		+ '<th ' + sort(['links','created'], sortBy) + '>Created</th><th>Sum Distance</th><th>Max</th>'
		+ '<th ' + sort(['fields','created'], sortBy) + '>Created</th><th>Sum MU</th><th>Max</th></tr>';
	console.log('guids =', window.plugin.scoreboard.playerGuids);
	$.each(window.plugin.scoreboard.playerGuids, function(index, guid) {
		scoreHtml += window.plugin.scoreboard.playerTableRow(guid);
	});
	scoreHtml += '</table>';

	return scoreHtml;
}

//A little helper function so the above isn't so messy
window.plugin.scoreboard.playerTableSort = function(name, by) {
	var retVal = 'data-sort="' + name + '"';
	if(name === by) {
		retVal += ' class="sorted"';
	}
	return retVal;
};

window.plugin.scoreboard.display = function(data) {
	var somethingInView = window.plugin.scoreboard.compileStats();
	var scoreHtml = '';
	var title = '';
	// console.log(somethingInView);
	if(somethingInView) {
		scoreHtml += '<table>'
			+ '<tr><th></th><th class="number">Resistance</th><th class="number">Enlightened</th><th class="number">Total</th></tr>'
			+ window.plugin.scoreboard.teamTableRow(['fields','count'],'Fields')
			+ window.plugin.scoreboard.teamTableRow(['fields','area','total'],'Total controlled area (km&sup2;)')
			+ window.plugin.scoreboard.teamTableRow(['fields','area','max'],'Largest field (km&sup2;)')
			+ window.plugin.scoreboard.teamTableRow(['links','count'],'Links')
			+ window.plugin.scoreboard.teamTableRow(['links','distance','total'],'Total link distance (km)')
			+ window.plugin.scoreboard.teamTableRow(['links','distance','max'],'Longest link (km)')
			+ window.plugin.scoreboard.teamTableRow(['portals','count'],'Portals')
			+ window.plugin.scoreboard.teamTableRow(['resonators','count'],'Resonators')
			+ '</table>'
			+ '<div id="players">'
			+ window.plugin.scoreboard.playerTable(['portals','captured'])
			+ '</div>';

		scoreHtml += '<div class="disclaimer">Click on player table headers to sort by that column. '
			+ 'Score is subject to portals available based on zoom level. '
			+ 'If names are unresolved try again. For best results wait until updates are fully loaded.</div>';
	} else {
		scoreHtml += 'You need something in view.';
		title = 'nothing in view';
	}

	dialog({
		html: '<div id="scoreboard">' + scoreHtml + '</div>',
		title: 'Scoreboard: ' + title,
		dialogClass: 'ui-dialog-scoreboard',
		id: 'scoreboard'
	});
}

/** get distance between portals */
window.plugin.scoreboard.distance = function(portalA, portalB) {
	portalA = new L.LatLng(portalA.latE6 / 1E6, portalA.lngE6 / 1E6);
	portalB = new L.LatLng(portalB.latE6 / 1E6, portalB.lngE6 / 1E6);
	return (portalA.distanceTo(portalB));
}

window.plugin.scoreboard.fieldArea = function(field) {
	var points = field.options.data.points;
	var sideA = window.plugin.scoreboard.distance(points[0],points[1]) / 1000;
	var sideB = window.plugin.scoreboard.distance(points[1],points[2]) / 1000;
	var sideC = window.plugin.scoreboard.distance(points[2],points[0]) / 1000;
	// Heron's Formula;
	var perimeter = sideA + sideB + sideC;
	var s = perimeter/2;
	return Math.sqrt(s*(s-sideA)*(s-sideB)*(s-sideC));
}

window.plugin.scoreboard.handleData = function(data) {
	// console.log(data);
	var players = window.plugin.scoreboard.scores.player;
	$.each(data.raw.result, function(ind, result) {
		// find player and portal information
		console.log(result);
		// console.log('guids = ' + window.plugin.scoreboard.playerGuids);
		// console.log(result[2].plext.text,result);
		var name, level, type, action, mu, portals = [];
		$.each(result[2].plext.markup, function(ind, markup) {
			// get event info
			switch(markup[0]) {
			case 'PLAYER':
				name = markup[1].plain;
				var team = markup[1].team;
				// console.log('player: ' + markup[1].plain);
				if (!(name in players)) { window.plugin.scoreboard.initPlayer(name, team); }
				break;
			case 'TEXT':
				switch(markup[1].plain) {
				case ' deployed an ':
					// deployed a reso
					type = 'resonators';
					action = 'deployed';
					break;
				case ' destroyed an ':
					type = 'resonators';
					action = 'destroyed';
					break;
				case ' neutralized by ':
					type = 'portals';
					action = 'neutralized';
					break;
				case ' linked ':
					type = 'links';
					action = 'created';
					break;
				case ' created a Control Field @':
					type = 'fields';
					action = 'created';
					break;
				case ' captured ':
					type = 'portals';
					action = 'captured';
					break;
				default:
					var patt = /^L([0-9])$/;
					var found = markup[1].plain.match(patt);
					if (found) { level = found[1]-1; }
					else {
						patt = /^([0-9])+$/;
						found = markup[1].plain.match(patt);
						if (found) { mu = parseInt(markup[1].plain); }
					}
					break;
				}
				break;
			case 'PORTAL':
				portals.push(markup[1]);
				break;
			}
		});
		console.log(name,type,action,level+1,portals,mu);
		switch(type) {
		case 'resonators':
			// increment the resonators of this level deployed/destroyed
			players[name][type][action][level]++;
			break;
		case 'portals':
			var portalGuid = portals[0].guid;
			// increment count of times portal captured/destroyed
			if (portalGuid in players[name][type][action]) players[name][type][action][portalGuid]++;
			else players[name][type][action][portalGuid] = 1;
			break;
		case 'fields':
			// TODO: get area of field
			// add field to player
			players[name][type][action].push({'mu':mu});
			break;
		case 'links':
			// get link distance from the two portals in chat
			var o = {'latE6': portals[0].latE6, 'lngE6': portals[0].lngE6},
				d = {'latE6': portals[1].latE6, 'lngE6': portals[1].lngE6},
				distance = window.plugin.scoreboard.distance(o,d) / 1000;
			// add link to player
			players[name][type][action].push({'distance':distance});
			break;
		}
		console.log('players:',players);
	});
}

var setup = function() {
	addHook('publicChatDataAvailable', window.plugin.scoreboard.handleData);
	$('#toolbox').append(' <a onclick="window.plugin.scoreboard.display()" title="Display a scoreboard per team for the current view">Scoreboard</a>');
	$('head').append('<style>' +
			'.ui-dialog-scoreboard {width: auto !important; min-width: 400px !important;}' +
			'#scoreboard table {margin-top:10px;	border-collapse: collapse; empty-cells: show; width:100%; clear: both;}' +
			'#scoreboard table td, #scoreboard table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
			'#scoreboard table tr.res td { background-color: #005684; }' +
			'#scoreboard table tr.enl td { background-color: #017f01; }' +
			'#scoreboard table tr:nth-child(even) td { opacity: .8 }' +
			'#scoreboard table tr:nth-child(odd) td { color: #ddd !important; }' +
			'#scoreboard table th { text-align:left }' +
			'#scoreboard table td.number, #scoreboard table th.number { text-align:right }' +
			'#players table th { cursor:pointer; text-align: right;}' +
			'#players table th:nth-child(1) { text-align: left;}' +
			'#scoreboard table th.sorted { color:#FFCE00; }' +
			'#scoreboard .disclaimer { margin-top:10px; font-size:10px; }' +
			'.mu_score { margin-bottom: 10px; }' +
			'.mu_score span { overflow: hidden; padding-top:2px; padding-bottom: 2px; display: block; font-weight: bold; float: left; box-sizing: border-box; -moz-box-sizing:border-box; -webkit-box-sizing:border-box; }' +
			'.mu_score span.res { background-color: #005684; text-align: right; padding-right:4px; }' +
			'.mu_score span.enl { background-color: #017f01; padding-left: 4px; }' +
	'</style>');
	// Setup sorting
	$(document).on('click', '#players table th', function() {
		$('#players').html(window.plugin.scoreboard.playerTable($(this).data('sort')));
	});
}

//PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
