// ==UserScript==
// @id             iitc-plugin-highlight-portals-high-level
// @name           IITC plugin: highlight high level portals
// @category       Highlighter
// @version        0.1.0.20170103
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/3ch01c/iitc-plugins/raw/master/portal-highlighter-high-level.user.js
// @downloadURL    https://github.com/3ch01c/iitc-plugins/raw/master/portal-highlighter-high-level.user.js
// @description    [3ch01c-2017-01-03] Use the portal fill color to denote high level portals: Purple L8, Red L7, Orange L6
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
plugin_info.buildName = 'jonatkins-test';
plugin_info.dateTimeVersion = '20151218.013700';
plugin_info.pluginId = 'portal-highlighter-high-level';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.portalHighlighterPortalsHighLevel = function() {};

window.plugin.portalHighlighterPortalsHighLevel.colorLevel = function(data) {
  var portal_level = data.portal.options.data.level;
  var opacity = 0.7;
  var color = undefined;

  if (portal_level >= 8) color='magenta';
  else if (portal_level >= 7) color='red';
  else if (portal_level >= 6) color='orange';

  if (color) {
    data.portal.setStyle({fillColor: color, fillOpacity: opacity});
  }
}

var setup =  function() {
  window.addPortalHighlighter('Higher Level Portals', window.plugin.portalHighlighterPortalsHighLevel.colorLevel);
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
