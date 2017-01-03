// ==UserScript==
// @id             iitc-plugin-less-clutter@qnstie
// @name           IITC plugin: less clutter in the display
// @category       Tweaks
// @version        0.1.0.20170103
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      http://iitcm.code-noobs.org/less-clutter.meta.js
// @downloadURL    http://iitcm.code-noobs.org/less-clutter.user.js
// @description    [3ch01c-2017-01-03] render markers as small circles with thin bezels, regardless of their level. Best to use with "Portal Levels" plugin.
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

// PLUGIN START ////////////////////////////////////////////////////////


window.plugin.lessClutter = function() {};

window.plugin.lessClutter.setup = function() {
  window.addHook('iitcLoaded', function() {
	window.getMarkerStyleOptions = function(details) {
	  var options = {
		radius: 6,
		stroke: true,
		color: COLORS[details.team],
		weight: 1,
		opacity: 1,
		fill: true,
		fillColor: COLORS[details.team],
		fillOpacity: 1,
		dashArray: null
	  };

	  return options;
	}
  });
};

var setup = window.plugin.lessClutter.setup;

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
