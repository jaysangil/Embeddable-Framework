var contactSearchCallback;
var callLogCallbacks = {};

if (typeof window !== 'undefined') {
    window.Framework = {
        config: {
            name: "FRAMEWORK_NAME",
            clientIds: {
                'usw2.pure.cloud': 'CLIENT_ID',
                'mypurecloud.com': '',
                'mypurecloud.ie': '',
                'mypurecloud.com.au': '',
                'mypurecloud.jp': '',
                'mypurecloud.de': ''
            },
            customInteractionAttributes: ['PT_URLPop', 'PT_SearchValue', 'PT_TransferContext','CallerPhoneNumber','CalledNumber'],
            settings: {
                embedWebRTCByDefault: true,
                hideWebRTCPopUpOption: false,
                enableCallLogs: true,
                enableTransferContext: true,
                dedicatedLoginWindow: true,
                embeddedInteractionWindow: true,
                hideCallLogSubject: true,
                hideCallLogContact: false,
                hideCallLogRelation: false,
                enableCallHistory: true,
                searchTargets: ['people', 'queues'],
                callControls: ["pickup", "transfer", "mute", "disconnect", "requestAfterCallWork"],
                theme: {
                    primary: '#fc4100',
                    text: '#123'
                },
                display: {
                    interactionDetails: {
                        message: [
                            "participant.name",
                            "framework.CallTimeElapsed",
                            "call.State",
                            "call.ConversationId"
                        ],
                        call: [
                            "participant.name",
                            "framework.CallTimeElapsed",
                            "call.State",
                            "call.ConversationId"                          
                        ]
                    }
                }
            }
        },

        initialSetup: function () {
            window.PureCloud.subscribe([
                {
                    type: 'Interaction',
                    callback: function (category, interaction) {
                        window.parent.postMessage(JSON.stringify({ 
                            type: "interactionSubscription", 
                            data: { category: category, interaction: interaction } 
                        }), "*");
                    }
                },
                {
                    type: 'UserAction',
                    callback: function (category, data) {
                        window.parent.postMessage(JSON.stringify({ 
                            type: "userActionSubscription", 
                            data: { category: category, data: data } 
                        }), "*");
                    }
                },
                {
                    type: 'Notification',
                    callback: function (category, data) {
                        window.parent.postMessage(JSON.stringify({ 
                            type: "notificationSubscription", 
                            data: { category: category, data: data } 
                        }), "*");
                    }
                }
            ]);

            window.addEventListener("message", function (event) {
                try {
                    var message = JSON.parse(event.data);
                    if (message) {
                        if (message.type == "clickToDial") {
                            window.PureCloud.clickToDial(message.data);
                        } else if (message.type == "addAssociation") {
                            window.PureCloud.addAssociation(message.data);
                        } else if (message.type == "addAttribute") {
                            window.PureCloud.addCustomAttributes(message.data);
                        } else if (message.type == "addTransferContext") {
                            window.PureCloud.addTransferContext(message.data);
                        } else if (message.type == "sendContactSearch") {
                            if (contactSearchCallback) {
                                contactSearchCallback(message.data);
                            }
                        } else if (message.type == "updateUserStatus") {
                            window.PureCloud.User.updateStatus(message.data);
                        } else if (message.type == "updateInteractionState") {
                            window.PureCloud.Interaction.updateState(message.data);
                        } else if (message.type == "setView") {
                            window.PureCloud.User.setView(message.data);
                        } else if (message.type == "updateAudioConfiguration") {
                            window.PureCloud.User.Notification.setAudioConfiguration(message.data);
                        } else if (message.type == "sendCustomNotification") {
                            window.PureCloud.User.Notification.notifyUser(message.data);
                        } else if (message.type == "processCallLogResponse") {
                            // Handle response from parent window for processCallLog
                            var callback = callLogCallbacks[message.data.requestId];
                            if (callback) {
                                if (message.data.success) {
                                    callback.onSuccess({ 
                                        id: message.data.id 
                                    });
                                } else {
                                    callback.onFailure(message.data.error || 'Failed to process call log');
                                }
                                // Clean up the callback after use
                                delete callLogCallbacks[message.data.requestId];
                            }
                        }
                    }
                } catch {
                    //ignore if you can not parse the payload into JSON
                }
            });
        },

        screenPop: function (searchString, interaction) {
            window.parent.postMessage(JSON.stringify({ 
                type: "screenPop", 
                data: { 
                    searchString: searchString, 
                    interactionId: interaction 
                } 
            }), "*");
        },

        processCallLog: function (callLog, interaction, eventName, onSuccess, onFailure) {
            // Generate unique request ID to track this specific call log request
            var requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Store callbacks for when parent window responds
            callLogCallbacks[requestId] = { 
                onSuccess: onSuccess, 
                onFailure: onFailure,
                timestamp: Date.now()
            };
            
            // Send request to parent window
            window.parent.postMessage(JSON.stringify({ 
                type: "processCallLog", 
                data: { 
                    requestId: requestId,
                    callLog: callLog, 
                    interactionId: interaction, 
                    eventName: eventName 
                } 
            }), "*");
            
            // Set timeout to prevent memory leaks if parent never responds
            setTimeout(function() {
                if (callLogCallbacks[requestId]) {
                    console.warn('processCallLog timeout for requestId:', requestId);
                    callLogCallbacks[requestId].onFailure('Timeout waiting for response');
                    delete callLogCallbacks[requestId];
                }
            }, 30000); // 30 second timeout
        },

        openCallLog: function (callLog, interaction) {
            window.parent.postMessage(JSON.stringify({ 
                type: "openCallLog", 
                data: { 
                    callLog: callLog, 
                    interaction: interaction 
                } 
            }), "*");
        },

        contactSearch: function (searchString, onSuccess, onFailure) {
            contactSearchCallback = onSuccess;
            window.parent.postMessage(JSON.stringify({ 
                type: "contactSearch", 
                data: { 
                    searchString: searchString 
                } 
            }), "*");
        }
    };
}