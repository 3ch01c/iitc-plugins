// ==UserScript==
// @id             iitc-plugin-blueprint-portal-export@worros
// @name           IITC plugin: show list of portals for copy/paste into Blueprint
// @category       Info
// @version        0.1.0.20170103
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/3ch01c/iitc-plugins/raw/master/blueprint-portal-export.user.js
// @downloadURL    https://github.com/3ch01c/iitc-plugins/raw/master/blueprint-portal-export.user.js
// @description    [3ch01c-2017-01-03] Display a sortable list of all visible portals with details compatible with Blueprint format
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'local';
plugin_info.dateTimeVersion = '20140903.194809';
plugin_info.pluginId = 'blueprint-portal-export';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////

  /* whatsnew
   * 0.1.0 : initial release
   */

// use own namespace for plugin
window.plugin.blueprintlist = function() {};

window.plugin.blueprintlist.listPortals = [];
window.plugin.blueprintlist.sortBy = 'name';
window.plugin.blueprintlist.sortOrder = -1;
window.plugin.blueprintlist.enlP = 0;
window.plugin.blueprintlist.resP = 0;
window.plugin.blueprintlist.filter = 0;

//fill the listPortals array with portals avaliable on the map (level filtered portals will not appear in the table)
window.plugin.blueprintlist.getPortals = function() {
  //filter : 0 = All, 1 = Res, 2 = Enl
  var retval=false;

  var displayBounds = map.getBounds();

  window.plugin.blueprintlist.listPortals = [];
  $.each(window.portals, function(i, portal) {
    // eliminate offscreen portals (selected, and in padding)
    if(!displayBounds.contains(portal.getLatLng())) return true;

    retval=true;
    var d = portal.options.data;
    var teamN = portal.options.team;
    //console.log(d);
    //console.log(window.portalDetail(i));

    switch (teamN) {
      case TEAM_RES:
        window.plugin.blueprintlist.resP++;
        break;
      case TEAM_ENL:
        window.plugin.blueprintlist.enlP++;
        break;
    }
    var l = window.getPortalLinks(i);
    //console.log(l);
    var f = window.getPortalFields(i);
    //console.log(window.fields[f]);
    //f.data.points[0]['guid'] for portal guid
    var ap = portalApGainMaths(d.resCount, l.in.length+l.out.length, f.length);

    var thisPortal = {
      'portal': portal,
      'guid': i,
      'teamN': teamN, // TEAM_NONE, TEAM_RES or TEAM_ENL
      'team': d.team, // "NEUTRAL", "RESISTANCE" or "ENLIGHTENED"
      'name': d.title || '(untitled)',
      'nameLower': d.title && d.title.toLowerCase(),
      'level': portal.options.level,
      'health': d.health,
      'resCount': d.resCount,
      'img': d.img,
      'linkCount': l.in.length + l.out.length,
      'link' : l,
      'fieldCount': f.length,
      'field' : f,
      'enemyAp': ap.enemyAp,
      'ap': ap,
      'lat': portal._latlng.lat,
      'lon': portal._latlng.lng
      //country?
      //location?
    };
    window.plugin.blueprintlist.listPortals.push(thisPortal);
  });

  return retval;
}

window.plugin.blueprintlist.displayPL = function() {
  var html = '';
  window.plugin.blueprintlist.sortBy = 'name';
  window.plugin.blueprintlist.sortOrder = -1;
  window.plugin.blueprintlist.enlP = 0;
  window.plugin.blueprintlist.resP = 0;
  window.plugin.blueprintlist.filter = 0;

  if (window.plugin.blueprintlist.getPortals()) {
    html += window.plugin.blueprintlist.portalTable(window.plugin.blueprintlist.sortBy, window.plugin.blueprintlist.sortOrder,window.plugin.blueprintlist.filter);
  } else {
    html = '<table class="noPortals"><tr><td>Nothing to show!</td></tr></table>';
  };

  if(window.useAndroidPanes()) {
    $('<div id="blueprintlist" class="mobile">' + html + '</div>').appendTo(document.body);
  } else {
    dialog({
      html: '<div id="blueprintlist">' + html + '</div>',
      dialogClass: 'ui-dialog-blueprintlist',
      title: 'Portal list: ' + window.plugin.blueprintlist.listPortals.length + ' ' + (window.plugin.blueprintlist.listPortals.length == 1 ? 'portal' : 'portals'),
      id: 'portal-list',
      width: 900
    });
  }
}

window.plugin.blueprintlist.portalTable = function(sortBy, sortOrder, filter) {
  // save the sortBy/sortOrder/filter
  window.plugin.blueprintlist.sortBy = sortBy;
  window.plugin.blueprintlist.sortOrder = sortOrder;
  window.plugin.blueprintlist.filter = filter;

  var portals=window.plugin.blueprintlist.listPortals;

  //Array sort
  window.plugin.blueprintlist.listPortals.sort(function(a, b) {
    var retVal = 0;

    var aComp = a[sortBy];
    var bComp = b[sortBy];

    if (aComp < bComp) {
      retVal = -1;
    } else if (aComp > bComp) {
      retVal = 1;
    } else {
      // equal - compare GUIDs to ensure consistent (but arbitrary) order
      retVal = a.guid < b.guid ? -1 : 1;
    }

    // sortOrder is 1 (normal) or -1 (reversed)
    retVal = retVal * sortOrder;
    return retVal;
  });

  var sortAttr = window.plugin.blueprintlist.portalTableHeaderSortAttr;
  var html = window.plugin.blueprintlist.stats();
  html += '<table class="portals">'
    + '<tr class="header">'
    + '<th>Ref</th>'
    + '<th>Country</th>'
    + '<th>Suburb</th>'
    + '<th>Portal Name</th>'
    + '<th>Link URL</th>'
    + '<th>Lat</th>'
    + '<th>Lng</th>'
    + '</tr>\n';

  var rowNum = 1;

//Country Location  Portal Name link URL  Lat Lon ref MUSK
//From To Type

  $.each(portals, function(ind, portal) {
    var coord = portal.portal.getLatLng();
    var perma = 'https://www.ingress.com/intel?ll='+coord.lat+','+coord.lng+'&z=17&pll='+coord.lat+','+coord.lng;
    if (filter === TEAM_NONE || filter === portal.teamN) {

      html += '<tr class="' + (portal.teamN === window.TEAM_RES ? 'res' : (portal.teamN === window.TEAM_ENL ? 'enl' : 'neutral')) + '">'
        + '<td>' + portal.name + '</td>'
        + '<td>Australia</td>'
        + '<td>Location</td>'
        + '<td class="portalTitle" style="">' + portal.name + '</td>'
        + '<td>' + perma + '</td>'
        + '<td>' + coord.lat + '</td>'
        + '<td>' + coord.lng + '</td>'
        + '</tr>';

      rowNum++;
    }
  });
  html += '</table>';

  return html;
}

window.plugin.blueprintlist.stats = function(sortBy) {
  var html = '<table class="teamFilter"><tr>'
    + '<td class="filterAll" style="cursor:pointer"><a href=""></a>All Portals : (click to filter)</td><td class="filterAll">' + window.plugin.blueprintlist.listPortals.length + '</td>'
    + '<td class="filterRes" style="cursor:pointer" class="sorted">Resistance Portals : </td><td class="filterRes">' + window.plugin.blueprintlist.resP +' (' + Math.floor(window.plugin.blueprintlist.resP/window.plugin.blueprintlist.listPortals.length*100) + '%)</td>'
    + '<td class="filterEnl" style="cursor:pointer" class="sorted">Enlightened Portals : </td><td class="filterEnl">'+ window.plugin.blueprintlist.enlP +' (' + Math.floor(window.plugin.blueprintlist.enlP/window.plugin.blueprintlist.listPortals.length*100) + '%)</td>'
    + '</tr>'
    + '</table>';
  return html;
}

// A little helper function so the above isn't so messy
window.plugin.blueprintlist.portalTableHeaderSortAttr = function(name, by, defOrder, extraClass) {
  // data-sort attr: used by jquery .data('sort') below
  var retVal = 'data-sort="'+name+'" data-defaultorder="'+defOrder+'" class="'+(extraClass?extraClass+' ':'')+'sortable'+(name==by?' sorted':'')+'"';

  return retVal;
};

// portal link - single click: select portal
//               double click: zoom to and select portal
//               hover: show address
// code from getPortalLink function by xelio from iitc: AP List - https://raw.github.com/breunigs/ingress-intel-total-conversion/gh-pages/plugins/ap-list.user.js
window.plugin.blueprintlist.getPortalLink = function(portal,guid) {
  var coord = portal.portal.getLatLng();
  var latlng = [coord.lat, coord.lng].join();
  var jsSingleClick = 'window.renderPortalDetails(\''+guid+'\');return false';
  var jsDoubleClick = 'window.zoomToAndShowPortal(\''+guid+'\', ['+latlng+']);return false';
  var perma = '/intel?ll='+coord.lat+','+coord.lng+'&z=17&pll='+coord.lat+','+coord.lng;

  //Use Jquery to create the link, which escape characters in TITLE and ADDRESS of portal
  var a = $('<a>',{
    text: portal.name,
    title: portal.name,
    href: perma,
    onClick: jsSingleClick,
    onDblClick: jsDoubleClick
  })[0].outerHTML;

  return a;
}

window.plugin.blueprintlist.onPaneChanged = function(pane) {
  if(pane == "plugin-blueprintlist")
    window.plugin.blueprintlist.displayPL();
  else
    $("#blueprintlist").remove()
};

var setup =  function() {
  if(window.useAndroidPanes()) {
    android.addPane("plugin-blueprintlist", "Blueprint Export", "ic_action_paste");
    addHook("paneChanged", window.plugin.blueprintlist.onPaneChanged);
  } else {
    $('#toolbox').append(' <a onclick="window.plugin.blueprintlist.displayPL()" title="Display a list of portals in the current view">Blueprint Export</a>');
  }

  $('head').append('<style>' +
    '#blueprintlist.mobile {background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; }' +
    '#blueprintlist table { margin-top:5px; border-collapse: collapse; empty-cells: show; width: 100%; clear: both; }' +
    '#blueprintlist table td, #blueprintlist table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
    '#blueprintlist table tr.res td { background-color: #005684; }' +
    '#blueprintlist table tr.enl td { background-color: #017f01; }' +
    '#blueprintlist table tr.neutral td { background-color: #000000; }' +
    '#blueprintlist table th { text-align: center; }' +
    '#blueprintlist table td { text-align: center; }' +
    '#blueprintlist table.portals td { white-space: nowrap; }' +
    '#blueprintlist table td.portalTitle { text-align: left;}' +
    '#blueprintlist table th.sortable { cursor:pointer;}' +
    '#blueprintlist table th.portalTitle { text-align: left;}' +
    '#blueprintlist table .portalTitle { min-width: 120px !important; max-width: 240px !important; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }' +
    '#blueprintlist table .apGain { text-align: right !important; }' +
    '#blueprintlist .sorted { color:#FFCE00; }' +
    '#blueprintlist .filterAll { margin-top: 10px;}' +
    '#blueprintlist .filterRes { margin-top: 10px; background-color: #005684  }' +
    '#blueprintlist .filterEnl { margin-top: 10px; background-color: #017f01  }' +
    '</style>');

  // Setup sorting
  $(document).on('click.blueprintlist', '#blueprintlist table th.sortable', function() {
    var sortBy = $(this).data('sort');
    // if this is the currently selected column, toggle the sort order - otherwise use the columns default sort order
    var sortOrder = sortBy == window.plugin.blueprintlist.sortBy ? window.plugin.blueprintlist.sortOrder*-1 : parseInt($(this).data('defaultorder'));
    $('#blueprintlist').html(window.plugin.blueprintlist.portalTable(sortBy,sortOrder,window.plugin.blueprintlist.filter));
  });

  $(document).on('click.blueprintlist', '#blueprintlist .filterAll', function() {
    $('#blueprintlist').html(window.plugin.blueprintlist.portalTable(window.plugin.blueprintlist.sortBy,window.plugin.blueprintlist.sortOrder,0));
  });
  $(document).on('click.blueprintlist', '#blueprintlist .filterRes', function() {
    $('#blueprintlist').html(window.plugin.blueprintlist.portalTable(window.plugin.blueprintlist.sortBy,window.plugin.blueprintlist.sortOrder,1));
  });
  $(document).on('click.blueprintlist', '#blueprintlist .filterEnl', function() {
    $('#blueprintlist').html(window.plugin.blueprintlist.portalTable(window.plugin.blueprintlist.sortBy,window.plugin.blueprintlist.sortOrder,2));
  });
}

// PLUGIN END //////////////////////////////////////////////////////////


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
