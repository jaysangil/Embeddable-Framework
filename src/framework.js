var contactSearchCallback;

if (typeof window !== 'undefined') {
    window.Framework = {
        config: {
            name: "tsangildev",
            clientIds: {
                'usw2.pure.cloud': 'fda6b5d8-92ed-4087-9ac2-29a6f7b548aa',
                'mypurecloud.com': '',
                'mypurecloud.ie': '',
                'mypurecloud.com.au': '',
                'mypurecloud.jp': '',
                'mypurecloud.de': ''
            },
            customInteractionAttributes: ['PT_URLPop', 'PT_SearchValue', 'PT_TransferContext'],
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
                callControls: ["pickup", "transfer", "mute", "disconnect", "requestAfterCallWork"], // Added missing comma here
                theme: {
                    primary: '#fc4100',
                    text: '#123'
                }
            }
        },

        initialSetup: function () {
            window.PureCloud.subscribe([
                {
                    type: 'Interaction',
                    callback: function (category, interaction) {
                        window.parent.postMessage(JSON.stringify({ type: "interactionSubscription", data: { category: category, interaction: interaction } }), "*");
                    }
                },
                {
                    type: 'UserAction',
                    callback: function (category, data) {
                        window.parent.postMessage(JSON.stringify({ type: "userActionSubscription", data: { category: category, data: data } }), "*");
                    }
                },
                {
                    type: 'Notification',
                    callback: function (category, data) {
                        window.parent.postMessage(JSON.stringify({ type: "notificationSubscription", data: { category: category, data: data } }), "*");
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
                        }
                    }
                } catch {
                    //ignore if you can not parse the payload into JSON
                }
            });
        },
        screenPop: function (searchString, interaction) {
            window.parent.postMessage(JSON.stringify({ type: "screenPop", data: { searchString: searchString, interactionId: interaction } }), "*");
        },
        processCallLog: function (callLog, interaction, eventName, onSuccess, onFailure) {
            window.parent.postMessage(JSON.stringify({ type: "processCallLog", data: { callLog: callLog, interactionId: interaction, eventName: eventName } }), "*");
            var success = true;
            if (success) {
                onSuccess({
                    id: callLog.id || Date.now()
                });
            } else {
                onFailure();
            }
        },
        openCallLog: function (callLog, interaction) {
            window.parent.postMessage(JSON.stringify({ type: "openCallLog", data: { callLog: callLog, interaction: interaction } }), "*");
        },
        contactSearch: function (searchString, onSuccess, onFailure) {
            contactSearchCallback = onSuccess;
            window.parent.postMessage(JSON.stringify({ type: "contactSearch", data: { searchString: searchString } }), "*");
        }
    };
}
