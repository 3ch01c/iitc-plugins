// ==UserScript==
// @id             iitc-plugin-superdata@anonymous_in_sf
// @name           IITC plugin: Load a lot more portals/links
// @category       Info
// @version        0.0.1.20170312
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      http://distomatic.s3-website-us-east-1.amazonaws.com/iitc/plugins/map-superdata.meta.js
// @downloadURL    http://distomatic.s3-website-us-east-1.amazonaws.com/iitc/plugins/map-superdata.user.js
// @description    [3ch01c-2017-03-12] Load a lot more portals
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
plugin_info.buildName = 'distomatic';
plugin_info.dateTimeVersion = '20170312';
plugin_info.pluginId = 'map-superdata';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.superData = function() {};

var ZOOM_DEFAULT = 0;
var ZOOM_ALL_LINKS = 1;
var ZOOM_ALL_PORTALS = 2;
var ZOOM_MAX_MODE = ZOOM_ALL_PORTALS;
var mode_text = [ "default", "all links", "all portals" ];
var standard_zoom, previous_zoom = 0;

window.plugin.superData.mode = ZOOM_DEFAULT;

// XXX we need to re-think this.
// What if someone called us when MapZoom was somewhere around 3? That would be *insane*
// We need to limit the maximum number of boost steps.
// if <9 refuse all links
// if <13 or 14, refuse all portals

window.plugin.superData.getDataZoomForMapZoom = function(zoom) {
    var mode;
    var map_zoom = zoom;
    if (zoom < previous_zoom){
        // switch back to default view when zooming out
        mode = ZOOM_DEFAULT;
        previous_zoom = zoom;
        window.plugin.superData.setmode(mode);
    }
    else {
        mode = window.plugin.superData.mode;
        previous_zoom = zoom;
    }

    if (mode === ZOOM_DEFAULT)
	return standard_zoom(zoom);

    // only boost up a few levels (this should be a percentage,
    // not a fixed number, 4 may be too large)
    while (zoom < 21 && (zoom - map_zoom < 5)) {
	var params = window.getMapZoomTileParameters(zoom);

	if ((mode === ZOOM_ALL_LINKS && params.minLinkLength === 0) ||
	    (mode === ZOOM_ALL_PORTALS && params.hasPortals))
	    break;

	zoom = zoom + 1;
    }
    return zoom;
};

window.plugin.superData.setmode = function(mode) {
    var old_zoom = window.getDataZoomForMapZoom(map.getZoom());

    window.plugin.superData.mode = mode;
    $('#superdata-status').html(mode_text[mode]);

    if (old_zoom < window.getDataZoomForMapZoom(map.getZoom())) {
	window.mapDataRequest.start();
    }
};

window.plugin.superData.toggle = function() {
    var new_mode = (window.plugin.superData.mode + 1) % (ZOOM_MAX_MODE+1);
    window.plugin.superData.setmode(new_mode);
};

window.plugin.superData.setup = function() {
    $('#updatestatus').prepend('<div id="superdata" style="padding-bottom: 8px;"><strong>Get More Info:</strong> <span id="superdata-status"></span></div>');
    $('#superdata').click(window.plugin.superData.toggle);

    standard_zoom = window.getDataZoomForMapZoom;
    window.getDataZoomForMapZoom = window.plugin.superData.getDataZoomForMapZoom;
    window.plugin.superData.setmode(ZOOM_DEFAULT);
};

var setup = window.plugin.superData.setup;

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
