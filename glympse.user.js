// ==UserScript==
// @id             iitc-plugin-glympse
// @name           IITC plugin: Resistance Glympse Layer
// @category       Layer
// @version        0.1.0.20170103
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://github.com/3ch01c/iitc-plugins/raw/master/glympse.user.js
// @downloadURL    https://github.com/3ch01c/iitc-plugins/raw/master/glympse.user.js
// @description    [3ch01c-2017-01-03] Glympse Layer for IITC - View Glympse users on IITC map
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
	if (typeof window.plugin !== 'function') window.plugin = function () {
	};
	// PLUGIN AUTHORS: writing a plugin outside of the IITC build environment?
	// if so, delete these lines!!
	// (leaving them in place might break the 'About IITC' page or break update
	// checks)
	plugin_info.buildName = 'iitc-plugin-glympse';
	plugin_info.dateTimeVersion = '20140226.3202';
	plugin_info.pluginId = 'glympse-viewer';
	// END PLUGIN AUTHORS NOTE
	// PLUGIN START ////////////////////////////////////////////////////////
	/*
	 * whatsnew
	 *
	 */

	window.plugin.glympseViewer = function () {
	};

	window.plugin.glympseViewer.accessToken = '';
	window.plugin.glympseViewer.settings = {};

	window.plugin.glympseViewer.group = {};
	window.plugin.glympseViewer.members = [];

	window.plugin.glympseViewer.formatTime = function(timeInSeconds) {
		delta = timeInSeconds;
		// calculate (and subtract) whole days
		var days = Math.floor(delta / 86400);
		delta -= days * 86400;

		// calculate (and subtract) whole hours
		var hours = Math.floor(delta / 3600) % 24;
		delta -= hours * 3600;

		// calculate (and subtract) whole minutes
		var minutes = Math.floor(delta / 60) % 60;
		delta -= minutes * 60;

		// what's left is seconds
		var seconds = delta % 60;  // in theory the modulus is not required

		timeString = ((days > 0) ? days + 'd ': '') + ((hours > 0) ? hours + 'h ': '') + ((minutes > 0) ? minutes + 'm ': '') + ((seconds > 0) ? seconds + 's': '');
		return timeString;
	}

	window.plugin.glympseViewer.updateMembers = function() {
		if (window.plugin.glympseViewer.heartbeatStatus == false) {
			return true;
		}
		$.each(window.plugin.glympseViewer.members, function(idx, memberObj) {
			var memberProperties = {}
			$.each(memberObj.properties, function(propIdx, propObj) {
				memberProperties[propObj.n] = propObj.v;
			});
			if (((typeof(memberProperties.completed) == 'undefined') || (memberProperties.completed == false)) && (memberProperties.end_time > Date.now()) ) {
				$.ajax({
					url: '//api.glympse.com/v2/invites/' + memberObj.id,
					data: {
					next: memberObj.next,
					oauth_token: window.plugin.glympseViewer.accessToken
				},
				success: function(response) {
					// //console.log(response);
					if (response.result == 'ok') {
						window.plugin.glympseViewer.members[idx].next = response.response.next;

						if (typeof(response.response.data) != 'undefined') {
							//console.info('Glympse User ' + memberProperties.name + ' for invite id: ' + memberObj.id + ' received data update');
							updateData = response.response.data;
							$.each(updateData, function(updateIdx, updateObj) {
								var dataUpdated = false;
								$.each(memberObj.properties, function(updatePropIdx, updatePropObj) {
									if (updatePropObj.n == updateObj.n) {
										window.plugin.glympseViewer.members[idx].properties[updatePropIdx] = updateObj;
										dataUpdated = true;
									}
								});
								if (dataUpdated == false) {
									window.plugin.glympseViewer.members[idx].properties.push(updateObj);
								}
							});
							$.each(memberObj.properties, function(propIdx, propObj) {
								memberProperties[propObj.n] = propObj.v;
							});
						}

						if (typeof(response.response.location) != 'undefined') {
							window.plugin.glympseViewer.members[idx].lastLocationUpdate = response.response.last;
							window.plugin.glympseViewer.members[idx].location = response.response.location;
							lastUpdate = Math.round((Date.now()-response.response.location[0][0])/1000);
							memberObj = window.plugin.glympseViewer.members[idx];
							//console.info('Glympse User ' + memberProperties.name + ' for invite id: ' + memberObj.id + ' is currently at : ' + response.response.location[0][1] + ', ' + response.response.location[0][2] + ' - Last update: ' + window.plugin.glympseViewer.formatTime(lastUpdate) + ' ago');
							window.plugin.glympseViewer.drawMember(memberObj, memberProperties);
						} else {
							//window.plugin.glympseViewer.drawMember(memberObj, memberProperties);
							//console.info('Glympse User ' + memberProperties.name + ' for invite id: ' + memberObj.id + ' skipped for update');
							if (typeof(memberObj.marker) != 'undefined') {
								// If we haven't previously got a location update, attempt to get the previous update message to find a location if possible
								if (typeof(window.plugin.glympseViewer.members[idx].lastLocationUpdate) == 'undefined') {
									$.ajax({
											url: '//api.glympse.com/v2/invites/' + memberObj.id,
											data: {
											next: response.response.last,
											oauth_token: window.plugin.glympseViewer.accessToken
										},
										success: function(response) {
											window.plugin.glympseViewer.members[idx].lastLocationUpdate = response.response.last;
											if (typeof(response.response.location) != 'undefined') {
												window.plugin.glympseViewer.members[idx].location = response.response.location;
												memberObj = window.plugin.glympseViewer.members[idx];
											}
										}
									});
								}
								if (typeof(window.plugin.glympseViewer.members[idx].location) != 'undefined') {
									// Update the marker with known data
									window.plugin.glympseViewer.drawMember(memberObj, memberProperties);
								}
							} else {
								// Do nothing as there's no marker for this member
							}
						}
					} else if (response.result == 'failure') {
						//console.warn('Glympse: Invite ' + memberObj.id + ' deleted');
						window.plugin.glympseViewer.glympseUsersGroup.removeLayer(memberObj.marker);
						window.plugin.glympseViewer.members.splice(idx, 1);
					}
				}
			});
			} else {
				// //console.warn('Glympse User ' + memberProperties.name + ' has
					// expired!');
			}
		});
		window.plugin.glympseViewer.memberUpdateTimer = setTimeout(window.plugin.glympseViewer.updateMembers, 5000);
	}

	window.plugin.glympseViewer.deleteMember = function(member) {
		$.each(window.plugin.glympseViewer.members, function (memberIdx, memberObj) {
			// find matching owner for glympse if already exists
			// and delete from map
			 var memberProperties = {}
			 $.each(memberObj.properties, function(propIdx, propObj) {
				 memberProperties[propObj.n] = propObj.v;
			 });
			 if (memberProperties.owner == member) {
				 //console.info('Glympse: Deleting User ' + member);
				 window.plugin.glympseViewer.glympseUsersGroup.removeLayer(window.plugin.glympseViewer.members[memberIdx].marker);
				 window.plugin.glympseViewer.members.splice(memberIdx, 1);
			 }
		 });
	}

	window.plugin.glympseViewer.updateEvents = function() {
		glympseTarget = window.plugin.glympseViewer.viewTarget;
		if (glympseTarget.substring(0,1) == '!') {
			$.ajax({
				url: '//api.glympse.com/v2/groups/' + glympseTarget.substring(1, glympseTarget.length) + '/events',
				data: {
					next: ((window.plugin.glympseViewer.group.events > 0) ? (window.plugin.glympseViewer.group.events+1) : 0),
					oauth_token: window.plugin.glympseViewer.accessToken
				},
				success: function(response) {
					if (response.result == 'ok') {
						window.plugin.glympseViewer.group.events = response.response.events;
						if (response.response.type == 'events') {
							if (response.response.items.length > 0) {
								$.each(response.response.items, function (idx, eventObj) {
									switch (eventObj.type) {
										case 'leave': // Member Has Left Group
											//console.warn('Glympse: Invite Deletion requested for ' + eventObj.member);
											member = eventObj.member;
											invite_id = eventObj.invite;
											window.plugin.glympseViewer.deleteMember(member);
											break;
										case 'join': // Member Has Joined Group
														// (usually followed by an
														// invite, so do nothing)
											member = eventObj.member;
											window.plugin.glympseViewer.deleteMember(member);
											break;
										case 'invite': // Member Has been invited
														// to group
											member = eventObj.member;
											invite_id = eventObj.invite;

											// Delete any existing members
											window.plugin.glympseViewer.deleteMember(member);

											$.ajax({
												url: '//api.glympse.com/v2/invites/' + eventObj.invite,
												type: 'GET',
												data: {
													next: 0,
													oauth_token: window.plugin.glympseViewer.accessToken
												},
												crossDomain: true,
												success: function(invite_response) {
													if ((typeof(invite_response.result) != 'undefined') && (invite_response.result == 'ok')) {
														//console.info('Glympse: Invite Data Received for ' + invite_id);
														window.plugin.glympseViewer.addMember(invite_response.response);
													}
												}
											});
											break;
									}
								});
							}
						} else if (response.response.type == 'group') {
							//console.info('Glympse: Received Group Information');
							window.plugin.glympseViewer.group = response.response;
							//console.info('Glympse: Number of Users in '+ glympseTarget + ': ' + response.response.members.length);
							// Loop through all the group members and get their
							// current position and user details
							$.each(response.response.members, function (idx, member) {
								$.ajax({
									url: '//api.glympse.com/v2/invites/' + member.invite,
									type: 'GET',
									data: {
										next: 0,
										oauth_token: window.plugin.glympseViewer.accessToken
									},
									crossDomain: true,
									success: function(response) {
										if ((typeof(response.result) != 'undefined') && (response.result == 'ok')) {
											//console.info('Glympse: Invite Data Received for ' + member.invite);
											window.plugin.glympseViewer.addMember(response.response);
										}
									}
								});
							});
						}
					} else if (response.result == 'failure') {
						//console.warn('Glympse: Group either invalid or all members have left');
						window.plugin.glympseViewer.group.events = 0;

						$.each(window.plugin.glympseViewer.members, function (memberIdx, memberObj) {
							// find matching owner for glympse if already exists
							// and delete from map
							 var memberProperties = {}
							 $.each(memberObj.properties, function(propIdx, propObj) {
								 memberProperties[propObj.n] = propObj.v;
							 });
							 window.plugin.glympseViewer.glympseUsersGroup.removeLayer(window.plugin.glympseViewer.members[memberIdx].marker);
							 window.plugin.glympseViewer.members.splice(memberIdx, 1);
						 });
					}
					window.plugin.glympseViewer.eventUpdateTimer = setTimeout(window.plugin.glympseViewer.updateEvents, 15000);
				}
			});
		}
	}

	window.plugin.glympseViewer.setupLayer = function() {
		window.plugin.glympseViewer.glympseUsersGroup = new L.LayerGroup();
		window.addLayerGroup('Glympse', window.plugin.glympseViewer.glympseUsersGroup, false);
	}

	window.plugin.glympseViewer.startHeartBeat = function () {
		//console.info('Glympse Client: Starting Heartbeat');
		window.plugin.glympseViewer.heartbeatStatus = true;
		window.plugin.glympseViewer.memberUpdateTimer = setTimeout(window.plugin.glympseViewer.updateMembers, 5000);
		window.plugin.glympseViewer.eventUpdateTimer = setTimeout(window.plugin.glympseViewer.updateEvents, 15000);
		window.plugin.glympseViewer.status = 'Started';
		$('.glympse-status-input').val(window.plugin.glympseViewer.status);
	}

	window.plugin.glympseViewer.stopHeartBeat = function () {
		//console.info('Glympse Client: Heartbeat Stopped');
		window.plugin.glympseViewer.heartbeatStatus = false;
		clearTimeout(window.plugin.glympseViewer.memberUpdateTimer);
		clearTimeout(window.plugin.glympseViewer.eventUpdateTimer);
		window.plugin.glympseViewer.status = 'Stopped';
		$('.glympse-status-input').val(window.plugin.glympseViewer.status);
	}

	window.plugin.glympseViewer.addMember = function(memberData) {
		window.plugin.glympseViewer.members.push(memberData);
		memberProperties = {};
		if (typeof(memberData.location) != 'undefined') {
			$.each(memberData.properties, function(propIdx, propObj) {
				 memberProperties[propObj.n] = propObj.v;
			});
			//console.info('Glympse User ' + memberProperties.name + ' for invite id: ' + memberData.id + ' is currently at : ' + memberData.location[0][1] + ', ' + memberData.location[0][2]);
			window.plugin.glympseViewer.drawMember(memberData, memberProperties);
		}
	}

	window.plugin.glympseViewer.drawMember = function(memberObj, memberProperties) {
		var createMarker = true;
		var memberIdx;
		$.each(window.plugin.glympseViewer.members, function (idx, obj) {
			if (memberObj.id == obj.id) {
				if (typeof(obj.marker) == 'undefined') {
					createMarker = true;
					memberIdx = idx;
				} else {
					createMarker = false;
					marker = obj.marker;
				}
			}
		});
		latLng = new L.LatLng(memberObj.location[0][1]/1E6, memberObj.location[0][2]/1E6);

		if ( (typeof(memberProperties.completed) != 'undefined') || (memberProperties.end_time < Date.now() )) {
			glympseStatus = 'expired';
		} else {
			lastUpdateTime = Math.round((Date.now()-memberObj.location[0][0])/1000);
			if (lastUpdateTime < 120) {
				glympseStatus = 'fresh';
			} else if ((lastUpdateTime > 120) && (lastUpdateTime < 300)) {
				glympseStatus = 'stale';
			} else if (lastUpdateTime > 300) {
				glympseStatus = 'old';
			}
		}
		popupContent = '<div class="glympse-popup"><p>' + ( (typeof(memberProperties.avatar) != 'undefined') ? '<img src="' + memberProperties.avatar + '" class="glympse-avatar">' : '' ) + '</p>\
		<h2 title="Invite Id: ' + memberObj.id + '">' + memberProperties.name + '</h2>\
		' + (((typeof(memberProperties.message) != 'undefined') && (memberProperties.message != null)) ? '<div class="glympse-popup-row text-center"><em class="glympse-message">' + memberProperties.message + '</em></div>': '' ) + '\
		<div class="glympse-popup-row"><strong>Last Updated:</strong> <abbr title="' + new Date(memberObj.location[0][0]).toString() + '">' + (((memberProperties.end_time > Date.now()) && (typeof(memberProperties.completed) == 'undefined')) ? window.plugin.glympseViewer.formatTime(Math.round((Date.now()-memberObj.location[0][0])/1000)) + ' ago' : 'Expired') + '</abbr></div>\
		<div class="glympse-popup-row"><strong>Expires in:</strong> <abbr title="' + new Date(memberProperties.end_time).toString() + '">' + (((memberProperties.end_time > Date.now()) && (typeof(memberProperties.completed) == 'undefined')) ? window.plugin.glympseViewer.formatTime(Math.round((memberProperties.end_time-Date.now())/1000)) : 'Expired') + '</abbr></div>\
		' + (((typeof(memberProperties.destination) != 'undefined') && (memberProperties.destination != null)) ? '<div class="glympse-popup-row"><strong>Destination:</strong> <a href="javascript:void(0);" class="glympse-destination" data-target="' + memberProperties.destination.lat + ',' + memberProperties.destination.lng + '">' + memberProperties.destination.name + '</a></div>': '' ) + '\
		' + (((typeof(memberProperties.eta) != 'undefined') && (memberProperties.destination != null)) ? '<div class="glympse-popup-row"><strong title="Estimated Time of Arrival">ETA:</strong> ' + window.plugin.glympseViewer.formatTime(Math.round(memberProperties.eta.eta)/1000) + '</div>': '' ) + '\
		</div>';

		if (createMarker == false) {
			//console.info('Glympse: Moving marker for ' + memberProperties.name);
			marker.setLatLng(latLng);
			marker.getPopup().setContent(popupContent);

			if ($(marker._icon).hasClass('selected')) {
				glympseStatus += ' selected';
			}

			iconUpdate = L.divIcon({
							className: 'glympse-member ' + glympseStatus,
							iconAnchor: [16,18],
							iconSize: [32,37],
							popupAnchor: [0,-35],
							html: '<div class="glympse-member-name">' + memberProperties.name + '</div>'
						})
			marker.setIcon(iconUpdate);
		} else {
			//console.info('Glympse: Creating new marker for ' + memberProperties.name);
			var marker = L.marker(latLng, {
							icon: L.divIcon({
								className: 'glympse-member expired',
								iconAnchor: [16,18],
								iconSize: [32,37],
								popupAnchor: [0,-35],
								html: '<div class="glympse-member-name">' + memberProperties.name + '</div>'
							}),
							riseOnHover: true
						}).bindPopup(popupContent);
			window.plugin.glympseViewer.members[memberIdx].marker = marker;
			marker.on('popupopen', function() {
				$(this._icon).toggleClass('selected', true);
			});
			marker.on('popupclose', function() {
				$(this._icon).toggleClass('selected', false);
			});

			marker.addTo(window.plugin.glympseViewer.glympseUsersGroup);
		}

		marker.on('popupopen', function() {
			$('a.glympse-destination').on('click', function(e) {
				var destLatLng = $(this).attr('data-target').split(',');
				marker.closePopup();
				map.setView(new L.LatLng(destLatLng[0],destLatLng[1]), 18);
			});
		});
	}

	window.plugin.glympseViewer.getGlympse = function () {
		// Check if we're viewing a group
		glympseTarget = window.plugin.glympseViewer.viewTarget;
		if (glympseTarget.substring(0,1) == '!') {
			$.ajax({
				url: '//api.glympse.com/v2/groups/' + glympseTarget.substring(1, glympseTarget.length),
				type: 'GET',
				data: {
					branding: 'true',
					oauth_token: window.plugin.glympseViewer.accessToken
				 },
				crossDomain: true,
				success: function(response) {
					if ((typeof(response.result) != 'undefined') && (response.result == 'ok')) {

						//console.info('Glympse: Received Group Information');
						window.plugin.glympseViewer.group = response.response;
						//console.info('Glympse: Number of Users in '+ glympseTarget + ': ' + response.response.members.length);
						// Loop through all the group members and get their
						// current position and user details
						$.each(response.response.members, function (idx, member) {
							$.ajax({
								url: '//api.glympse.com/v2/invites/' + member.invite,
								type: 'GET',
								data: {
									next: 0,
									oauth_token: window.plugin.glympseViewer.accessToken
								},
								crossDomain: true,
								success: function(response) {
									if ((typeof(response.result) != 'undefined') && (response.result == 'ok')) {
										//console.info('Glympse: Invite Data Received for ' + member.invite);
										window.plugin.glympseViewer.addMember(response.response);
									}
								}
							});
						});
					} else {
						//console.warn('Glympse: Group Request Failed!');
						window.plugin.glympseViewer.group.events = 0;
					}
				}
			});
		} else {
			// Watching individual glympse
			 $.ajax({
				url: '//api.glympse.com/v2/invites/' + glympseTarget,
				type: 'GET',
				data: {
					next: 0,
					oauth_token: window.plugin.glympseViewer.accessToken
				},
				crossDomain: true,
				success: function(response) {
					if ((typeof(response.result) != 'undefined') && (response.result == 'ok')) {
						//console.info('Glympse: Invite Data Received for ' + glympseTarget);
						window.plugin.glympseViewer.addMember(response.response);
					}
				}
			 });
		}
	}

	window.plugin.glympseViewer.glympseDialog = function() {
		glympsePanel = $('<div>', {
				class: 'glympseOptions'
		});

		glympsePanel.append('<div class="glympseLogo"><img alt="" src="data:image/png;base64,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" /></div>');
		glympsePanel.append('<div class="info-text">Enter a Glympse to View</div>');

		glympseInputLabel = $('<label>', {
								id: 'glympseInputLabel',
								class: 'glympse-input-label',
								for: 'glympseId',
								text: 'Glympse Name:'
								});

		glympseIdInput = $('<input>', {
								id: 'glympseId',
								class: 'glympse-input',
								type: 'text',
								value: window.plugin.glympseViewer.settings.glympseName
						});

		glympsePanel.append(glympseInputLabel,glympseIdInput);

		glympsePanel.append('<div class="glympse-status"><label>Glympse Status:</label> <input type="text" readonly="readonly" class="glympse-status-input"> <input type="button" class="stopHeartbeat" value="Stop Glympse"></div>');

		if (window.useAndroidPanes()) {
			// Need a save button for the mobile version
			viewGlympseButtonObj = $('<input type="button" id="viewGlympseBtn" class="viewGlympseBtn" value="View Glympse">');
			viewGlympseButtonObj.on('click', function() {
				// Perform actions on Glympse Save
				window.plugin.glympseViewer.settings.glympseName = glympseIdInput.val();
				localStorage.setItem('plugin-glympseViewer', JSON.stringify(window.plugin.glympseViewer.settings));
				window.plugin.glympseViewer.newGlympse(glympseIdInput.val());
				window.show('map');
			});

			glympsePanel.append($('<div class="viewGlympseBtnContainer"></div>').append(viewGlympseButtonObj));
			glympseDialog = $('<div id="glympseDialog" class="mobile"></div>').append(glympsePanel).appendTo(document.body);

			$('.glympse-status-input').val(window.plugin.glympseViewer.status);
			$('.stopHeartbeat').on('click', function() {
				glympseIdInput.val('');
				window.plugin.glympseViewer.settings.glympseName = '';
				localStorage.setItem('plugin-glympseViewer', JSON.stringify(window.plugin.glympseViewer.settings));
				window.plugin.glympseViewer.newGlympse(glympseIdInput.val());
			});
		} else {
			dialog({
				html: glympsePanel,
				title: 'Glympse Settings',
				dialogClass: 'ui-dialog-glympse',
				id: 'glympseDialog',
				focusCallback: function() {
					$('.glympse-status-input').val(window.plugin.glympseViewer.status);
					$('.stopHeartbeat').on('click', function() {
						glympseIdInput.val('');
						window.plugin.glympseViewer.settings.glympseName = '';
						localStorage.setItem('plugin-glympseViewer', JSON.stringify(window.plugin.glympseViewer.settings));
						window.plugin.glympseViewer.newGlympse(glympseIdInput.val());
					});
				},
				closeCallback: function() {
					// //console.info('Saving new agent uid: ' +
					// agentUIDInput.val());

					window.plugin.glympseViewer.settings.glympseName = glympseIdInput.val();

					localStorage.setItem('plugin-glympseViewer', JSON.stringify(window.plugin.glympseViewer.settings));
					// Perform actions on Glympse Save
					window.plugin.glympseViewer.newGlympse(glympseIdInput.val());
				}
			});
		}
	}

	window.plugin.glympseViewer.onPaneChanged = function(pane) {
		if(pane == "plugin-glympse") {
			$("#glympseMemberListDialog").remove();
			window.plugin.glympseViewer.glympseDialog();
		} else {
			$("#glympseDialog").remove();
			$("#glympseMemberListDialog").remove();
		}
	}

	window.plugin.glympseViewer.newGlympse = function(glympseName) {
		window.plugin.glympseViewer.viewTarget = glympseName;
		window.plugin.glympseViewer.group = {};
		window.plugin.glympseViewer.members = [];
		window.plugin.glympseViewer.glympseUsersGroup.clearLayers();


		if (window.plugin.glympseViewer.heartbeatStatus == true) {
			window.plugin.glympseViewer.stopHeartBeat();
		}
		if (glympseName != '') {
			window.plugin.glympseViewer.getGlympse();
			window.plugin.glympseViewer.startHeartBeat();
		}
	}

	window.plugin.glympseViewer.openMembersDialog = function() {
		if (window.useAndroidPanes()) {
			glympseDialog = $('<div id="glympseMemberListDialog" class="mobile"><div class="glympse-members-list"></div></div>');
			glympseDialog.appendTo(document.body);
			closeMembersDialogButtonObj = $('<div class="closeBtnContainer"><input type="button" id="closeGlympseMembersBtn" class="closeGlympseMembersBtn" value="Close"></div>');
			glympseDialog.append(closeMembersDialogButtonObj);
			closeMembersDialogButtonObj.on('click', function() {
				$("#glympseMemberListDialog").remove();
			});
			window.plugin.glympseViewer.updateMembersList();
			window.plugin.glympseViewer.memberUpdateInterval = setInterval(window.plugin.glympseViewer.updateMembersList, 2000);
		} else {
			blah = dialog({
				html: '<div class="glympse-members-list"></div>',
				title: 'Glympse: Members of ' + window.plugin.glympseViewer.viewTarget,
				dialogClass: 'ui-dialog-glympseMembers',
				id: 'glympseMembersDialog',
				width: 500,
				closeCallback: function() {
					clearInterval(window.plugin.glympseViewer.memberUpdateInterval);
				}
			});
			window.plugin.glympseViewer.updateMembersList();
			window.plugin.glympseViewer.memberUpdateInterval = setInterval(window.plugin.glympseViewer.updateMembersList, 2000);
		}
	}

	window.plugin.glympseViewer.updateMembersList = function(viewMembersPopup) {
		memberViewContent = '<div class="header-row"><div class="col-title">Member Name</div><div class="col-title text-center">Expires in</div><div class="col-title text-right">Last Updated</div></div>';
		$.each(window.plugin.glympseViewer.members, function(idx, memberObj) {
			var memberProperties = {}
			$.each(memberObj.properties, function(propIdx, propObj) {
				memberProperties[propObj.n] = propObj.v;
			});

			if ( (typeof(memberProperties.completed) != 'undefined') || (memberProperties.end_time < Date.now() )) {
				lastUpdate = 'Expired';
			} else {
				lastUpdate = window.plugin.glympseViewer.formatTime(Math.round((Date.now()-memberObj.location[0][0])/1000));
			}

			timeToExpiry = (memberProperties.end_time > Date.now()) ? window.plugin.glympseViewer.formatTime(Math.round((memberProperties.end_time-Date.now())/1000)) : 'Expired';

			memberViewContent += '<div class="row">\
								<div class="glympse-view-member-name"><a href="javascript:void(0)" data-target="' + memberObj.id + '">' + memberProperties.name + '</a></div>\
								<div class="glympse-expiry-time">' + timeToExpiry + '</div>\
								<div class="glympse-last-updated">' + lastUpdate + '</div>\
								</div>';
		});
		$('.glympse-members-list').empty().append(memberViewContent);

		$('.glympse-view-member-name a').on('click', function () {
			inviteId = $(this).attr('data-target');
			$.each(window.plugin.glympseViewer.members, function(idx, memberObj) {
				if (memberObj.id == inviteId) {
					if (window.useAndroidPanes()) {
						clearInterval(window.plugin.glympseViewer.memberUpdateInterval);
						$("#glympseMemberListDialog").remove();
					} else {
						$('#dialog-glympseMembersDialog').dialog('close');
					}
					map.setView(memberObj.marker.getLatLng(), 18);
					memberObj.marker.openPopup();
				}
			});
		});
	}

	window.plugin.glympseViewer.addControlButton = function() {
		window.plugin.glympseViewer.viewMembersBtn = L.Control.extend({
			options:{
				position: 'topleft'
			},
			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-glympse-viewer');
				$(container).append('<div class="leaflet-bar"><a href="javascript: void(0);" class="viewer-button"></a></div>');
				$(container).on('click', function() {
					window.plugin.glympseViewer.openMembersDialog();
				})
				return container;
			}
		});
		map.addControl(new window.plugin.glympseViewer.viewMembersBtn);
	}

	window.plugin.glympseViewer.init = function () {
		window.plugin.glympseViewer.status = 'Initializing';
		if (window.useAndroidPanes()) {
			android.addPane('plugin-glympse', 'Glympse', 'ic_action_paste');
			addHook('paneChanged', window.plugin.glympseViewer.onPaneChanged);
		} else {
			$('#toolbox') .append(' <a onclick="window.plugin.glympseViewer.glympseDialog()" title="Glympse Settings">Glympse</a>');
		}

		if (typeof(localStorage['plugin-glympseViewer']) != 'undefined') {
			window.plugin.glympseViewer.settings = JSON.parse(localStorage['plugin-glympseViewer']);
		}

		window.plugin.glympseViewer.setupLayer();

		// Authenticate with glympse and get auth Access Token
		$.ajax({
			url: '//api.glympse.com/v2/account/login',
			type: 'GET',
			data: {
				username: 'viewer',
				password: 'password',
				api_key: 'nXQ44D38OdVzEC34'
			},
			crossDomain: true,
			success: function(result) {
				if ((typeof(result.response) != 'undefined') && (typeof(result.response.access_token) != 'undefined')) {
					//console.info('Glympse: Login Successful!');
					window.plugin.glympseViewer.accessToken = result.response.access_token

					if ((typeof(window.plugin.glympseViewer.settings.glympseName) != 'undefined') && (window.plugin.glympseViewer.settings.glympseName != '')) {
						window.plugin.glympseViewer.newGlympse(window.plugin.glympseViewer.settings.glympseName);
					} else {
						window.plugin.glympseViewer.status = 'Stopped';
					}
				} else {
					//console.warn('Glympse: Login Failed!');
				}
			}
		});

		window.plugin.glympseViewer.addControlButton();

		cssData = ".glympse-member { \
				background-repeat: no-repeat;\
				background-size: 32px 37px;\
				background-position: 50% 0;\
			}\
			.glympse-member.fresh {\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAlCAYAAAAjt+tHAAACyElEQVRYhe2Xv2vbQBTHP1JkoYg0LqZpyRI8OVAobQgtxIVMzl8QKF0KHbKV7u1f0O5ZMxQKHQr5C6wpUAcS0h9LoJ5ClsYQQt0YVZEVqUPuHNnY8klVSIc+eJxOOt33o3fvJD0tiiIAVlZWDEAHTNEa5GsBEAI+ENbr9QBAi6JIipuAJdwUAHpO4qEA8AFPuF+v1wOtVqtJcRuYFq3F1UTAA1zgl2h9+ZSWEL/tVJvbOQv3Wa1RWRKHIRDEQ2871eb2zXKZgm1jWNbISY6Pjuj6PmgaRBFGocDM7GyicOB5dF0Xh+Z2rVG5h1gGncvEs4Dx4q0WXd9n58l7ghc7fH76gaDb5bjVSgQwLIuCbcuuzDNdZrv0RHGAwPfZWt3g4Z27TGg6CzPzbK1uEPh+4n0Dc/c0ZZanyvYHt+YT+4qmpxaW9vX4e2I/NUUaM0yT5c01dlv7nEchu619ljfXMEwzE4DSXu+025y2233nHn181tfvnp3x4/AQgBvFIlPFYn4Ap+02rxaf86b6cuzY14113u69UwZQXgIV8TTjUgNI09YXU53PHWCYnUdh5nvz+tpdL8CEln2aa4+A8jdfJcmyJKISwOzcXO9YvmzGjVO1v1qCrFsvN4A87D/APwOQ/V2a3UIJEMScwPOuTDE2d0/T4LJc8gC6rgsk/5zGt5/qVpS/5cI8oRkaMXG31qgsOQwvTG6Wy0yWSkovm98nJ/w8OBh6TRQmroSQEfC4KJcQRUO8NNMBHJqfACZLJSXxWqPyWJyS+TVYmnlAqFKc9v7hnWpzT0ZijPgi/bk1ujgdU57LNl6+fRkGERNfiId4AGB4eZ5kAswCpoTbTrX5LQ4RE78vxDvCPSk0ysYCjICYkpEA4k/eIYW4MsAQiGkBsQfINe9wkVzK4qkABiBs4bIc8rkIvZtGPDVADEImpdyqcov5acQB/gCu5k4J7bDjxgAAAABJRU5ErkJggg==);\
			}\
			.glympse-member.stale {\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAlCAYAAAAjt+tHAAACwklEQVRYhe2XwWvTUBzHPwlbloXZzB2EMSj1oBdxosJwyHCHFHby2mv/Bv+C/QX+Dbvu5nHSHpQpk8EmCl704CgIq4d10dKlbyXx0Pe6dLTpS8yYB3/weH1p8r6f/N7vJfkaURQBUC6XpwATsGQ/Rb7RA0JAAGGtVusBGFEUKXELsGWzJICZk3goAQQQyCZqtVrP8DxPiTtAQfY2V5OBAOgAv2Qv1F3aUvxWtVLfy1l4KLa2vVX5MwR68dQ71Up9r1RawnFmse2ZsZMcHx8jhMAwDKIoYnp6msXFxUThIOjS6ZxRrdT3tra9+8hlMLkoPBuYKN5sNhFC8OTZG8rPW6yuv+P8/Jxms5kIYNszOM7sYCg1TVXtqiWKAwghWFnbwb35CMMwKcwvs7K2gxAi8bpLcw80VZWnqvYb7nLiWDPM1MIqfvufE8epKdKEZVns727gtw6JohC/dcj+7gaWZWUC0Nrrvu/j+/7QsQ9v14fG3W6XRqMBgOu6uK6bL8DtOy+4e29z4rlfv2zy/dtLbQDtJdART3NeagAVr18VUh3PHWBURFGY+dq83nbXC2AY2ae59gxov/N1iixLIWoBFIvFwW/1sJl0nm781RJk3Xq5AeQR/wH+GYDsz9LsESqAXqwRBN0rU4zNPdCc4sIuBQCdzhmQ/HEa3366W1F9lquh1AwNz/MsYA6YJ8GYlEpLLCzMa4mdnJxydPRj5H/SmPwEToG2ykBA3y4hTUPcmpkA1Ur9PTARQolvbXtP5SFVX5etWQCEOuZ08A1frdQPkjIRE3/McG2NN6cT7Lnq4/bt4yiImPhDeZdqneMAo+15Ukgwm36dzEmIT3GImPgDKd6WLVBC42IiwBiIOZUJIH7nbVKIawOMgChIiANArXmbfnFpi6cCuAThyKbskKCf+k4a8dQAMQhVlGqrqi0m0ogD/AEEYk7Q5FLZYgAAAABJRU5ErkJggg==);\
			}\
			.glympse-member.old {\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAlCAYAAAAjt+tHAAACsElEQVRYhe2XwUrcQBjHfwkahkU20kPBw4r00pOW2oO03iRS9iX2HXwC8Ql8B19iDxs8CK14cEvx1EspenELFiPLMo5L0sPOrLOym52kkfbQD4bJJJP5/+abb5L5vCzLANjd3V0AfCDQ9QLV2hBIAQWknU5nCOBlWWbEA0DoEmgAvyLxVAMoQOqiOp3O0IuiyIjXgLquBc/jAQkMgDtdKzNLocVftuL4tGLhCTuKovf6MgWGtutrrTg+XWs0qAmBEGLmINfX1yil8DyPLMtYXFxkZWUlV1hKyUBKWnF8ehRF6+hl8HkMPAHMFe/1eiil+HB8zMebG7ZPTnh4eKDX6+UCCCGoPY5r4sw30W5KrjiAUoqtdptwcxPP96lvbLDVbqOUyn3vydhjTRPlhaK9vr6e23Y0v7CwsbuLi9x2YYoiFgQBZ80mSbdLlqYk3S5nzSZBEJQCcNrrSZKQJMnEvc87OxPt+/t7Li8vAQjDkDAMqwV4tbfH6/39uX2/HRzw/fDQGcB5CVzEi/QrDGCsvbxc6H7lANMsS9PS71b1t/u7AJ5ffpi/7gHnf75LkJUJRCeA1dXV8bX52Mzr52p/tARlt15lAFXYf4B/BqD8t7S8pQZgaBWklM+maI091lzgMV2SAAPdKe9wam8/161ojuWmqTVTL4qiAFgClslJTNYaDV44iv26veXH1dXUZzox+QncAn3jAckoXUInDXZq5gO04vgTMBfCiB9F0ba+ZeLraWomgdQlOR2f4VtxfJ7nCUv8HZOxNTs5nZOem9pO375Mg7DE3+pZmnW2Aaan53mmwQSjOFnSEF9tCEv8jRbv6yKN0CybCzADYsl4ArBn3qeAuDPAFIi6hjgHzJr3GQWXs3ghgCcQNV1MOqQYuX5QRLwwgAVhgtJsVbPFVBFxgN/Hk0w40iIfvwAAAABJRU5ErkJggg==);\
			}\
			.glympse-member.expired {\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAlCAYAAAAjt+tHAAACwUlEQVRYhe2XMW/TQBiGH1utZVlVgzogdakyMLRVSoRQB8Sa/gEGVIaqA0KsMPArGGBFiKHqQAWCgTUz6hBVkGKJslWdGoaKoMhyLtGZIXfppUqcs3FVBj7pdDnHvvfxd9/Zfp0kSQDY2NiYAVzAU/0MxUYfkIAAZL1e7wM4SZJocQ/wVfMUgFuQuFQAAohVE/V6ve/UajUtHgDzqve5nAzEQAT8Vr3Qd+kr8eths7FfsPBIVKrrd9RPCfTN1Adhs7FfLpcJggDf9ydOcnp6ihACx3FIkoTZ2VkWFxdTheM4JooiwmZjv1JdX0Mtg8t54fnAVPFWq4UQgrfvPvL12w/ef/hEr9ej1WqlAvi+TxAEw6HSdHW165YqDiCEYGd3j0rlJq7rsryyys7uHkKI1OsuzD3U1FWeqdqXl1dSx5bhZhbWcXT0PXWcmSJLeJ7H9tYmYXiIlJIwPGR7axPP83IBWO31drtNu90eOfbg/r2Rcbfb5eTkBIBSqUSpVCoW4OGjxzx5+mzquS9fPOfN61fWANZLYCOe5bzMADrWVm9kOl44wLiQUua+tqi33dUCuG7+aa48A9bvfJsiy1OIVgBLS0vD3/phM+082/irJci79QoDKCL+A/wzAPmfpflDaoC+0Yjj+NIUjbmHmjOc26UYIIoiIP3j1Nx+tltRf5brodKUTq1W84A54BopxqRcLrOwsGAldnZ2xvHx8dj/lDH5CfwCOjoDMQO7hDINpjVzAcJm4zMwFUKLV6rrd9UhXV8XrVkMSBtzOvyGD5uNg7RMGOK3Ga2tyeZ0ij3XvWnfvoyDMMRvqbvU62wCjLfnaaHAfAZ1MqcgmiaEIV5V4h3VYi00KaYCTICY05kAzDvvkEHcGmAMxLyCOAD0mncYFJe1eCaACxCBatoOCQapj7KIZwYwIHRR6q2qt5jIIg7wBwUoSrpPdLIPAAAAAElFTkSuQmCC);\
			}\
			.glympse-member.selected .glympse-member-name { box-shadow: 1px 1px 2px #FF00FF; border-width: 2px; margin: 40 -17px 0; }\
			.glympse-member-name {\
				background-color: #FFFFFF;\
				border-radius: 3px;\
				color: #333333;\
				margin: 40px -15px 0;\
				text-align: center;\
				text-shadow: 1px 1px 1px #AAAAAA;\
				text-overflow: ellipsis;\
				overflow: hidden;\
				white-space: nowrap;\
			}\
			.fresh .glympse-member-name {\
				border: 1px solid #008000;\
			}\
			.stale .glympse-member-name {\
				border: 1px solid #D6CD2B;\
			}\
			.old .glympse-member-name {\
				border: 1px solid #D42D2D;\
			}\
			.expired .glympse-member-name {\
				border: 1px solid #4A4741;\
			}\
			.glympse-popup { max-width: 200px; }\
			.glympse-popup h2 {\
			 text-align: center;\
			}\
			.glympse-popup .glympse-avatar {\
				width: 100px;\
				height: 100px;\
				display:block;\
				margin: 0 auto;\
				border: 1px solid #FFCE00;\
				padding: 3px;\
			}\
			.glympse-popup em.glympse-message {\
				font-style: italic;\
				color: inherit;\
			}\
			.glympse-popup a.glympse-destination {\
				color: #FFFFFF;\
				text-decoration: underline;\
			}\
			.glympse-popup-row.text-center { text-align: center; }\
			.glympse-viewer-button {\
				background-color: #FFFFFF;\
				border-radius: 5px;\
				box-shadow: 0 1px 5px rgba(0, 0, 0, 0.65);\
				min-height: 26px;\
				min-width: 26px;\
				cursor: pointer;\
			}\
			.leaflet-glympse-viewer a.viewer-button {\
				background-repeat: no-repeat;\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABigAAAYoBM5cwWAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAN7SURBVDiNrZVdaFtlGMd/z0maNEmXps5+KHNrzxpzMweTjHYUtbKxKtILHe1FS+tNRYcg6xhsKIIXflxsVkWEIU6ccxsWHCibUOfm1G5SFix+xFEtYVbrFPdRs3Vpm3Pex4s0p00rXogvvHB43+f8zvP5P6KqLF0inb6wXdZmIUlFkiKaBFCVlKApg6ZuZvJDqoPusneXAqN2T8KIHhShadmXFi1VRiyVR7OZQ2OLz60Fr0Qq4t39auloERYoD1FTb3NncwuNG5upuu12xLJAhI3tDzeppaMV8e5+EZEix198iDR27RCVAYCyYJD1mx8gsekeLJ+vxDM3n+f6lcvEauu4MHwmND11bSDS2AXwihdy1O5JqKWjQKii6ha2Pv4U4Wjlv0UMwOjQcdKfnwLIiZEN2cyhMb9Ipy9iBw4KhPyBIK09fYSjleSyfzGR/pbpqSly17NEYjFq7Tg19TY+fyGw+vV3F4GhQt47W/xhu6ytmLN1rVsoKy/ns3ff4rcfL6DGlHiU/uI07Tv2EAyFuTQ+xuTYD96dCE1hu6zNbyHJ4kmsto7TB95gQ6KOySUwgEAoxNnB97g6+Qv/1G4WkvQrkhSUQLCc5qqrHD31Ij9PXqH5oadLjCujYWpWrkB1ltjqahRQY/j10jXyTqEdFUn6i027IuTjyd7NGDWcOJkqgcUb6hg6sgfHdXCc0j03l6e1Yy+OaxDRpNeHM7N5HNfFdRxyM3MlwKrKCMa4GGMwxqBGvS1AJBz0bP2qkhLR9umbs+Rys5QHA2y97y727T/uGZ3/JkPHE69jr65GVfH5LHb2bQEUo0r2xkwhZJWUJagX35lzaRzHoeGOW1mXWOUBVZXR7y7ywYnzHPs4xe9/TGGJYIzh6+8vegUSNGWZRcDnX/twPjd53n75MeINtcsquXZNDfue7cQ1LsY17N3/iXdn0JRAhy9iB84We7F3Wwu7tj/oGX2VGufT4TSRcJDeRzYRiQRwXYPrurwzOMyB98/NR8HIdGauZdnoiQh9Xfeyved+UFAKyTdaKIhxDa5xOXxshDePfokxCotGz5Ovinh3f1EcANasWslLu7extr56HqgYY8hM/MlzAx+Rmbi8kGPRnTd+OrwgDlCQr3nFeQEIFY0tS4hFw4jAVDaH65ZMUE5Fn5keP/KqzoP+d4FdBix4+99/AX8DNhvIBWYvttEAAAAASUVORK5CYII=);\
			}\
			.leaflet-glympse-viewer:hover a.viewer-button {\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABigAAAYoBM5cwWAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAN4SURBVDiNrZVtaJVlGMd/17Ozc3Ze9tJ0s2Ie3ZljGhoIJ6YYriBaEvYhmR82plQm2qcmkVEEEYUftJX4IQuKYmglJBUqWesFcprt4IocaBuHtWY6etHNHc+289z31YdzzrOdHehDdMMND899Pf/7+v+v/3U9oqosXCJbS0Kx0lYHiSsSF9E4gKokBE1YNHErmTmteswUfbsQsCLW2WRF3xehueimeUuV847K9slkz+X57525rEQijR1d6uhAHqyyzGV9dIIn4lfoXHuV1Uum8DmKAPseGm5WRwcijR1dIiJ5HF/+Ibyi/WlR6QaI+A3Ptoyws3mMUqeQwbTrkPw7yKraFG9+Xxf8baKsO7yiHeB1j3JFrLNJHR0AgtGqaU49NsAd5TP/xhiAl7+KcbAvCpAWK2snkz2XBdpKwjF/nwjNYb/h88cvcFdtims3A5y4tJixiTLGb/q5s3KGjcuvsy46QcBnAbg4HqHlrbinaSo5u8EXipW25jXruneU8oCh/cM19A5VY1QKMjrUt5RzT/VTFczwTbKa3qFq70yE5lCstNXnIHEAAVbVpNjccw8NK+/G/DJYRLEq6LLrk5X8+Hs5dsFlAA4S9ykSF5TyMsOl2r388PUj/HrlL9Y9/HxBcGVFiOpFFUyqUh9VFFBrGbt6nYybtaMicV/etKXBSnZu34RVy8kvEwVgjfW3c/roc7jGxXUL9+xshvva9uMai4jGPR9Oz2RwjcG4Lunp2QLA2yrDWGuw1mKtRa16W4BwKODF+lQlIaKbU7dmSKdnKAv4ebBlDQcOn/CC+n9K0rbrELFoDapKSYnDnh0PAIpVZXJqOldpSTiCevy+PTuI67rUL13M6qY6D1BVGfh5hI9P9nP8VIJr4zdwRLDWcuHiCPn2FTTh2HmArxz8NKdNhndfe5LG+iVFlWxYVsuBF7dirMEay/7DX3hnFk0UGBtg25YNPLN7kxd0LjFM75lBwqEA2x5dTzjsxxiLMYb3jp3hnY/O5lhkjV3UeiLCjvaN7O68HxSUrPhWswWxxmKs4cjx87z9wXdYqzC/9fL8I40dXfnhALCsbhH79m6hYXlNDlCx1pIc/YOXuj8jOfrnnMaie6aGjswNB8iOr9zEeRUI5oMdR6iqCCECNybTGGPnS5pW0RdSw0ff0BzQ/z5giwCz2f73X8A/p73Upg67GLcAAAAASUVORK5CYII=);\
			}\
			.leaflet-retina .leaflet-glympse-viewer a.viewer-button {\
				background-size: 20px 20px;\
				background-repeat: no-repeat;\
				background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADEwAAAxMBPWaDxwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAnKSURBVFiFrZlpkBXVFcd/575+jzcM46AwrCqMsigiuITBiUmJRsVtLNxSWhUSNCpaMRqX5ItVLtEPMS6lQulgZbGCBkqLGMUYYzSTuDCCQYVYxAVEkGVYBQZGmNf3nHzo5fWbN6BS6Vf3dd+eft2/+z/LPbdHzIyD2U4//e5gXZ/6CQ6a1XQU5sepMdFMQXWZGSsMvxLv2xtzLG9ruzM8mOfINwEUQY45/7FmTG8w7AozAzPMDDMF0+hYFbO4lY/nee9nb2i/t92Mr/3Qrw04vqW1yYvNF6PRKINBAmS9QZWP4716Xe2kdPnni+5b8n8BHH3erIZCvs9CYHJ0JgOWKrcf1ar2PttfrN1dLRvffXTLQQOOv6i1CXVvIRIgQhmQsjm/QrFo79N+w4A6fFhiy9admGloGp668Z2H9qvmfgGPm/bETJBWEUFEAAGByLoGpuQLjtqagMED+9F41BCOP/5oisUC69dtpqNjK1u27OTztR2s+WwT3WGIqXLbLZfxyYcreW7hYtR7TD2idt2GpQ/O+dqAx13YOhPnWkUcURPKCsKA/kVmTJ/CoCEDUIsUtUjc8o3j8YiAE2HRW++y6pP1XH3NhXgfMmP6HahJWWHT6zYtfbgKsgpwbEtrU+BksYhDXAzoHIijkHe0TB3PpMnj8GqoUQa0Cr4U0MWAzkFOhJyDnBNuu/nXdGzaWeGfTnXyxvcfXbJfwNHnzWoouGADORdEcLkU8uQTR3DpRc2YgFcqADUGrLhxql41YOCE1155k6eeehnV2E/VY2iYg2HZwHHZmwYiC00Ieso8dlQDl13ybRQoeatuYbTvDpXuUKPjHteE3gjVCBVKakw581REeozKCEKvCyuYUohzZjVJTiYnhhKLvg6pC7hqxpnRzeOHJAruC0PWrlrLmk/XsnnjZsyM/gMOZeSoRkaMHkkhCGIFidUmdYcgJxx55CA+W725Z9aePHD89U1bP3h8SQoogow5R+dDLh6JYRiFguPWGy+MRx61L77o5Ll5z/PB8o8wV0OhWEsuyEOarDex6PXllEp76VfMcda0szjplJMjuIwDiMC550/hsUfmxWqUZTSR+SJytJlZAHDM2Q81K7nGdHgYJsa1M86gUFMk9MaiN5bytxdfZ093jkKxjrpBY+JcWJ37xAXk8kVC8yxd/CETJp2EuThHxdtH//2Etr+/iVqIpMIkV1jjYeOvaQYWBQAl4QZnFo3EDFCKgWNk4zC279jNPbc/QLfVUlM3kGIgRFNdkpyt3Oi5h3MumUrJG127u2j/x79YvvR9tmzYissXcLkCLpePBhZ/kjGY5wZgkUyZclewLl9bEnGQpBVxHD9uMBMnHsWcx56ldsBwcq5APnCUQiUtEuJ5mP3Mw31rCvTtJ6z/9DO6SxAEBVwumpS873X6q+h/MWh4Pljn+k6wWD2JzYsoY0cP4/FZzzBsRCNnTBrJTdObGDTwEMacfT99aut7VDFWraYZnZ172LXTExQPwxXKU56axvZM5LIe/eirftOaCYGXUrNYEIWYUwDyuYDnF7zC3IdnMHniiDiPOZatWENSvaRFQwWcAlHZhVk8A7l0EBjlMO4FqtJFwJDmQExGgUbQ6sAp9UXhpbm3IM5F0juHqvL0c28T5GsyqiVVTWJ2pb42T8tpozhi6CF4VVSjv6t6VKNrVKO+D43XFn3Eeys2RARJDCXwyqhAvR8nLoekkMKYkYeiZjg1zIGqIiIs+c96RAqY+vg+lQXr1FNHcs+N34sBkmY9+lHz8f6c08awq/NLps38bWzZstkFHecgKtOzBWexmMfSkZcfsmNPCU1KJ/UVAeEwfvbD5nhuThpVfpm0rKn79S1w1PBDIInlOAOoMtGl0ZeU7KqoD6vgVJVC3lXWfpnoy+eFw+prMLUekBm/OsDnhGOHRUHawzedeV1mGlfE8cO2bNsdgxlqUdSpKqOOHJhCqVamhL37Svzpr/+O+wlkdWSXla1sm7btLqtXdptlztAVFYqYsn1HVwVY0k48dgioJ1shJ5DqPffN+SdzFyzqARk3PbCpt23vpBzOsYrYigCxlZhiCFhUmHZs242q4kSwuKIWYOp3x9I6fymSCyqiLYnmkvThwd+/xQNPvEqxT/ma8iLO+N390xk6qL5HgBmfd+yIk3cGHlY6H2p71rxmypf7PB98uK4q8oYP7s93Thy2nxkgakGhSNC3PyVXS0lq6JYauinSbX0YPnwIwwbXV6n4xa4utu/aW5UfFWt3G4qF5T2dXtXz5IIlvaaHX/3iAmqKUg1nlaBk7okZTuCun56ZZgezsgv88bklOJfLuFl0vuvwdcudtd0Zmtm8ChVVeWPp53y5txSB+TKgE7j/1rMpBIKZj4KlJ2QKGgVfTuCR21s4fGh9xh/LkC+8+kEa6cQJH5hnbW1hVFGrza5MGx41xx0PvVSVWFWVE44dzsu/+RETxjb0auYs6JCGWubcezHjxgyOA0crgufxp16n5MvTY3JeYDbEaxIRZMikn68SpDFZvUXLTWXOL6dx3Ojh6aozWXsmq7j291bzYtuHfLxmG5u3dqJe6VuTZ/CAWq685Fs0nzgCzUa1RoCqSsfmHUy/6UlUXKUlhNV7Vj59tJlZumgaOumWJnCLYzogitxAPH+ecxX96/tStaXLzcwMUDF7aGrSLJypsrc75NKZc9i9N6yqjJza5J2fPr0kVTDZBp9889siMjnVKlazXw08M+tK6voVewG0TCVChZk0C5qB7A49M255kg1bdlfBicniXavmnpI8omJV58y3RK8jIrk1nm87uzwX/PgxPv60o9fI3l+z9NhiMysdW3dxybWtbNxchkv8D7HQ3L6WLFPVwn3oCTc2eWFx4nRC+Y2CqGfa1GO5ccYZuFjdAynYU8k/LGhn7oIl+NQVytU5UGHa/QICNEz4yUyca624MAY1M5yU+P65J/CDi0+hX22hd8DYJ/fuLfHsX5Yy74V32NMVlt/vUAkHcl3nyrlf/eojC2nQmhGwAjcqtzyH9ssz+qhBDGmo44ihh5HLCWvXb2fjlp2sWrOVTdt2A5KCZKvwzP16hTsgIMDA8dc3meMtrPptQ7RZpKwY6jVd0yhgajgncfpIFlnZShwQC53n1J5m/dqAAHWjr2rIF/ILkfgFpqVfKaQl59KotorzvakmJovN7Wvp/OSZg3+Bmd3qx1/d5DzzERozbJSTtpH2UsWoWLsAmLA65+3yA6l2UIAAIiJ1x1zZ7OAGjCuyM0pSgZRhM6aMfj1PYHbnqqfa7Rs89BsBVvzw9LuD+nVrJngXNmOMwmwcxkQzEGfLUFbgWKlIe9fh65ZbW9tB/Rvif7u/zea0zCraAAAAAElFTkSuQmCC);\
			}\
			.leaflet-glympse-viewer:hover a.viewer-button {\
				background-image: url(data:image/png;base64,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);\
			}\
			.glympse-view-member-name, .glympse-last-updated, .glympse-expiry-time { display: inline-block; font-size: 1em; width: 32%; }\
			.glympse-view-member-name a { color: #FFCE00; text-decoration: underline; } \
			.glympse-members-list .col-title.text-right, .glympse-last-updated { text-align: right; }\
			.glympse-members-list .col-title.text-center, .glympse-expiry-time { text-align: center; }\
			.glympse-members-list .row { margin: 2px 0; padding: 2px; line-height: normal; }\
			.glympse-members-list .row:nth-child(even) { background-color: rgba(0,0,0,0.4); }\
			.glympse-members-list .col-title { width: 32%; display: inline-block; font-weight: bold;} \
			.glympse-members-list .header-row { margin: 2px 0; padding-bottom: 2px; border-bottom: 1px solid #FFFFFF; }\
			.glympseOptions .glympse-status { margin: 15px 0; }\
			.glympseOptions .glympse-status-input { margin-left: 5px; width: 70px; }\
			.glympseOptions #glympseId { margin-left: 5px; }\
			.glympseOptions .stopHeartbeat { margin-left: 5px; border: 1px solid #FFCE00; }\
			#glympseMemberListDialog.mobile,#glympseDialog.mobile {background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; z-index: 9000 !important; }\
			#glympseMemberListDialog.mobile { background-color: #184156; }\
			#glympseMemberListDialog.mobile .closeBtnContainer { width: 100%; text-align: center; }\
			#glympseMemberListDialog.mobile .closeGlympseMembersBtn { margin-top: 20px; }";
		$('<style>') .prop('type', 'text/css') .html(cssData).appendTo('head');
	}

	var setup = function () {
		window.addHook('iitcLoaded', window.plugin.glympseViewer.init);
	}
	// PLUGIN END //////////////////////////////////////////////////////////

	// PLUGIN END //////////////////////////////////////////////////////////

	setup.info = plugin_info;
	// add the script info data to the function as a property
	if (!window.bootPlugins) window.bootPlugins = [
	];
	window.bootPlugins.push(setup);
	// if IITC has already booted, immediately run the 'setup' function
	if (window.iitcLoaded && typeof setup === 'function') setup();
}
// wrapper end
// inject code into site context

var script = document.createElement('script');
var info = {
};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = {
	version: GM_info.script.version,
	name: GM_info.script.name,
	description: GM_info.script.description
};
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement) .appendChild(script);
